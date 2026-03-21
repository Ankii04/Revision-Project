import "dotenv/config";
import { Redis } from "ioredis";

async function test() {
  const url = process.env.REDIS_URL;
  console.log("Testing Connection to:", url?.substring(0, 20) + "...");

  if (!url) return;

  const redis = new Redis(url, {
    tls: url.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: null,
  });

  try {
    const res = await redis.ping();
    console.log("✅ REDIS PING SUCCESS:", res);
    process.exit(0);
  } catch (err) {
    console.error("❌ REDIS PING FAILED:", err);
    process.exit(1);
  }
}

test();
