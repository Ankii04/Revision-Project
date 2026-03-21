import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import {
  getAnalyticsOverview,
  getHeatmapData,
  getWeakTopics,
  getTopicBreakdown,
} from "@/services/analytics.service";
import { HeatmapQuerySchema, WeakTopicsQuerySchema } from "@/lib/validations";

/**
 * GET /api/analytics/overview
 * Returns high-level overview statistics for the user dashboard.
 */
export const GET = withErrorHandler(async (req) => {
  const { userId } = await auth();

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const { searchParams } = new URL(req.url);

  // Determine if requesting specific data or global overview
  const yearStr = searchParams.get("year");
  const limitStr = searchParams.get("limit");
  const type = searchParams.get("type");

  if (type === "heatmap") {
    const { year } = HeatmapQuerySchema.parse({ year: yearStr ?? new Date().getFullYear().toString() });
    const data = await getHeatmapData(userId, year);
    return apiSuccess(data);
  }

  if (limitStr && type === "weak-topics") {
    const { limit } = WeakTopicsQuerySchema.parse({ limit: limitStr });
    const data = await getWeakTopics(userId, limit);
    return apiSuccess(data);
  }

  if (type === "topic-breakdown") {
    const data = await getTopicBreakdown(userId);
    return apiSuccess(data);
  }

  const overview = await getAnalyticsOverview(userId);

  return apiSuccess({ overview });
});
