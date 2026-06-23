import { NextResponse } from "next/server";
import { requireSessionContext } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { generateStrategyPack } from "@/lib/ai/ad-generation";
import { getBrandContext } from "@/lib/brand";
import { serverEnv } from "@/lib/env";
import type { Product, CreativeTeardown } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // strategy packs are large generations

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let ctx;
  try {
    ctx = await requireSessionContext();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("account_id", ctx.account.id)
    .maybeSingle();

  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const p = product as Product;
  if (!p.brief) {
    return NextResponse.json({ error: "Analyze the product before generating strategy." }, { status: 400 });
  }

  try {
    const [brandKit, teardownRow] = await Promise.all([
      getBrandContext(ctx.account.id),
      supabase
        .from("creative_teardowns")
        .select("teardown")
        .eq("product_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const pack = await generateStrategyPack({
      brief: p.brief,
      brandKit,
      teardown: (teardownRow.data?.teardown ?? null) as CreativeTeardown | null,
    });

    const { data, error } = await supabase
      .from("strategy_packs")
      .insert({
        account_id: ctx.account.id,
        product_id: id,
        pack,
        model: serverEnv.anthropicModel,
        created_by: ctx.userId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await supabase.from("usage_events").insert({
      account_id: ctx.account.id,
      kind: "strategy",
      quantity: 1,
    });

    return NextResponse.json({ id: data.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Strategy generation failed." },
      { status: 500 },
    );
  }
}
