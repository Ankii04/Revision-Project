import { Worker } from "bullmq";
import { getRedisConnection } from "@/lib/bullmq-redis";
import {
  IMPORT_QUEUE_NAME,
  AI_NOTES_QUEUE_NAME,
  enqueueAiNoteJob,
} from "@/lib/queues";
import {
  updateImportJob,
  fetchLeetCodeSubmissionsPage,
  fetchSubmissionDetail,
  mapLeetCodeLanguage,
} from "@/services/import.service";
import { createProblem, findExistingProblem } from "@/services/problem.service";
import { generateAiNotes } from "@/services/ai-notes.service";
import { prisma } from "@/lib/prisma";

const connection = getRedisConnection();

// ─── Import Worker ──────────────────────────────────────────────────────────

/**
 * Worker for bulk importing problems from LeetCode.
 * Iterates through submissions, fetches detail for each, and saves to DB.
 */
const importWorker = new Worker(
  IMPORT_QUEUE_NAME,
  async (job) => {
    const { jobId } = job.data;
    const importJob = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!importJob || !importJob.encryptedCookie) return;

    await updateImportJob(jobId, { status: "RUNNING", startedAt: new Date() });

    try {
      let offset = 0;
      let hasMore = true;
      let totalImported = 0;
      let totalSkipped = 0;

      while (hasMore) {
        const { submissions, hasNext } = await fetchLeetCodeSubmissionsPage(
          importJob.encryptedCookie,
          offset
        );

        for (const sub of submissions) {
          // Check for duplicate
          const existing = await findExistingProblem(
            importJob.userId,
            "LEETCODE",
            sub.id
          );

          if (existing) {
            totalSkipped++;
            continue;
          }

          // Fetch detail (code + tags)
          const detail = await fetchSubmissionDetail(
            sub.id,
            importJob.encryptedCookie
          );

          // Save problem
          const problem = await createProblem(importJob.userId, {
            title: sub.title,
            slug: sub.titleSlug,
            platform: "LEETCODE",
            platformId: sub.id,
            platformUrl: `https://leetcode.com${sub.url}`,
            difficulty: detail.difficulty as any,
            tags: detail.tags,
            solutionCode: detail.code,
            language: mapLeetCodeLanguage(sub.lang) as any,
            submittedAt: new Date(sub.timestamp * 1000),
            importedVia: "cookie_import",
            importJobId: jobId,
          });

          // Queue AI notes for this new problem
          await enqueueAiNoteJob(problem.id);
          totalImported++;

          // Update progress in DB periodically
          await updateImportJob(jobId, {
            totalImported,
            totalSkipped,
          });
        }

        hasMore = hasNext;
        offset += submissions.length;
      }

      await updateImportJob(jobId, {
        status: "COMPLETED",
        completedAt: new Date(),
      });
    } catch (error) {
      console.error("[Import Worker Error]", error);
      await updateImportJob(jobId, {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
  { connection }
);

// ─── AI Notes Worker ────────────────────────────────────────────────────────

/**
 * Worker for generating AI notes using Claude.
 */
const aiNotesWorker = new Worker(
  AI_NOTES_QUEUE_NAME,
  async (job) => {
    const { problemId } = job.data;
    await generateAiNotes(problemId);
  },
  { connection, concurrency: 2 } // Limit concurrent Claude API calls
);

console.log("🚀 Workers started and listening for jobs...");

process.on("SIGTERM", async () => {
  await importWorker.close();
  await aiNotesWorker.close();
});
