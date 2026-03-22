import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/revision/quiz-state
 *
 * Returns the user's current daily quiz state, including:
 *  - today's session (which questions to show, quota, order)
 *  - overall pool stats (total, seen, pending)
 *  - streak / adaptive quota info
 *
 * State is persisted in the DB via the QuizSession model.
 */
export const GET = withErrorHandler(async () => {
  const { userId } = await auth();
  if (!userId) return apiError("UNAUTHORIZED", "Not authenticated", 401);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get or create today's quiz session
  let session = await prisma.quizSession.findFirst({
    where: { userId, date: today },
    include: {
      items: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              tags: true,
              solutionCode: true,
              language: true,
              platform: true,
              platformUrl: true,
              description: true,
              aiNotes: true,
            },
          },
        },
      },
    },
  });


  if (!session) {
    // Build a new session for today
    session = await buildTodaySession(userId, today);
  }

  // Compute pool stats
  const totalProblems = await prisma.problem.count({ where: { userId } });
  const seenProblemIds = await prisma.quizSessionItem.findMany({
    where: { session: { userId } },
    select: { problemId: true },
    distinct: ["problemId"],
  });
  const uniqueSeen = new Set(seenProblemIds.map((x) => x.problemId)).size;

  return apiSuccess({
    session: {
      id: session.id,
      date: session.date,
      quota: session.quota,
      passed: session.passed,
      completed: session.completed,
      correctCount: session.correctCount,
      wrongCount: session.wrongCount,
      items: session.items.map((item) => ({
        id: item.id,
        problemId: item.problemId,
        answered: item.answered,
        correct: item.correct,
        problem: item.problem,
      })),
    },
    pool: {
      total: totalProblems,
      seen: uniqueSeen,
      pending: Math.max(0, totalProblems - uniqueSeen),
    },
  });
});

/**
 * POST /api/revision/quiz-state
 * Submit an answer for a quiz item.
 * Body: { itemId: string, correct: boolean }
 */
export const POST = withErrorHandler(async (req) => {
  const { userId } = await auth();
  if (!userId) return apiError("UNAUTHORIZED", "Not authenticated", 401);

  const { itemId, correct } = (await req.json()) as { itemId: string; correct: boolean };

  if (!itemId || typeof correct !== "boolean") {
    return apiError("VALIDATION_ERROR", "itemId and correct (boolean) are required", 422);
  }

  // Verify ownership
  const item = await prisma.quizSessionItem.findFirst({
    where: { id: itemId, session: { userId } },
    include: { session: true },
  });

  if (!item) return apiError("NOT_FOUND", "Quiz item not found", 404);
  if (item.answered) return apiError("VALIDATION_ERROR", "Item already answered", 400);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mark item as answered
  await prisma.quizSessionItem.update({
    where: { id: itemId },
    data: { answered: true, correct, answeredAt: new Date() },
  });

  // Update session counters
  const session = await prisma.quizSession.update({
    where: { id: item.sessionId },
    data: {
      correctCount: correct ? { increment: 1 } : undefined,
      wrongCount: !correct ? { increment: 1 } : undefined,
    },
    include: {
      items: true,
    },
  });

  // If wrong → insert a "re-queue" marker so the problem appears again sooner
  if (!correct) {
    await prisma.quizRequeue.upsert({
      where: { userId_problemId: { userId, problemId: item.problemId } },
      create: { userId, problemId: item.problemId, requeueCount: 1 },
      update: { requeueCount: { increment: 1 }, requeuedAt: new Date() },
    });
  } else {
    // Correct — remove from re-queue if present
    await prisma.quizRequeue.deleteMany({
      where: { userId, problemId: item.problemId },
    });
  }

  // Check if all items are answered → finalize session
  const allAnswered = session.items.every((i) => i.answered);
  let completed = false;
  let passed = false;
  let nextQuota = session.quota;

  if (allAnswered) {
    const correctItems = session.items.filter((i) => i.correct).length;
    const total = session.items.length;
    passed = correctItems >= Math.ceil(total * 0.7); // 70%+ = pass

    if (passed) {
      // Adaptive increase: 5 → 7 → 10 → 15 → 20 (max)
      nextQuota = computeNextQuota(session.quota);
    }

    await prisma.quizSession.update({
      where: { id: session.id },
      data: { completed: true, passed, completedAt: new Date() },
    });

    // Persist adaptive quota for tomorrow
    await prisma.quizProgress.upsert({
      where: { userId },
      create: {
        userId,
        currentQuota: nextQuota,
        totalSessionsCompleted: 1,
        totalPassedSessions: passed ? 1 : 0,
      },
      update: {
        currentQuota: nextQuota,
        totalSessionsCompleted: { increment: 1 },
        totalPassedSessions: passed ? { increment: 1 } : undefined,
      },
    });

    completed = true;
  }

  return apiSuccess({ completed, passed, nextQuota });
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Computes the adaptive next-day quota after a passing session */
function computeNextQuota(current: number): number {
  if (current < 5) return 5;
  if (current < 7) return 7;
  if (current < 10) return 10;
  if (current < 15) return 15;
  if (current < 20) return 20;
  return 20; // cap at 20
}

/**
 * Builds a new quiz session for today:
 * 1. Prioritise re-queued (wrong-answer) problems
 * 2. Then problems not yet seen (ordered by oldest createdAt)
 * 3. Then oldest-seen problems (to ensure full rotation)
 * Shuffled within each group to avoid predictable ordering.
 */
async function buildTodaySession(userId: string, today: Date) {
  // Get persistent quota
  const progress = await prisma.quizProgress.findUnique({ where: { userId } });
  const quota = progress?.currentQuota ?? 5;

  // 1. Re-queued problems (wrong answers from previous sessions)
  const requeued = await prisma.quizRequeue.findMany({
    where: { userId },
    orderBy: { requeuedAt: "asc" },
    take: Math.ceil(quota * 0.4), // up to 40% of quota from re-queue
    select: { problemId: true },
  });
  const requeuedIds = new Set(requeued.map((r) => r.problemId));

  // 2. All problems seen so far
  const seenItems = await prisma.quizSessionItem.findMany({
    where: { session: { userId } },
    select: { problemId: true, session: { select: { date: true } } },
    orderBy: { session: { date: "desc" } },
  });
  const seenIds = new Set(seenItems.map((s) => s.problemId));

  // 3. Problems NOT yet seen (newest unseen first — to introduce fresh problems)
  const allProblems = await prisma.problem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const notSeenIds = allProblems
    .map((p) => p.id)
    .filter((id) => !seenIds.has(id) && !requeuedIds.has(id));

  // 4. Previously-seen (for rotation) — exclude re-queued and not-seen
  const alreadySeenIds = allProblems
    .map((p) => p.id)
    .filter((id) => seenIds.has(id) && !requeuedIds.has(id));

  // Build the pick list: requeued → unseen → seen (rotated)
  const picks: string[] = [];

  // Requeued (priority)
  picks.push(...shuffle([...requeuedIds]).slice(0, Math.ceil(quota * 0.4)));

  const remaining = quota - picks.length;

  // Fill from unseen first
  const fromUnseen = shuffle(notSeenIds).slice(0, remaining);
  picks.push(...fromUnseen);

  // If still need more, pull from oldest-seen (rotation)
  if (picks.length < quota) {
    const fromSeen = shuffle(alreadySeenIds).slice(0, quota - picks.length);
    picks.push(...fromSeen);
  }

  // Final shuffle of the full pick list
  const finalPicks = shuffle(picks.slice(0, quota));

  // Create session in DB
  const session = await prisma.quizSession.create({
    data: {
      userId,
      date: today,
      quota,
      items: {
        create: finalPicks.map((problemId, order) => ({
          problemId,
          order,
        })),
      },
    },
    include: {
      items: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              tags: true,
              solutionCode: true,
              language: true,
              platform: true,
              platformUrl: true,
            },
          },
        },
      },
    },
  });

  return session;
}

/** Fisher-Yates shuffle — works around TS destructuring-swap type errors */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = temp;
  }
  return a;
}

