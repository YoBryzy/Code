import { NextResponse } from "next/server";
import { requireSessionContext } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { analyzeProduct, teardownVideo } from "@/lib/ai/product-analysis";
import type { ImageInput } from "@/lib/ai/anthropic";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Opus analysis with vision can take a while

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

  await supabase.from("products").update({ status: "analyzing", error: null }).eq("id", id);

  try {
    // Collect images for vision: scraped URLs + signed URLs for uploaded assets.
    const images: ImageInput[] = [];
    const extract = (p.raw_extract ?? {}) as { images?: string[]; caption?: string; notes?: string };
    for (const url of extract.images ?? []) images.push({ url });

    const { data: assets } = await supabase
      .from("product_assets")
      .select("storage_path, kind")
      .eq("product_id", id)
      .eq("kind", "image")
      .limit(6);

    for (const a of assets ?? []) {
      const { data: signed } = await supabase.storage
        .from("product-assets")
        .createSignedUrl(a.storage_path, 600);
      if (signed?.signedUrl) images.push({ url: signed.signedUrl });
    }

    const brief = await analyzeProduct({
      name: p.name,
      sourceType: p.source_type,
      sourceUrl: p.source_url,
      extract: p.raw_extract,
      images: images.slice(0, 6),
      manualNotes: extract.notes ?? extract.caption,
    });

    // For user-owned social sources, also produce a creative teardown.
    if ((p.source_type === "tiktok" || p.source_type === "reel") && p.owns_rights) {
      try {
        const teardown = await teardownVideo({
          sourceUrl: p.source_url,
          caption: extract.caption ?? null,
          platform: p.source_type === "tiktok" ? "tiktok" : "reel",
        });
        await supabase.from("creative_teardowns").insert({
          account_id: ctx.account.id,
          product_id: id,
          source_caption: extract.caption ?? null,
          teardown,
        });
      } catch {
        // Teardown is best-effort; don't fail the whole analysis if it slips.
      }
    }

    await supabase
      .from("products")
      .update({ brief, status: "ready", error: null })
      .eq("id", id);

    await supabase.from("usage_events").insert({
      account_id: ctx.account.id,
      kind: "analysis",
      quantity: 1,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    await supabase.from("products").update({ status: "failed", error: message }).eq("id", id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
