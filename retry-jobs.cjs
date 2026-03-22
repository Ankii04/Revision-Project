require("dotenv").config();
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

async function main() {
  const queue = new Queue("ai-notes-queue", { connection });
  const failed = await queue.getFailed();
  console.log(`♻️ Retrying ${failed.length} failed AI jobs...`);
  for (const job of failed) {
    await job.retry();
  }
  process.exit(0);
}

main().catch(console.error);
