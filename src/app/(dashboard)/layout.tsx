import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/account";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { DEMO_MODE } from "@/lib/demo-flag";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login?redirect=/dashboard");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar accountName={ctx.account.name} email={ctx.email} />
        {DEMO_MODE && (
          <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200 md:px-8">
            You&apos;re exploring AdMagic in <strong>demo mode</strong> with seeded sample data — every page is clickable. Add Supabase + Anthropic keys to go live.
          </div>
        )}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
