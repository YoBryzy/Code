import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionContext } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { extractFromUrl } from "@/lib/extract/url";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // scraping a product page can take a few seconds

const Body = z.object({
  sourceType: z.enum(["product_url", "tiktok", "reel", "upload", "manual"]),
  sourceUrl: z.string().url().nullable().optional(),
  name: z.string().nullable().optional(),
  manualNotes: z.string().nullable().optional(),
  ownsRights: z.boolean().optional(),
});

export async function POST(req: Request) {
  let ctx;
  try {
    ctx = await requireSessionContext();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { sourceType, sourceUrl, name, manualNotes, ownsRights } = parsed.data;

  // Scrape product pages up front so the extract is ready before analysis.
  let rawExtract: Record<string, unknown> | null = null;
  let resolvedName = name?.trim() || null;
  if (sourceType === "product_url" && sourceUrl) {
    const page = await extractFromUrl(sourceUrl);
    rawExtract = page as unknown as Record<string, unknown>;
    if (!resolvedName && page.title) resolvedName = page.title.slice(0, 120);
  } else if ((sourceType === "tiktok" || sourceType === "reel") && manualNotes) {
    rawExtract = { caption: manualNotes };
  } else if (sourceType === "manual" && manualNotes) {
    rawExtract = { notes: manualNotes };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      account_id: ctx.account.id,
      source_type: sourceType,
      source_url: sourceUrl ?? null,
      name: resolvedName || "Untitled product",
      status: "pending",
      raw_extract: rawExtract,
      owns_rights: ownsRights ?? false,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create the product." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id, accountId: ctx.account.id });
}
