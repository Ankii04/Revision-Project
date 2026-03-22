import { auth, currentUser } from "@clerk/nextjs/server";
import { syncUser } from "@/services/user.service";
import { MainNav } from "@/components/main-nav";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Sync user only once per session using Next.js cache.
  // Without caching, this ran a DB read + write on EVERY page navigation,
  // adding 200-600ms latency to every click. Now it only runs once per hour.
  const clerkUser = await currentUser();
  if (clerkUser) {
    const cachedSync = unstable_cache(
      async () => syncUser({
        clerkUserId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
        avatarUrl: clerkUser.imageUrl,
      }),
      [`user-sync-${clerkUser.id}`],
      { revalidate: 3600, tags: [`user-${clerkUser.id}`] } // Cache for 1 hour
    );
    await cachedSync();
  }

  return (

    <div className="flex h-screen bg-[#020617]">

      {/* Persistent Sidebar (Client Component) */}
      <MainNav />
      
      {/* Main Content Area: Padding for Sidebar width (64) */}
      <div className="flex-1 lg:pl-64 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
