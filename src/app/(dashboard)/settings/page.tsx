import { getSessionContext } from "@/lib/account";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Workspace, plan, and billing." />

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Workspace</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm">
            <Row label="Name" value={ctx.account.name} />
            <Row label="Signed in as" value={ctx.email ?? "—"} />
            <Row label="Workspace ID" value={<code className="text-xs">{ctx.account.id}</code>} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Plan & billing</CardTitle>
            <Badge tone="brand">{humanize(ctx.account.plan)}</Badge>
          </CardHeader>
          <CardBody className="text-sm text-ink-400">
            <p>
              Billing is powered by Stripe. Configure <code>STRIPE_SECRET_KEY</code> and price IDs,
              then wire the checkout + customer portal. Usage (videos generated, posts scheduled)
              is metered via the <code>usage_events</code> table.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Danger zone</CardTitle></CardHeader>
          <CardBody className="text-sm text-ink-400">
            <p>Deleting the workspace removes all products, videos, and schedules. (Wire to a confirmed server action.)</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-1.5 last:border-0">
      <span className="text-ink-500">{label}</span>
      <span className="text-ink-200">{value}</span>
    </div>
  );
}
