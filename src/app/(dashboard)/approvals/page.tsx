import { CheckSquare } from "lucide-react";
import { getSessionContext } from "@/lib/account";
import { listPendingPosts } from "@/lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const posts = await listPendingPosts(ctx.account.id);

  return (
    <div>
      <PageHeader
        title="Approval queue"
        description="Review and edit captions before anything publishes. Turn on autopilot to skip this step."
      />
      {posts.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nothing waiting for review"
          description="When posts are queued for manual review, they'll show up here for approval."
        />
      ) : (
        <div className="grid gap-3">
          {posts.map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <p className="truncate text-sm">{p.caption ?? "(no caption)"}</p>
                <p className="text-xs text-ink-500">
                  {humanize(p.platform)} · {new Date(p.scheduled_for).toLocaleString()}
                </p>
              </div>
              <Badge tone="amber">Needs review</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
