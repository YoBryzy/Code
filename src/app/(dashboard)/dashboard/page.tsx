import Link from "next/link";
import { Package, Clapperboard, CalendarClock, Megaphone, ArrowRight, Sparkles } from "lucide-react";
import { getSessionContext } from "@/lib/account";
import { getCounts } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const { products, videos, scheduled, campaigns } = await getCounts(ctx.account.id);

  const stats = [
    { label: "Products", value: products, icon: Package, href: "/products" },
    { label: "Videos", value: videos, icon: Clapperboard, href: "/videos" },
    { label: "Scheduled posts", value: scheduled, icon: CalendarClock, href: "/calendar" },
    { label: "Campaigns", value: campaigns, icon: Megaphone, href: "/campaigns" },
  ];

  const firstRun = products === 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{ctx.email ? `, ${ctx.email.split("@")[0]}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          Turn any product into a month of short-form ads — generated and posted automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-5 transition hover:border-brand-500/40">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-400">{s.label}</span>
                <s.icon className="h-4 w-4 text-brand-300" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{s.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      {firstRun ? (
        <Card className="mt-6 overflow-hidden">
          <div className="bg-gradient-to-b from-brand-600/15 to-transparent p-8">
            <div className="flex items-center gap-2 text-brand-300">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium">Let's make your first ad</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold">Add a product to get started</h2>
            <p className="mt-1 max-w-lg text-sm text-ink-400">
              Paste a product URL (Shopify, Amazon, your store), drop a TikTok/Reel you own,
              or upload product photos. The AI takes it from there.
            </p>
            <Link href="/products/new" className={cn(buttonClasses("primary", "md"), "mt-5")}>
              Add your first product <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-semibold">Generate fresh ads</h2>
            <p className="mt-1 text-sm text-ink-400">
              Open a product to generate a new strategy pack or spin up a campaign series.
            </p>
            <Link href="/products" className={cn(buttonClasses("secondary", "sm"), "mt-4")}>
              Go to products
            </Link>
          </Card>
          <Card className="p-6">
            <h2 className="font-semibold">Review what's queued</h2>
            <p className="mt-1 text-sm text-ink-400">
              Approve captions and videos before they post in the approval queue.
            </p>
            <Link href="/approvals" className={cn(buttonClasses("secondary", "sm"), "mt-4")}>
              Open approval queue
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}
