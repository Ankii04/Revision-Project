require("dotenv").config();
const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

async function main() {
  const queue = new Queue("ai-notes-queue", { connection });
  
  // Find all PENDING or FAILED notes
  const staleNotes = await prisma.aiNotes.findMany({
    where: { 
      OR: [
        { status: "PENDING" },
        { status: "FAILED" },
        { status: "PROCESSING" } // Cleanup stuck processing
      ]
    },
    select: { problemId: true }
  });

  console.log(`📡 Re-enqueuing ${staleNotes.length} stale AI jobs...`);

  for (const { problemId } of staleNotes) {
    await queue.add("generate-notes", { problemId }, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
    });
  }

  console.log("✅ All jobs enqueued.");
  process.exit(0);
}

main().catch(console.error);
