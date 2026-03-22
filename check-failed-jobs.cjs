require("dotenv").config();
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

async function main() {
  const queue = new Queue("ai-notes-queue", { connection });
  const failed = await queue.getFailed(0, 5);
  console.log("Failed Jobs Sample:");
  failed.forEach(job => {
    console.log(`Job ${job.id} Error:`, job.failedReason);
  });
  process.exit(0);
}

main().catch(console.error);
