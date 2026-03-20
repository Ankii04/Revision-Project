import { Redis } from "@upstash/redis";

// Upstash Redis client — uses HTTP-based REST API, works in Vercel Edge & serverless
// without persistent TCP connections.

let redis: Redis | null = null;

/**
 * Returns a lazily-initialized Upstash Redis client.
 * Throws at runtime if env vars are missing, which surfaces config issues early.
 */
export function getRedisClient(): Redis {
  if (redis) return redis;

  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];

  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in .env.local"
    );
  }

  redis = new Redis({ url, token });
  return redis;
}

/** Cache key constants — centralised to avoid string typos across the codebase */
export const CACHE_KEYS = {
  userOverview: (userId: string) => `user:${userId}:overview`,
  revisionQueue: (userId: string) => `user:${userId}:queue`,
  heatmap: (userId: string, year: number) => `user:${userId}:heatmap:${year}`,
  aiNotes: (problemId: string) => `ai-notes:${problemId}`,
};

/** Cache TTLs in seconds */
export const CACHE_TTL = {
  OVERVIEW: 300, // 5 minutes
  HEATMAP: 3600, // 1 hour
  QUEUE: 60, // 1 minute
  AI_NOTES: 86400, // 24 hours
};
