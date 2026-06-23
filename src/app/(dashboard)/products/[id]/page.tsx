import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, Wand2, Megaphone, AlertTriangle } from "lucide-react";
import { getSessionContext } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { BriefView } from "@/components/products/brief-view";
import { StrategyView } from "@/components/products/strategy-view";
import { RunActionButton, CampaignForm } from "@/components/products/actions";
import { humanize } from "@/lib/utils";
import type { Product, StrategyPack, CreativeTeardown } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("account_id", ctx.account.id)
    .maybeSingle();

  if (!product) notFound();
  const p = product as Product;

  const [{ data: packRow }, { data: teardownRow }] = await Promise.all([
    supabase
      .from("strategy_packs")
      .select("id, pack")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("creative_teardowns")
      .select("teardown")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const pack = (packRow?.pack ?? null) as StrategyPack | null;
  const teardown = (teardownRow?.teardown ?? null) as CreativeTeardown | null;
  const hasBrief = !!p.brief;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/products" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-100">
        <ArrowLeft className="h-4 w-4" /> Products
      </Link>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {humanize(p.source_type)}
            {p.source_url && (
              <>
                {" · "}
                <a href={p.source_url} target="_blank" rel="noreferrer" className="text-brand-300 hover:underline">
                  source
                </a>
              </>
            )}
          </p>
        </div>
        <Badge tone={statusTone(p.status)}>{humanize(p.status)}</Badge>
      </div>

      {/* Analysis state */}
      {!hasBrief && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-b from-brand-600/15 to-transparent p-8 text-center">
            <Sparkles className="mx-auto h-7 w-7 text-brand-300" />
            <h2 className="mt-3 text-lg font-semibold">Analyze this product with AI</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
              Claude will read {p.source_url ? "the page and any images" : "your inputs"} and build a
              conversion-focused brief: benefits, pain points, target customer, and the best
              selling angles.
            </p>
            {p.status === "failed" && p.error && (
              <p className="mx-auto mt-3 flex max-w-md items-center justify-center gap-1 text-sm text-red-300">
                <AlertTriangle className="h-4 w-4" /> {p.error}
              </p>
            )}
            <div className="mt-5 flex justify-center">
              <RunActionButton endpoint={`/api/products/${id}/analyze`} label="Analyze with AI" />
            </div>
          </div>
        </Card>
      )}

      {/* Brief */}
      {hasBrief && (
        <section className="space-y-6">
          <BriefView brief={p.brief!} teardown={teardown} />

          {/* Strategy */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-brand-300" />
              <h2 className="text-lg font-semibold">Ad strategy</h2>
            </div>
            {pack ? (
              <>
                <StrategyView pack={pack} />
                <div className="mt-3">
                  <RunActionButton
                    endpoint={`/api/products/${id}/strategy`}
                    label="Regenerate strategy"
                    variant="outline"
                    size="sm"
                  />
                </div>
              </>
            ) : (
              <Card>
                <CardBody className="flex flex-col items-center py-10 text-center">
                  <p className="max-w-md text-sm text-ink-400">
                    Generate a full strategy pack: 10 hooks, 5 angles, 3 scripts with storyboards,
                    captions, CTAs, style picks, and A/B tests.
                  </p>
                  <div className="mt-4">
                    <RunActionButton endpoint={`/api/products/${id}/strategy`} label="Generate strategy pack" />
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Campaign */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-brand-300" />
              <h2 className="text-lg font-semibold">Launch a campaign series</h2>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Post one fresh ad a day</CardTitle>
              </CardHeader>
              <CardBody>
                <CampaignForm productId={id} defaultName={`${p.name} — daily ads`} />
              </CardBody>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
