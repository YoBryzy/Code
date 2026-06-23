import { Link2, ShieldCheck } from "lucide-react";
import { getSessionContext } from "@/lib/account";
import { listConnectedAccounts } from "@/lib/queries";
import { DEMO_MODE } from "@/lib/demo-flag";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cn, humanize } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PLATFORMS = [
  { id: "tiktok", label: "TikTok", note: "Content Posting API · requires app review" },
  { id: "instagram", label: "Instagram Reels", note: "Graph API · Business/Creator account + FB Page" },
  { id: "youtube", label: "YouTube Shorts", note: "Data API v3 · upload scope" },
] as const;

export default async function AccountsPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const connected = await listConnectedAccounts(ctx.account.id);
  const byPlatform = new Map(connected.map((c) => [c.platform, c]));

  return (
    <div>
      <PageHeader
        title="Connected accounts"
        description="Connect via official APIs to auto-post. AdMagic only ever publishes content you own."
      />

      <div className="grid gap-3">
        {PLATFORMS.map((p) => {
          const acct = byPlatform.get(p.id);
          return (
            <Card key={p.id}>
              <CardBody className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.label}</span>
                    {acct && <Badge tone={statusTone(acct.status)}>{humanize(acct.status)}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {acct?.username ? `@${acct.username}` : p.note}
                  </p>
                </div>
                {DEMO_MODE ? (
                  <span
                    className={cn(buttonClasses("outline", "sm"), "cursor-not-allowed opacity-60")}
                    title="Connecting is disabled in demo mode"
                  >
                    {acct ? "Connected" : "Connect"}
                  </span>
                ) : (
                  <a href={`/api/connect/${p.id}`} className={cn(buttonClasses(acct ? "outline" : "primary", "sm"))}>
                    {acct ? "Reconnect" : "Connect"}
                  </a>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardBody className="flex gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />
          <div className="text-sm text-ink-400">
            <p className="font-medium text-ink-200">Compliance</p>
            <p className="mt-1">
              These platforms require app review and business/creator accounts before live
              publishing is enabled. Until approved, AdMagic generates, renders, and queues your
              videos — only the publish step is gated. See <code>docs/COMPLIANCE.md</code>.
            </p>
          </div>
        </CardBody>
      </Card>

      {connected.length === 0 && (
        <p className="mt-4 flex items-center gap-2 text-xs text-ink-500">
          <Link2 className="h-3.5 w-3.5" /> No accounts connected yet.
        </p>
      )}
    </div>
  );
}
