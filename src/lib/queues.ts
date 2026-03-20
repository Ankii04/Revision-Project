import { Queue } from "bullmq";
import { getRedisConnection } from "./bullmq-redis";

// Define the core queues
export const IMPORT_QUEUE_NAME = "import-queue";
export const AI_NOTES_QUEUE_NAME = "ai-notes-queue";

const connection = getRedisConnection();

// Initialize BullMQ Queues
export const importQueue = new Queue(IMPORT_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 15000 },
    removeOnComplete: true,
    removeOnFail: { age: 24 * 3600 }, // Keep failed jobs for 24h for debugging
  },
});

export const aiNotesQueue = new Queue(AI_NOTES_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 20000 }, // Longer backoff for Claude API
    removeOnComplete: true,
  },
});

/** Enqueue a LeetCode/GFG import job */
export async function enqueueImportJob(jobId: string) {
  await importQueue.add("import-job", { jobId }, { jobId });
}

/** Enqueue an AI note generation job for a problem */
export async function enqueueAiNoteJob(problemId: string) {
  await aiNotesQueue.add("ai-note-job", { problemId }, { jobId: problemId });
}
