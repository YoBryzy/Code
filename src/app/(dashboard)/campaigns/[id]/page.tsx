import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionContext } from "@/lib/account";
import { getCampaignBundle } from "@/lib/queries";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const { campaign, items } = await getCampaignBundle(ctx.account.id, id);
  if (!campaign) notFound();
  const c = campaign;
  const days = items;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/campaigns" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-100">
        <ArrowLeft className="h-4 w-4" /> Campaigns
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {c.days_total}-day series · {(c.platforms ?? []).join(", ")} · {c.autopilot ? "autopilot on" : "manual review"}
          </p>
        </div>
        <Badge tone={statusTone(c.status)}>{humanize(c.status)}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((d) => (
          <Card key={d.id} className="flex flex-col">
            <CardBody className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-500">Day {d.day_index}</span>
                <Badge tone="blue">{humanize(d.plan.style)}</Badge>
              </div>
              <p className="text-sm font-medium leading-snug">“{d.plan.hookText}”</p>
              <p className="text-xs text-ink-400">{d.plan.scriptOutline}</p>
              <p className="text-xs text-ink-500">CTA: {d.plan.cta}</p>
              {d.plan.hashtags?.length > 0 && (
                <p className="text-xs text-brand-300">
                  {d.plan.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
                </p>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
