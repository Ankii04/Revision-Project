import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import { submitReview } from "@/services/revision.service";
import { SubmitReviewSchema } from "@/lib/validations";

/**
 * POST /api/revision/review
 * Submit a review rating for a revision card using the SM-2 algorithm.
 * This is the dedicated /review sub-path handler so the URL matches the client fetch.
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
