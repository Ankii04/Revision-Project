import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import {
  getDailyPriorityQueue,
  getUpcomingSchedule,
} from "@/services/revision.service";

/**
 * GET /api/revision/daily
 *
 * Returns today's "Daily 5" session built by the 4-tier priority algorithm.
 *
 * Query params:
 *   quota  (number, default 5)  — override the daily pick count
 *
 * Response shape:
 * {
 *   queue:    DailyQueueItem[]   — the ordered picks with tier labels
 *   schedule: ScheduleDay[]      — card-count-per-day for the next 30 days
 *   meta: {
 *     tier1Count, tier2Count, tier3Count, tier4Count,
 *     quotaUsed, quotaConfig
 *   }
 * }
 */
export const GET = withErrorHandler(async (req) => {
  const { userId } = await auth();
  if (!userId) return apiError("UNAUTHORIZED", "Not authenticated", 401);

  const { searchParams } = new URL(req.url);
  const quota = Math.min(
    20,
    Math.max(1, parseInt(searchParams.get("quota") ?? "5", 10) || 5)
  );

  // Run both queries in parallel
  const [queue, schedule] = await Promise.all([
    getDailyPriorityQueue(userId, quota),
    getUpcomingSchedule(userId, 30),
  ]);

  return apiSuccess({
    queue,
    schedule,
    meta: {
      tier1Count: queue.filter((c) => c.tier === 1).length,
      tier2Count: queue.filter((c) => c.tier === 2).length,
      tier3Count: queue.filter((c) => c.tier === 3).length,
      tier4Count: queue.filter((c) => c.tier === 4).length,
      quotaUsed: queue.length,
      quotaConfig: quota,
    },
  });
});
