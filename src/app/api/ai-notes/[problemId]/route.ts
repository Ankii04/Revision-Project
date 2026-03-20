import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import { getAiNotes, queueAiNotesGeneration } from "@/services/ai-notes.service";
import { enqueueAiNoteJob } from "@/lib/queues";

/**
 * GET /api/ai-notes/[problemId]
 * Returns the current AI notes for a specific problem.
 */
export const GET = withErrorHandler(async (_req, { params }) => {
  const { userId } = await auth();
  const { problemId } = await params;

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const aiNotes = await getAiNotes(problemId, userId);

  if (!aiNotes) {
    return apiError("NOT_FOUND", "AI notes not found", 404);
  }

  return apiSuccess({ aiNotes });
});

/**
 * POST /api/ai-notes/[problemId]/generate
 * Enqueues an AI notes generation job for a problem.
 */
export const POST = withErrorHandler(async (_req, { params }) => {
  const { userId } = await auth();
  const { problemId } = await params;

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const result = await queueAiNotesGeneration(problemId, userId);

  if (result.status === "rate_limited") {
    return apiError(
      "RATE_LIMITED",
      result.message,
      429,
      { retryAfter: result.retryAfter }
    );
  }

  // Queue BullMQ job
  await enqueueAiNoteJob(problemId);

  return apiSuccess(result, 202);
});

