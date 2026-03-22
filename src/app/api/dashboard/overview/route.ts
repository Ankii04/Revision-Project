import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import {
  getAnalyticsOverview,
  getHeatmapData,
  getWeakTopics,
} from "@/services/analytics.service";
import { getRevisionQueue } from "@/services/revision.service";

/**
 * GET /api/dashboard/overview
 * Combined endpoint for all dashboard data to reduce roundtrips and improve perceived speed.
 */
export const GET = withErrorHandler(async (req) => {
  const { userId } = await auth();
  if (!userId) return apiError("UNAUTHORIZED", "Not authenticated", 401);

  // Fetch all dashboard data points in parallel for maximum speed
  const currentYear = new Date().getFullYear();
  
  const [stats, heatmap, weakTopics, queue] = await Promise.all([
    getAnalyticsOverview(userId),
    getHeatmapData(userId, currentYear),
    getWeakTopics(userId, 3), // limit to 3 for summary
    getRevisionQueue(userId, 4), // next 4 items
  ]);

  return apiSuccess({
    stats,
    heatmap,
    weakTopics,
    queue,
  });
});

