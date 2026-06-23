import Link from "next/link";
import { Megaphone } from "lucide-react";
import { getSessionContext } from "@/lib/account";
import { listCampaigns } from "@/lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const campaigns = await listCampaigns(ctx.account.id);

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Each campaign is a multi-day series — one fresh AI ad per day."
      />
      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Open a product and generate a content plan to start a daily-posting campaign."
          actionLabel="Go to products"
          actionHref="/products"
        />
      ) : (
        <div className="grid gap-3">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="flex items-center justify-between p-4 transition hover:border-brand-500/40">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-ink-500">
                    {c.days_total} days · {(c.platforms ?? []).join(", ") || "no platforms"}
                    {c.autopilot ? " · autopilot on" : ""}
                  </p>
                </div>
                <Badge tone={statusTone(c.status)}>{humanize(c.status)}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
