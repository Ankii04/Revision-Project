import type { RecallRating, RevisionCard } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ratingToQuality } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SM2Result {
  newInterval: number;
  newEaseFactor: number;
  newRepetition: number;
  newDueDate: Date;
}

export interface ReviewResult {
  updatedCard: RevisionCard;
  logEntry: {
    id: string;
    rating: RecallRating;
    reviewedAt: Date;
  };
  streakUpdated: boolean;
  currentStreak: number;
}

// ─── SM-2 Algorithm ────────────────────────────────────────────────────────

/**
 * Implements the SM-2 spaced repetition algorithm.
 * Reference: https://www.supermemo.com/en/blog/application-of-a-computer-to-implement-the-optimal-spaced-repetition-learning-process
 *
 * Quality grades:
 *   0 = AGAIN (complete blackout)
 *   3 = HARD  (recalled with serious difficulty)
 *   4 = GOOD  (recalled with minor hesitation)
 *   5 = EASY  (perfect recall)
 */
export function calculateSM2(
  card: Pick<RevisionCard, "easeFactor" | "interval" | "repetition">,
  rating: RecallRating
): SM2Result {
  const quality = ratingToQuality(rating);

  let { easeFactor, interval, repetition } = card;

  if (quality < 3) {
    // Failed review — reset to beginning
    repetition = 0;
    interval = 1;
  } else {
    // Successful review — calculate next interval
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Clamp ease factor to minimum of 1.3 (SM-2 spec)
  easeFactor = Math.max(1.3, easeFactor);

  // Calculate the next due date
  const newDueDate = new Date();
  newDueDate.setDate(newDueDate.getDate() + interval);
  // Set to start of day to avoid time-of-day drift
  newDueDate.setHours(0, 0, 0, 0);

  return { newInterval: interval, newEaseFactor: easeFactor, newRepetition: repetition, newDueDate };
}

// ─── Revision Queue ────────────────────────────────────────────────────────

/**
 * Returns all revision cards due today (dueDate <= now) for the user,
 * including full problem data and AI notes summary needed for the flashcard UI.
 */
export async function getRevisionQueue(
  userId: string,
  limit = 50,
  includeNew = true
) {
  const now = new Date();

  return prisma.revisionCard.findMany({
    where: {
      userId,
      dueDate: { lte: now },
      ...(includeNew ? {} : { repetition: { gt: 0 } }),
    },
    take: limit,
    orderBy: { dueDate: "asc" },
    include: {
      problem: {
        select: {
          id: true,
          title: true,
          difficulty: true,
          tags: true,
          platform: true,
          platformUrl: true,
          language: true,
          solutionCode: true,
        },
      },
    },
  });
}

/**
 * Processes a user's review of a revision card:
 * 1. Runs SM-2 to compute new schedule
 * 2. Updates the revision card
 * 3. Writes an immutable revision log entry
 * 4. Updates daily stats and streak record
 * All done in a single transaction.
 */
export async function submitReview(
  userId: string,
  revisionCardId: string,
  rating: RecallRating
): Promise<ReviewResult> {
  // Fetch the current card state and verify ownership
  const card = await prisma.revisionCard.findFirst({
    where: { id: revisionCardId, userId },
  });

  if (!card) {
    throw new Error("Revision card not found or does not belong to this user.");
  }

  const sm2Result = calculateSM2(card, rating);

  // All writes in a single transaction for atomicity
  const { updatedCard, logEntry } = await prisma.$transaction(async (tx) => {
    // Update the revision card with new SM-2 state
    const updated = await tx.revisionCard.update({
      where: { id: revisionCardId },
      data: {
        easeFactor: sm2Result.newEaseFactor,
        interval: sm2Result.newInterval,
        repetition: sm2Result.newRepetition,
        dueDate: sm2Result.newDueDate,
        lastReviewedAt: new Date(),
        totalReviews: { increment: 1 },
        // Increment the appropriate rating counter
        againCount: rating === "AGAIN" ? { increment: 1 } : undefined,
        hardCount: rating === "HARD" ? { increment: 1 } : undefined,
        goodCount: rating === "GOOD" ? { increment: 1 } : undefined,
        easyCount: rating === "EASY" ? { increment: 1 } : undefined,
      },
    });

    // Write immutable revision log
    const log = await tx.revisionLog.create({
      data: {
        userId,
        problemId: card.problemId,
        rating,
        easeFactorBefore: card.easeFactor,
        intervalBefore: card.interval,
        easeFactorAfter: sm2Result.newEaseFactor,
        intervalAfter: sm2Result.newInterval,
        nextDueDate: sm2Result.newDueDate,
      },
    });

    // Upsert daily stats — increment problemsRevised and rating counter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await tx.dailyStats.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        date: today,
        problemsRevised: 1,
        againCount: rating === "AGAIN" ? 1 : 0,
        hardCount: rating === "HARD" ? 1 : 0,
        goodCount: rating === "GOOD" ? 1 : 0,
        easyCount: rating === "EASY" ? 1 : 0,
      },
      update: {
        problemsRevised: { increment: 1 },
        againCount: rating === "AGAIN" ? { increment: 1 } : undefined,
        hardCount: rating === "HARD" ? { increment: 1 } : undefined,
        goodCount: rating === "GOOD" ? { increment: 1 } : undefined,
        easyCount: rating === "EASY" ? { increment: 1 } : undefined,
      },
    });

    return { updatedCard: updated, logEntry: log };
  });

  // Update streak (outside transaction — streak failure shouldn't block review)
  const { streakUpdated, currentStreak } = await updateStreak(userId);

  return {
    updatedCard,
    logEntry: {
      id: logEntry.id,
      rating: logEntry.rating,
      reviewedAt: logEntry.reviewedAt,
    },
    streakUpdated,
    currentStreak,
  };
}

/**
 * Updates the user's streak record.
 * A streak is maintained if the user reviewed at least one problem today
 * (or yesterday, continuing the chain).
 */
async function updateStreak(
  userId: string
): Promise<{ streakUpdated: boolean; currentStreak: number }> {
  const streakRecord = await prisma.streakRecord.findUnique({
    where: { userId },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (!streakRecord) {
    // First ever review
    const record = await prisma.streakRecord.create({
      data: { userId, currentStreak: 1, longestStreak: 1, lastActiveDate: today },
    });
    return { streakUpdated: true, currentStreak: record.currentStreak };
  }

  const lastActive = streakRecord.lastActiveDate
    ? new Date(streakRecord.lastActiveDate)
    : null;

  if (lastActive) {
    lastActive.setHours(0, 0, 0, 0);
  }

  // Already reviewed today — streak unchanged
  if (lastActive && lastActive.getTime() === today.getTime()) {
    return { streakUpdated: false, currentStreak: streakRecord.currentStreak };
  }

  let newStreak: number;

  if (lastActive && lastActive.getTime() === yesterday.getTime()) {
    // Reviewed yesterday — extend streak
    newStreak = streakRecord.currentStreak + 1;
  } else {
    // Gap in reviews — reset streak to 1
    newStreak = 1;
  }

  const updated = await prisma.streakRecord.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streakRecord.longestStreak),
      lastActiveDate: today,
    },
  });

  return { streakUpdated: true, currentStreak: updated.currentStreak };
}

/**
 * Returns full revision log history for a specific problem.
 */
export async function getRevisionHistory(userId: string, problemId: string) {
  return prisma.revisionLog.findMany({
    where: { userId, problemId },
    orderBy: { reviewedAt: "desc" },
  });
}
