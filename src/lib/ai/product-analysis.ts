import { generateJSON, type ImageInput } from "@/lib/ai/anthropic";
import {
  ProductBriefSchema,
  CreativeTeardownSchema,
  type ProductBrief,
  type CreativeTeardown,
} from "@/lib/ai/schemas";
import type { SourceType } from "@/lib/types";

interface AnalyzeProductInput {
  name?: string;
  sourceType: SourceType;
  sourceUrl?: string | null;
  /** Scraped page data: title, description, price, brand, etc. */
  extract?: Record<string, unknown> | null;
  /** Up to ~6 product images for Claude vision. */
  images?: ImageInput[];
  /** Free-text the user typed when adding the product manually. */
  manualNotes?: string;
}

const ANALYST_SYSTEM = `You are a senior direct-to-consumer (DTC) product researcher and short-form ads strategist.
Your job: turn raw product information into a precise, conversion-focused brief that an ad
team can act on immediately.

Rules:
- Be specific and concrete. Prefer outcome-focused benefits ("fall asleep 2x faster") over
  feature lists ("contains magnesium").
- Identify the real customer and the emotional + practical pain points the product resolves.
- Surface the strongest selling ANGLES (the strategic stories an ad could tell), not just facts.
- If product images are provided, describe what you actually see (form factor, packaging,
  use context) and let it inform the brief.
- NEVER fabricate medical, financial, or earnings claims, statistics, prices, or reviews that
  are not supported by the provided information. If unknown, leave the field null.
- Output ONLY a single JSON object matching the requested structure.`;

export async function analyzeProduct(input: AnalyzeProductInput): Promise<ProductBrief> {
  const ctx = {
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl ?? null,
    providedName: input.name ?? null,
    scrapedData: input.extract ?? null,
    manualNotes: input.manualNotes ?? null,
  };

  const user = `Analyze this product and produce a Product Brief.

CONTEXT (JSON):
${JSON.stringify(ctx, null, 2)}

${input.images?.length ? `There ${input.images.length === 1 ? "is 1 product image" : `are ${input.images.length} product images`} attached — use vision to read them.` : "No product images were provided; work from the text context."}

Return a JSON object with exactly these keys:
{
  "name": string,
  "category": string,
  "oneLiner": string,                         // a crisp positioning line
  "price": string | null,
  "currency": string | null,
  "offer": string | null,                     // e.g. "Buy 2 get 1 free"
  "benefits": string[],                       // outcome-focused, most compelling first
  "features": string[],
  "painPoints": string[],                     // problems the buyer feels
  "targetCustomer": { "persona": string, "demographics": string, "psychographics": string },
  "sellingAngles": string[],                  // 4-6 strategic angles to attack
  "objections": [{ "objection": string, "counter": string }],
  "brandTone": string | null,
  "confidence": number,                       // 0..1 — how confident given the inputs
  "notes": string | null
}`;

  return generateJSON({
    system: ANALYST_SYSTEM,
    user,
    schema: ProductBriefSchema,
    images: input.images,
    maxTokens: 6000,
  });
}

const TEARDOWN_SYSTEM = `You are a viral short-form video analyst. You break down WHY a piece of
short-form content works at a structural level — hook, pacing, on-screen text, CTA — so the
underlying tactics can be reapplied to a different product.

You analyze STRUCTURE and TECHNIQUE only. You do not reproduce, transcribe verbatim, or
encourage copying the original creator's footage, audio, or likeness. The user has confirmed
they own or have the rights to the content they are studying.

Output ONLY a single JSON object matching the requested structure.`;

export async function teardownVideo(opts: {
  sourceUrl?: string | null;
  caption?: string | null;
  platform: "tiktok" | "reel";
}): Promise<CreativeTeardown> {
  const user = `Break down this ${opts.platform === "tiktok" ? "TikTok" : "Instagram Reel"} the user owns.

SOURCE URL: ${opts.sourceUrl ?? "(not provided)"}
CAPTION / DESCRIPTION PROVIDED BY USER:
"""
${opts.caption ?? "(none provided)"}
"""

Infer the likely creative structure from the caption, the platform's conventions, and what
makes this format perform. Return JSON:
{
  "hook": string,                    // the opening line/idea
  "hookType": string,                // e.g. "Stop scrolling", "POV", "3 reasons", "before/after"
  "pacing": string,                  // cut rhythm + energy
  "structure": string[],             // beat-by-beat
  "onScreenTextStyle": string,
  "productAngle": string,
  "cta": string,
  "whyItWorks": string[],            // transferable principles
  "replicableTactics": string[]      // concrete tactics to reuse for a new product
}`;

  return generateJSON({
    system: TEARDOWN_SYSTEM,
    user,
    schema: CreativeTeardownSchema,
    maxTokens: 4000,
  });
}
