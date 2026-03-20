import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import type { SyncUserInput } from "@/lib/validations";

/**
 * Syncs a Clerk user into our local database.
 * Creates the user row and streak record if they don't exist.
 * Called after first login via Clerk webhook or client-side hook.
 */
export async function syncUser(input: SyncUserInput): Promise<{ user: User; isNew: boolean }> {
  const existing = await prisma.user.findUnique({
    where: { id: input.clerkUserId },
  });

  if (existing) {
    // Update name/avatar in case they changed in Clerk
    const updated = await prisma.user.update({
      where: { id: input.clerkUserId },
      data: {
        name: input.name,
        avatarUrl: input.avatarUrl,
      },
    });
    return { user: updated, isNew: false };
  }

  // New user — create user + streak record atomically
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        id: input.clerkUserId,
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl,
      },
    });

    await tx.streakRecord.create({
      data: { userId: newUser.id },
    });

    return newUser;
  });

  return { user, isNew: true };
}

/**
 * Returns a user by their Clerk ID, including streak record.
 */
export async function getUserWithStreak(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { streakRecord: true },
  });
}
