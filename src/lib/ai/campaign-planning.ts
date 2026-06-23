import { generateJSON } from "@/lib/ai/anthropic";
import { ContentPlanSchema, VIDEO_STYLES, type ContentPlan } from "@/lib/ai/schemas";
import type { ProductBrief, BrandKitContext, PerformanceSummary, Platform } from "@/lib/types";

const PLANNER_SYSTEM = `You are a short-form content strategist building a multi-day posting plan
for a single product — one fresh video idea per day. The series must feel varied and
compounding, never repetitive.

Hard rules:
- No two CONSECUTIVE days share the same "style".
- Rotate hook types and angles across the whole window so day 1 and day 15 feel different.
- Each day must be independently shootable: a clear hook, angle, script outline, caption, CTA.
- Each "style" MUST be one of: ${VIDEO_STYLES.join(", ")}.
- Never fabricate claims, prices, or results not supported by the brief.
- Output ONLY a single JSON object matching the requested structure exactly.`;

interface PlanInput {
  brief: ProductBrief;
  days: number;
  platforms: Platform[];
  brandKit?: BrandKitContext | null;
  performance?: PerformanceSummary | null;
}

export async function planCampaign(input: PlanInput): Promise<ContentPlan> {
  const days = Math.max(1, Math.min(60, input.days));

  const brandBlock = input.brandKit
    ? `BRAND KIT:\n${JSON.stringify(input.brandKit, null, 2)}`
    : "BRAND KIT: (none — clean modern DTC voice)";
  const perfBlock = input.performance
    ? `ACCOUNT PERFORMANCE (bias toward winners, keep exploring):\n${JSON.stringify(input.performance, null, 2)}`
    : "";

  const user = `Build a ${days}-day posting plan (one video idea per day) for this product,
targeting: ${input.platforms.join(", ") || "tiktok, instagram"}.

PRODUCT BRIEF:
${JSON.stringify(input.brief, null, 2)}

${brandBlock}
${perfBlock}

Return JSON:
{
  "days": [
    {
      "day": number,                         // 1..${days}
      "angle": string,
      "hookText": string,
      "hookType": string,
      "style": one of the allowed styles,
      "scriptOutline": string,               // 2-4 sentences
      "caption": string,
      "cta": string,
      "hashtags": string[],
      "rationale": string                    // why this idea on this day
    }
  ]
}
Produce exactly ${days} day objects, ordered by day. Remember: no two consecutive days may
share the same style.`;

  const plan = await generateJSON({
    system: PLANNER_SYSTEM,
    user,
    schema: ContentPlanSchema,
    // Longer windows need more output room.
    maxTokens: days > 14 ? 16000 : 10000,
  });

  // Defensive: enforce the anti-repetition rule even if the model slips, by
  // nudging duplicates to a different allowed style. (Belt-and-suspenders.)
  for (let i = 1; i < plan.days.length; i++) {
    if (plan.days[i].style === plan.days[i - 1].style) {
      const alt = VIDEO_STYLES.find((s) => s !== plan.days[i - 1].style);
      if (alt) plan.days[i].style = alt;
    }
  }
  return plan;
}
