import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProductBrief, CreativeTeardown } from "@/lib/types";

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm text-ink-300">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
          {t}
        </li>
      ))}
    </ul>
  );
}

export function BriefView({
  brief,
  teardown,
}: {
  brief: ProductBrief;
  teardown?: CreativeTeardown | null;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Product brief</CardTitle>
          <Badge tone="brand">{Math.round((brief.confidence ?? 0) * 100)}% confidence</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <p className="text-base font-medium">{brief.name}</p>
            <p className="text-sm text-ink-400">{brief.oneLiner}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{brief.category}</Badge>
              {brief.price && <Badge tone="green">{brief.price}{brief.currency ? ` ${brief.currency}` : ""}</Badge>}
              {brief.offer && <Badge tone="amber">{brief.offer}</Badge>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Benefits</p>
            <List items={brief.benefits} />
          </div>
          {brief.painPoints.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Pain points</p>
              <List items={brief.painPoints} />
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audience & angles</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-sm font-medium">{brief.targetCustomer.persona}</p>
            <p className="mt-1 text-xs text-ink-400">{brief.targetCustomer.demographics}</p>
            <p className="mt-1 text-xs text-ink-400">{brief.targetCustomer.psychographics}</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Selling angles</p>
            <List items={brief.sellingAngles} />
          </div>
          {brief.objections.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Objections → counters</p>
              <div className="space-y-2">
                {brief.objections.map((o, i) => (
                  <div key={i} className="text-sm">
                    <span className="text-ink-300">{o.objection}</span>
                    <span className="text-ink-500"> → </span>
                    <span className="text-emerald-300">{o.counter}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {teardown && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Creative teardown — why the source video works</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm">
              <p><span className="text-ink-500">Hook ({teardown.hookType}):</span> {teardown.hook}</p>
              <p><span className="text-ink-500">Pacing:</span> {teardown.pacing}</p>
              <p><span className="text-ink-500">On-screen text:</span> {teardown.onScreenTextStyle}</p>
              <p><span className="text-ink-500">Product angle:</span> {teardown.productAngle}</p>
              <p><span className="text-ink-500">CTA:</span> {teardown.cta}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Replicable tactics</p>
              <List items={teardown.replicableTactics} />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
