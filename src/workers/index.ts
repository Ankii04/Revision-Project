import "dotenv/config";
import http from "http";
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
    console.log(`📦 [JOB RECEIVED] Tracking ID: ${jobId}`);

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
        console.log(`🔍 [SCANNING HISTORY] Checking submissions ${offset} to ${offset + 100}...`);
        const { submissions, hasNext } = await fetchLeetCodeSubmissionsPage(
          importJob.encryptedCookie,
          offset
        );
        
        if (submissions.length === 0) break;

        console.log(`✅ [FOUND] ${submissions.length} history entries. Filtering for new 'Accepted' unique problems...`);


        for (const sub of submissions) {
          // 1. ONLY import Accepted submissions
          if (sub.statusDisplay !== "Accepted") {
            totalSkipped++;
            continue;
          }

          // 2. Check if a problem with this slug already exists for THIS user
          // This avoids importing multiple Accepted submissions for the same problem
          const existing = await prisma.problem.findFirst({
            where: { 
              userId: importJob.userId,
              platform: "LEETCODE",
              slug: sub.titleSlug 
            }
          });

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
            description: detail.description,
            difficulty: detail.difficulty as any,
            tags: detail.tags,
            solutionCode: detail.code,
            language: mapLeetCodeLanguage(sub.lang) as any,
            submittedAt: new Date(sub.timestamp * 1000),
            importedVia: "cookie_import",
            importJobId: jobId,
            companies: [],
            isPremium: false,
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

        hasMore = hasNext && submissions.length > 0;
        offset += submissions.length;
        console.log(`📊 [PROGRESS] Found ${totalImported} of your 170+ problems so far. (Scanned ${offset} history entries)`);
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
  { connection: connection as any }
);

// ─── AI Notes Worker ────────────────────────────────────────────────────────

/**
 * Worker for generating AI notes using Claude.
 */
const aiNotesWorker = new Worker(
  AI_NOTES_QUEUE_NAME,
  async (job) => {
    const { problemId } = job.data;
    console.log(`🧠 [AI JOB RECEIVED] Problem ID: ${problemId}`);
    try {
      await generateAiNotes(problemId);
      console.log(`✅ [AI JOB DONE] Problem ID: ${problemId}`);
      // Add a 5s gap to stay within the 15 RPM free tier limit safely
      await new Promise(r => setTimeout(r, 5000));
    } catch (error) {
      console.error(`❌ [AI JOB FAILED] Problem ID: ${problemId}`, error);
      throw error;
    }
  },
  { connection: connection as any, concurrency: 1 } // Concurrency 1 for stability with free tier
);

// 🏥 DUMMY SERVER FOR RENDER HEALTH CHECKS
// This satisfies Render's 'Web Service' port check for free tier deployment
const port = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Worker is healthy");
}).listen(port);

console.log(`🚀 Workers started and listening for jobs on port ${port}...`);

process.on("SIGTERM", async () => {
  await importWorker.close();
  await aiNotesWorker.close();
});
