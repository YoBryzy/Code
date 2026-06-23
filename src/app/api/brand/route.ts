import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionContext } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Body = z.object({
  brand_name: z.string().optional().default(""),
  tone_of_voice: z.string().optional().default(""),
  target_audience: z.string().optional().default(""),
  cta_style: z.string().optional().default(""),
  caption_style: z.string().optional().default(""),
  primary_color: z.string().optional().default(""),
  hashtags: z.array(z.string()).optional().default([]),
});

export async function POST(req: Request) {
  let ctx;
  try {
    ctx = await requireSessionContext();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const b = parsed.data;

  const supabase = await createClient();
  const fields = {
    account_id: ctx.account.id,
    name: "Default",
    is_default: true,
    brand_name: b.brand_name || null,
    tone_of_voice: b.tone_of_voice || null,
    target_audience: b.target_audience || null,
    cta_style: b.cta_style || null,
    caption_style: b.caption_style || null,
    primary_color: b.primary_color || null,
    hashtags: b.hashtags,
  };

  // Upsert the single default brand kit for this account.
  const { data: existing } = await supabase
    .from("brand_kits")
    .select("id")
    .eq("account_id", ctx.account.id)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("brand_kits").update(fields).eq("id", existing.id)
    : await supabase.from("brand_kits").insert(fields);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
