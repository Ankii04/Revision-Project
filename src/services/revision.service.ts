import type { RecallRating, RevisionCard } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ratingToQuality } from "@/lib/utils";

// ─── 4-Tier Queue Constants ───────────────────────────────────────────────────

/** Maximum number of problems in a daily session */
const DAILY_QUOTA = 5;

/**
 * Max number of picks from a single topic tag before the guard kicks in
 * and forces the next pick from a different tag.
 */
const TOPIC_MAX_BEFORE_GUARD = 2;

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
  let { easeFactor, interval, repetition } = card;

  // ── Simplified confidence→interval mapping (replaces pure SM-2 schedule) ──
  //   AGAIN (0) → 1 day  (hard reset)
  //   HARD  (1) → 2 days
  //   GOOD  (3) → 7 days
  //   EASY  (5) → max(14, interval * 2) — multiplicative chain: 14→30→60→90…
  switch (rating) {
    case "AGAIN":
      repetition = 0;
      interval = 1;
      break;
    case "HARD":
      // Slight penalty to ease factor; keep repetition count advancing
      repetition = Math.max(1, repetition);
      interval = 2;
      break;
    case "GOOD":
      repetition += 1;
      interval = 7;
      break;
    case "EASY":
      repetition += 1;
      interval = Math.max(14, Math.round(interval * 2));
      break;
  }

  // Keep the SM-2 ease factor update so long-term scheduling stays adaptive
  const quality = ratingToQuality(rating);
  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  const newDueDate = new Date();
  newDueDate.setDate(newDueDate.getDate() + interval);
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
          description: true,
          aiNotes: true,
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

// ─── 4-Tier Daily Priority Queue ─────────────────────────────────────────────

export interface DailyQueueItem {
  revisionCardId: string;
  problemId: string;
  title: string;
  difficulty: string;
  platform: string;
  platformUrl: string | null;
  tags: string[];
  language: string;
  solutionCode: string;
  dueDate: Date;
  interval: number;
  easeFactor: number;
  repetition: number;
  totalReviews: number;
  /** How many calendar days overdue (negative = future) */
  daysOverdue: number;
  /** Which tier this card came from */
  tier: 1 | 2 | 3 | 4;
}

/**
 * Builds today's "Daily 5" session using the 4-tier selection algorithm:
 *
 *  Tier 1 — Overdue cards (dueDate < today), sorted most-overdue first
 *  Tier 2 — Cards due exactly today
 *  Tier 3 — Unseen cards (never reviewed; repetition === 0)
 *  Tier 4 — Early pull of upcoming cards to guarantee exactly DAILY_QUOTA picks
 *
 * Topic-diversity guard: once any single topic tag has contributed
 * TOPIC_MAX_BEFORE_GUARD picks, subsequent picks are taken from other topics
 * until the tag count drops back below the threshold.
 */
export async function getDailyPriorityQueue(
  userId: string,
  quota = DAILY_QUOTA
): Promise<DailyQueueItem[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // ── Shared include for all queries ──────────────────────────────────────
  const problemSelect = {
    id: true,
    title: true,
    difficulty: true,
    platform: true,
    platformUrl: true,
    tags: true,
    language: true,
    solutionCode: true,
    description: true,
    aiNotes: true,
  } as const;

  const cardInclude = { problem: { select: problemSelect } } as const;

  // ── Tier 1: Overdue (dueDate strictly before today) ──────────────────────
  const tier1 = await prisma.revisionCard.findMany({
    where: { userId, dueDate: { lt: today } },
    orderBy: { dueDate: "asc" }, // most overdue first
    include: cardInclude,
  });

  // ── Tier 2: Due today ────────────────────────────────────────────────────
  const tier2 = await prisma.revisionCard.findMany({
    where: { userId, dueDate: { gte: today, lt: tomorrow } },
    orderBy: { dueDate: "asc" },
    include: cardInclude,
  });

  // ── Tier 3: Unseen (never reviewed) ────────────────────────────────────
  const tier3 = await prisma.revisionCard.findMany({
    where: { userId, repetition: 0, totalReviews: 0 },
    orderBy: { createdAt: "asc" },
    include: cardInclude,
  });

  // ── Tier 4: Upcoming (future) — early pull ──────────────────────────────
  const tier4 = await prisma.revisionCard.findMany({
    where: { userId, dueDate: { gte: tomorrow } },
    orderBy: { dueDate: "asc" },
    include: cardInclude,
  });

  // ── Merge all tiers and pick up to `quota` with topic-diversity guard ──
  const orderedCandidates = [...tier1, ...tier2, ...tier3, ...tier4];

  // De-duplicate by revisionCardId (a card can appear in tier3 AND tier1 if it
  // was never reviewed but is still due today — keep only first occurrence)
  const seen = new Set<string>();
  const deduped = orderedCandidates.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  // ── Topic-diversity guard ────────────────────────────────────────────────
  const tagCount: Record<string, number> = {};
  const picks: typeof deduped = [];
  const deferred: typeof deduped = []; // candidates temporarily skipped by guard

  for (const card of deduped) {
    if (picks.length >= quota) break;

    const tags: string[] = card.problem.tags;
    const dominated = tags.some(
      (t) => (tagCount[t] ?? 0) >= TOPIC_MAX_BEFORE_GUARD
    );

    if (dominated) {
      deferred.push(card);
      continue;
    }

    // Accept this card
    picks.push(card);
    for (const t of tags) {
      tagCount[t] = (tagCount[t] ?? 0) + 1;
    }
  }

  // If guard emptied a slot, fill from deferred list
  if (picks.length < quota) {
    for (const card of deferred) {
      if (picks.length >= quota) break;
      picks.push(card);
    }
  }

  // ── Map to clean DailyQueueItem shape ────────────────────────────────────
  return picks.map((card) => {
    const dueDateMs = card.dueDate.getTime();
    const todayMs = today.getTime();
    const daysOverdue = Math.round((todayMs - dueDateMs) / 86_400_000);

    let tier: 1 | 2 | 3 | 4;
    if (tier1.some((c) => c.id === card.id)) tier = 1;
    else if (tier2.some((c) => c.id === card.id)) tier = 2;
    else if (tier3.some((c) => c.id === card.id)) tier = 3;
    else tier = 4;

    return {
      revisionCardId: card.id,
      problemId: card.problemId,
      title: card.problem.title,
      difficulty: card.problem.difficulty,
      platform: card.problem.platform,
      platformUrl: card.problem.platformUrl,
      tags: card.problem.tags,
      language: card.problem.language,
      solutionCode: card.problem.solutionCode,
      dueDate: card.dueDate,
      interval: card.interval,
      easeFactor: card.easeFactor,
      repetition: card.repetition,
      totalReviews: card.totalReviews,
      daysOverdue,
      tier,
    };
  });
}

// ─── Upcoming Schedule (for Review Forecaster widget) ─────────────────────────

export interface ScheduleDay {
  date: string;          // ISO date string "YYYY-MM-DD"
  count: number;         // number of cards due that day
}

/**
 * Returns the count of cards due per day for the next `days` days.
 * Used by the Review Forecaster / density-schedule widget in the dashboard.
 */
export async function getUpcomingSchedule(
  userId: string,
  days = 30
): Promise<ScheduleDay[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const until = new Date(today);
  until.setDate(until.getDate() + days);

  const cards = await prisma.revisionCard.findMany({
    where: { userId, dueDate: { gte: today, lt: until } },
    select: { dueDate: true },
  });

  // Aggregate by normalized date string
  const dayMap: Record<string, number> = {};

  for (const card of cards) {
    const d = new Date(card.dueDate);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = (dayMap[key] ?? 0) + 1;
  }

  // Build ordered array for all days in the window (filling zeros)
  const result: ScheduleDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: dayMap[key] ?? 0 });
  }

  return result;
}
