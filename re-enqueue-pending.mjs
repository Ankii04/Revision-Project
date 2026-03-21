/**
 * re-enqueue-pending.mjs
 * Re-adds all PENDING aiNotes to the BullMQ queue so the worker picks them up.
 * Uses ESM so we can import the existing queue module.
 */
import { Queue } from "bullmq";
import { createClient } from "ioredis";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL not set in .env");

const connection = new createClient(redisUrl);

const AI_NOTES_QUEUE_NAME = "ai-notes-queue";
const queue = new Queue(AI_NOTES_QUEUE_NAME, { connection });

async function main() {
  const pendingNotes = await prisma.aiNotes.findMany({
    where: { status: "PENDING" },
    select: { problemId: true },
  });

  console.log(`📋 Found ${pendingNotes.length} PENDING AI notes to queue.`);

  // Add in batches to avoid overwhelming Redis
  const BATCH = 20;
  let queued = 0;
  for (let i = 0; i < pendingNotes.length; i += BATCH) {
    const batch = pendingNotes.slice(i, i + BATCH);
    await Promise.all(
      batch.map(({ problemId }) =>
        queue.add("ai-note-job", { problemId }, {
          jobId: `pending-${problemId}`, // deduped by jobId
          removeOnComplete: true,
        })
      )
    );
    queued += batch.length;
    console.log(`  ✓ Queued ${queued}/${pendingNotes.length}`);
  }

  console.log(`\n🚀 Done! ${queued} jobs added to BullMQ.`);
  console.log("   Make sure 'npm run worker:dev' is running to process them.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
