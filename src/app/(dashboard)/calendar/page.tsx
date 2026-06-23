import { CalendarDays } from "lucide-react";
import { getSessionContext } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";
import type { ScheduledPost } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("scheduled_posts")
    .select("id, platform, scheduled_for, caption, status")
    .eq("account_id", ctx.account.id)
    .order("scheduled_for", { ascending: true });

  const posts = (data ?? []) as ScheduledPost[];

  // Group by date.
  const byDay = new Map<string, ScheduledPost[]>();
  for (const p of posts) {
    const day = new Date(p.scheduled_for).toLocaleDateString("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    byDay.set(day, [...(byDay.get(day) ?? []), p]);
  }

  return (
    <div>
      <PageHeader title="Content calendar" description="Everything scheduled to publish, by day." />
      {posts.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled"
          description="Create a campaign to fill your calendar with one fresh ad per day."
          actionLabel="Go to campaigns"
          actionHref="/campaigns"
        />
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, items]) => (
            <div key={day}>
              <h2 className="mb-2 text-sm font-semibold text-ink-300">{day}</h2>
              <div className="grid gap-2">
                {items.map((p) => (
                  <Card key={p.id} className="flex items-center justify-between p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{p.caption ?? "(no caption yet)"}</p>
                      <p className="text-xs text-ink-500">
                        {humanize(p.platform)} ·{" "}
                        {new Date(p.scheduled_for).toLocaleTimeString("en", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge tone={statusTone(p.status)}>{humanize(p.status)}</Badge>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
