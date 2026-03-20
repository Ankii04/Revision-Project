import { auth, currentUser } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import { syncUser } from "@/services/user.service";
import { SyncUserSchema } from "@/lib/validations";

/**
 * POST /api/auth/sync
 * Syncs the Clerk user into our local database.
 * This is called by the frontend or Clerk webhooks to ensure a local record exists.
 */
export const POST = withErrorHandler(async () => {
  const { userId } = await auth();

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const user = await currentUser();

  if (!user) {
    return apiError("NOT_FOUND", "User not found in Clerk", 404);
  }

  // Validate the mapping
  const input = SyncUserSchema.parse({
    clerkUserId: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    avatarUrl: user.imageUrl,
  });

  const result = await syncUser(input);

  return apiSuccess({
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      createdAt: result.user.createdAt,
      isNew: result.isNew,
    },
  });
});
