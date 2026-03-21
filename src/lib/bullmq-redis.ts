import { Redis } from "ioredis";

// Standard ioredis client (needed for BullMQ specifically as it requires 
// persistent TCP connections for blocking operations).
// Different from Upstash @upstash/redis which is REST-based.

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (redisConnection) return redisConnection;

  const redisUrl = process.env["REDIS_URL"]; // Full redis:// url required for ioredis
  if (!redisUrl) {
    throw new Error("REDIS_URL is not defined in environment variables.");
  }

  redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });


  return redisConnection;
}
