/**
 * re-enqueue-pending.cjs
 * Re-adds all PENDING aiNotes problemIds to BullMQ queue.
 * CommonJS, no transpilation needed.
 */
require("dotenv").config();
const { Queue } = require("bullmq");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL not set in .env");

// Parse Redis URL for BullMQ connection options
const url = new URL(redisUrl);
const connection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  username: url.username || "default",
  password: url.password || undefined,
  tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
};

const AI_NOTES_QUEUE_NAME = "ai-notes-queue";
const queue = new Queue(AI_NOTES_QUEUE_NAME, { connection });

async function main() {
  const pendingNotes = await prisma.aiNotes.findMany({
    where: { status: "PENDING" },
    select: { problemId: true },
    take: 200, // Process 200 at a time to avoid rate limits
  });

  console.log(`\n📋 Enqueueing ${pendingNotes.length} PENDING AI notes into BullMQ...`);

  const BATCH = 10;
  let queued = 0;
  for (let i = 0; i < pendingNotes.length; i += BATCH) {
    const batch = pendingNotes.slice(i, i + BATCH);
    await Promise.all(
      batch.map(({ problemId }) =>
        queue.add(
          "ai-note-job",
          { problemId },
          {
            jobId: `pending-${problemId}`,
            removeOnComplete: { count: 50 },
            removeOnFail: { count: 50 },
          }
        )
      )
    );
    queued += batch.length;
    process.stdout.write(`\r  ✓ Queued ${queued}/${pendingNotes.length}`);
  }

  console.log(`\n\n🚀 Done! ${queued} jobs added to the BullMQ 'ai-notes-queue'.`);
  console.log("   The worker will process them with Gemini 1.5 Flash.\n");
  await queue.close();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("\nError:", e.message);
  process.exit(1);
});
