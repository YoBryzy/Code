import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionContext } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { planCampaign } from "@/lib/ai/campaign-planning";
import { getBrandContext } from "@/lib/brand";
import type { Product, Platform } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // multi-day plan generation

const Body = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1).max(120),
  days: z.number().int().min(1).max(60),
  platforms: z.array(z.enum(["tiktok", "instagram", "youtube"])).min(1),
});

function isoDatePlusDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  let ctx;
  try {
    ctx = await requireSessionContext();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const { productId, name, days, platforms } = parsed.data;

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("account_id", ctx.account.id)
    .maybeSingle();

  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const p = product as Product;
  if (!p.brief) return NextResponse.json({ error: "Analyze the product first." }, { status: 400 });

  try {
    const brandKit = await getBrandContext(ctx.account.id);
    const plan = await planCampaign({
      brief: p.brief,
      days,
      platforms: platforms as Platform[],
      brandKit,
    });

    const startsOn = new Date();
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .insert({
        account_id: ctx.account.id,
        product_id: productId,
        name,
        platforms,
        days_total: days,
        status: "draft",
        starts_on: startsOn.toISOString().slice(0, 10),
      })
      .select("id")
      .single();

    if (campErr || !campaign) throw new Error(campErr?.message ?? "Could not create the campaign.");

    const items = plan.days.map((d) => ({
      account_id: ctx.account.id,
      campaign_id: campaign.id,
      day_index: d.day,
      scheduled_date: isoDatePlusDays(startsOn, d.day - 1),
      plan: d,
      status: "planned" as const,
    }));
    const { error: itemsErr } = await supabase.from("content_plan_items").insert(items);
    if (itemsErr) throw new Error(itemsErr.message);

    await supabase.from("usage_events").insert({
      account_id: ctx.account.id,
      kind: "campaign_plan",
      quantity: days,
    });

    return NextResponse.json({ id: campaign.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Campaign planning failed." },
      { status: 500 },
    );
  }
}
