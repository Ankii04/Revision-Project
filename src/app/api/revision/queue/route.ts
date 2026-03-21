import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import { getRevisionQueue } from "@/services/revision.service";
import { RevisionQueueQuerySchema } from "@/lib/validations";

/**
 * GET /api/revision/queue
 * Returns today's revision queue — all revision cards due on or before today.
 * This is the dedicated /queue sub-path handler so the URL matches the client fetches.
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
