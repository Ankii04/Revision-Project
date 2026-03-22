require("dotenv").config();
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

async function main() {
  const queue = new Queue("ai-notes-queue", { connection });
  await queue.drain(); // Clear all waiting jobs
  await queue.clean(0, 1000, "failed"); // Clear failed history
  console.log("🧹 Queue drained and cleaned.");
  process.exit(0);
}

main().catch(console.error);
