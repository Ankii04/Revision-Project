import { prisma } from "@/lib/prisma";

// ─── Analytics Service ─────────────────────────────────────────────────────

/**
 * Returns high-level overview statistics for the user's dashboard.
 * Counts are cached in Redis for 5 minutes (done at the API route level).
 */
export async function getAnalyticsOverview(userId: string) {
  const [
    totalProblems,
    problemsByDifficulty,
    problemsByPlatform,
    aiNotesGenerated,
    totalReviews,
    streakRecord,
    cardsWithDueToday,
    totalUniqueTags,
  ] = await Promise.all([
    // Total problem count
    prisma.problem.count({ where: { userId } }),

    // Group by difficulty
    prisma.problem.groupBy({
      by: ["difficulty"],
      where: { userId },
      _count: true,
    }),

    // Group by platform
    prisma.problem.groupBy({
      by: ["platform"],
      where: { userId },
      _count: true,
    }),

    // AI notes with DONE status
    prisma.aiNotes.count({
      where: { problem: { userId }, status: "DONE" },
    }),

    // Total revision log entries
    prisma.revisionLog.count({ where: { userId } }),

    // Streak record
    prisma.streakRecord.findUnique({ where: { userId } }),

    // Cards due today
    prisma.revisionCard.count({
      where: { userId, dueDate: { lte: new Date() } },
    }),

    // Unique tags (computed from all problems' tags array)
    prisma.problem.findMany({
      where: { userId },
      select: { tags: true },
    }),
  ]);

  // Compute unique tags count from the array of tag arrays
  const uniqueTags = new Set(
    totalUniqueTags.flatMap((p) => p.tags)
  );

  // Reshape groupBy results into plain objects
  const difficultyMap = Object.fromEntries(
    problemsByDifficulty.map((r) => [r.difficulty, r._count])
  ) as Record<string, number>;

  const platformMap = Object.fromEntries(
    problemsByPlatform.map((r) => [r.platform, r._count])
  ) as Record<string, number>;

  return {
    totalProblems,
    problemsByDifficulty: {
      EASY: difficultyMap["EASY"] ?? 0,
      MEDIUM: difficultyMap["MEDIUM"] ?? 0,
      HARD: difficultyMap["HARD"] ?? 0,
      UNKNOWN: difficultyMap["UNKNOWN"] ?? 0,
    },
    problemsByPlatform: {
      LEETCODE: platformMap["LEETCODE"] ?? 0,
      GFG: platformMap["GFG"] ?? 0,
      CODEFORCES: platformMap["CODEFORCES"] ?? 0,
      MANUAL: platformMap["MANUAL"] ?? 0,
    },
    aiNotesGenerated,
    totalReviews,
    currentStreak: streakRecord?.currentStreak ?? 0,
    longestStreak: streakRecord?.longestStreak ?? 0,
    totalUniqueTags: uniqueTags.size,
    cardsWithDueToday,
  };
}

/**
 * Returns daily activity data for the heatmap visualization.
 * Returns 365 days worth of data for the given year.
 */
export async function getHeatmapData(userId: string, year: number) {
  const startDate = new Date(year, 0, 1); // Jan 1
  const endDate = new Date(year, 11, 31); // Dec 31

  const dailyStats = await prisma.dailyStats.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      problemsSolved: true,
      problemsRevised: true,
    },
  });

  // Build a full calendar of 365 days with 0s for missing days
  const statsMap = new Map(
    dailyStats.map((d) => [d.date.toISOString().split("T")[0] ?? "", d])
  );

  const heatmap: Array<{
    date: string;
    problemsSolved: number;
    problemsRevised: number;
    totalActivity: number;
  }> = [];

  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dateStr = cursor.toISOString().split("T")[0] ?? "";
    const stat = statsMap.get(dateStr);
    heatmap.push({
      date: dateStr,
      problemsSolved: stat?.problemsSolved ?? 0,
      problemsRevised: stat?.problemsRevised ?? 0,
      totalActivity: (stat?.problemsSolved ?? 0) + (stat?.problemsRevised ?? 0),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const maxActivity = Math.max(...heatmap.map((d) => d.totalActivity), 0);

  return { heatmap, maxActivity };
}

/**
 * Returns the user's weakest topics ranked by average recall quality.
 * "Weak" = highest proportion of AGAIN ratings among all reviews for that tag.
 */
export async function getWeakTopics(userId: string, limit: number) {
  // Fetch all revision logs with the problem's tags
  const logs = await prisma.revisionLog.findMany({
    where: { userId },
    include: { problem: { select: { tags: true } } },
  });

  // Build per-tag stats
  const tagStats = new Map<
    string,
    { total: number; again: number; goodOrEasy: number; easeFactorSum: number; easeFactorCount: number }
  >();

  for (const log of logs) {
    for (const tag of log.problem.tags) {
      const existing = tagStats.get(tag) ?? {
        total: 0,
        again: 0,
        goodOrEasy: 0,
        easeFactorSum: 0,
        easeFactorCount: 0,
      };

      existing.total++;
      if (log.rating === "AGAIN") existing.again++;
      if (log.rating === "GOOD" || log.rating === "EASY") existing.goodOrEasy++;
      existing.easeFactorSum += log.easeFactorAfter;
      existing.easeFactorCount++;

      tagStats.set(tag, existing);
    }
  }

  // Also get problem count per tag
  const problems = await prisma.problem.findMany({
    where: { userId },
    select: { tags: true },
  });

  const problemCountByTag = new Map<string, number>();
  for (const p of problems) {
    for (const tag of p.tags) {
      problemCountByTag.set(tag, (problemCountByTag.get(tag) ?? 0) + 1);
    }
  }

  // Build ranked results
  const results = Array.from(tagStats.entries())
    .filter(([, stats]) => stats.total >= 3) // Ignore tags with < 3 reviews
    .map(([tag, stats], index) => ({
      tag,
      totalProblems: problemCountByTag.get(tag) ?? 0,
      avgEaseFactor:
        stats.easeFactorCount > 0
          ? Math.round((stats.easeFactorSum / stats.easeFactorCount) * 100) / 100
          : 2.5,
      againRatio: Math.round((stats.again / stats.total) * 100) / 100,
      goodOrEasyRatio: Math.round((stats.goodOrEasy / stats.total) * 100) / 100,
      rank: index + 1,
    }))
    .sort((a, b) => b.againRatio - a.againRatio) // Sort by worst first
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return results;
}

/**
 * Returns problem count broken down by tag for charts.
 */
export async function getTopicBreakdown(userId: string) {
  const problems = await prisma.problem.findMany({
    where: { userId },
    select: { tags: true },
  });

  const tagCount = new Map<string, number>();
  for (const p of problems) {
    for (const tag of p.tags) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(tagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
