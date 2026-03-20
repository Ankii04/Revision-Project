import { PrismaClient } from "@prisma/client";

// PrismaClient is instantiated as a singleton to avoid creating multiple
// connections during development hot-reloads (Next.js fast refresh issue).
// In production, a new instance is created once per process.

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export { prisma };
