require("dotenv").config();
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

async function main() {
  const queue = new Queue("ai-notes-queue", { connection });
  const counts = await queue.getJobCounts("wait", "active", "completed", "failed", "delayed");
  console.log("AI Notes Queue Counts:", counts);
  process.exit(0);
}

main().catch(console.error);
