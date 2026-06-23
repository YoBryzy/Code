import { BarChart3, Eye, Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { getSessionContext } from "@/lib/account";
import { listMetricsRows } from "@/lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { formatCompact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const rows = await listMetricsRows(ctx.account.id);
  const sum = (k: "views" | "likes" | "comments" | "shares" | "saves") =>
    rows.reduce((acc: number, r: Record<string, number>) => acc + (r[k] ?? 0), 0);

  const stats = [
    { label: "Views", value: sum("views"), icon: Eye },
    { label: "Likes", value: sum("likes"), icon: Heart },
    { label: "Comments", value: sum("comments"), icon: MessageCircle },
    { label: "Shares", value: sum("shares"), icon: Share2 },
    { label: "Saves", value: sum("saves"), icon: Bookmark },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Performance pulled from connected platforms. The AI uses these to improve future ads."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Once your posts go live and metrics are pulled back, you'll see views, likes, best hooks, and best posting times here."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {stats.map((s) => (
              <Card key={s.label} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-400">{s.label}</span>
                  <s.icon className="h-4 w-4 text-brand-300" />
                </div>
                <p className="mt-3 text-2xl font-semibold">{formatCompact(s.value)}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {["Best-performing hooks", "Best captions", "Best posting times"].map((t) => (
              <Card key={t} className="p-5">
                <h3 className="text-sm font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-ink-500">
                  Rankings appear here as more posts accumulate data.
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
