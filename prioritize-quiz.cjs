require("dotenv").config();
const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

async function main() {
  const queue = new Queue("ai-notes-queue", { connection });
  
  // Find items in today's quiz
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const session = await prisma.quizSession.findFirst({
    where: { date: today },
    include: { items: true }
  });

  if (!session) {
    console.log("No quiz session today.");
    process.exit(0);
  }

  const problemIds = session.items.map(i => i.problemId);
  console.log(`🚀 Prioritizing ${problemIds.length} quiz problems...`);

  for (const problemId of problemIds) {
    // Check if it already has notes
    const note = await prisma.aiNotes.findFirst({ where: { problemId } });
    if (note?.status === "DONE") continue;

    // Add with high priority
    await queue.add("generate-notes", { problemId }, {
        priority: 1, // High priority
        attempts: 10,
        backoff: { type: "exponential", delay: 10000 }, // Be gentle with rate limits
        removeOnComplete: true,
    });
  }

  console.log("✅ Quiz problems prioritized.");
  process.exit(0);
}

main().catch(console.error).finally(() => prisma.$disconnect());
