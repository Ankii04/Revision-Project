import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import {
  createImportJob,
  hasActiveImportJob,
  getImportJobs,
} from "@/services/import.service";
import { LeetCodeImportSchema } from "@/lib/validations";
import { enqueueImportJob } from "@/lib/queues";

/**
 * GET /api/import/jobs
 * Returns the list of all active or past import jobs for the authenticated user.
 */
export const GET = withErrorHandler(async () => {
  const { userId } = await auth();

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const jobs = await getImportJobs(userId);

  return apiSuccess({ jobs });
});

/**
 * POST /api/import/leetcode
 * Kicks off a bulk LeetCode import using the user's session cookie.
 */
export const POST = withErrorHandler(async (req) => {
  const { userId } = await auth();

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const json = await req.json();
  const { sessionCookie } = LeetCodeImportSchema.parse(json);

  const activeJob = await hasActiveImportJob(userId, "LEETCODE");

  if (activeJob) {
    return apiError(
      "IMPORT_IN_PROGRESS",
      "You already have an active LeetCode import job.",
      409
    );
  }

  // Create import job record
  const importJob = await createImportJob(userId, "LEETCODE", sessionCookie);

  // Queue BullMQ job
  await enqueueImportJob(importJob.id);

  return apiSuccess(
    {
      importJob,
      message:
        "Import started. You will see problems appearing in your dashboard as they are processed.",
    },
    202
  );
});

