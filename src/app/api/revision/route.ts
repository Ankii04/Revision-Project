import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import { getRevisionQueue, submitReview } from "@/services/revision.service";
import {
  RevisionQueueQuerySchema,
  SubmitReviewSchema,
} from "@/lib/validations";

/**
 * GET /api/revision/queue
 * Returns today's revision queue — all revision cards due on or before today.
 */
export const GET = withErrorHandler(async (req) => {
  const { userId } = await auth();

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const { searchParams } = new URL(req.url);
  const { limit, includeNew } = RevisionQueueQuerySchema.parse({
    limit: searchParams.get("limit"),
    includeNew: searchParams.get("includeNew"),
  });

  const queue = await getRevisionQueue(userId, limit, includeNew);

  return apiSuccess({
    queue,
    meta: {
      totalDue: queue.length,
    },
  });
});

/**
 * POST /api/revision/review
 * Submit a review rating for a revision card using the SM-2 algorithm.
 */
export const POST = withErrorHandler(async (req) => {
  const { userId } = await auth();

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const json = await req.json();
  const { revisionCardId, rating } = SubmitReviewSchema.parse(json);

  const result = await submitReview(userId, revisionCardId, rating);

  return apiSuccess(result);
});
