import { auth, currentUser } from "@clerk/nextjs/server";
import { syncUser } from "@/services/user.service";
import { MainNav } from "@/components/main-nav";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Await sync so the user row exists in DB before the page renders.
  // This is critical for first-time GitHub logins via Clerk — without awaiting,
  // React Query fires before the user record exists and returns empty data.
  const clerkUser = await currentUser();
  if (clerkUser) {
    await syncUser({
      clerkUserId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
      avatarUrl: clerkUser.imageUrl,
    });
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
