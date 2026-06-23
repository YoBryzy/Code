import { generateJSON } from "@/lib/ai/anthropic";
import { StrategyPackSchema, VIDEO_STYLES, type StrategyPack } from "@/lib/ai/schemas";
import type {
  ProductBrief,
  CreativeTeardown,
  BrandKitContext,
  PerformanceSummary,
} from "@/lib/types";

const STRATEGIST_SYSTEM = `You are an elite short-form video ads strategist who has scaled DTC and
ecommerce brands on TikTok, Instagram Reels, and YouTube Shorts. You think in hooks, angles,
retention, and conversion. You know that the first 1-2 seconds decide everything.

For every product you produce a complete, ready-to-shoot strategy pack: many hook options,
distinct angles, full scripts with scene-by-scene storyboards, captions, CTAs, and concrete
style recommendations. You write hooks that stop the scroll and scripts that sell without
feeling like ads.

Hard rules:
- Front-load the hook: scene 1 of every storyboard delivers the hook with on-screen text in
  the first 1-2 seconds.
- Each script's "style" MUST be one of: ${VIDEO_STYLES.join(", ")}.
- Make the 3 scripts genuinely different (different angle AND different style).
- Never fabricate claims, statistics, prices, testimonials, or results not supported by the
  brief. Keep it punchy but honest.
- Match the brand voice and audience provided.
- Output ONLY a single JSON object matching the requested structure exactly.`;

interface StrategyInput {
  brief: ProductBrief;
  brandKit?: BrandKitContext | null;
  teardown?: CreativeTeardown | null;
  performance?: PerformanceSummary | null;
}

export async function generateStrategyPack(input: StrategyInput): Promise<StrategyPack> {
  const brandBlock = input.brandKit
    ? `BRAND KIT:
${JSON.stringify(input.brandKit, null, 2)}`
    : "BRAND KIT: (none — use a clean, modern, trustworthy DTC voice)";

  const teardownBlock = input.teardown
    ? `WINNING-VIDEO TEARDOWN (apply these transferable tactics to THIS product):
${JSON.stringify(input.teardown, null, 2)}`
    : "";

  const perfBlock = input.performance
    ? `ACCOUNT PERFORMANCE SO FAR (bias toward what works, but keep exploring new ideas):
${JSON.stringify(input.performance, null, 2)}`
    : "";

  const user = `Create a full short-form ad STRATEGY PACK for this product.

PRODUCT BRIEF:
${JSON.stringify(input.brief, null, 2)}

${brandBlock}
${teardownBlock}
${perfBlock}

Return a JSON object with exactly these keys:
{
  "hooks":  [{ "text": string, "style": string, "rationale": string }],   // EXACTLY 10, varied
  "angles": [{ "name": string, "premise": string, "bestFor": string }],   // EXACTLY 5
  "scripts": [                                                              // EXACTLY 3, distinct
    {
      "title": string,
      "angle": string,
      "style": one of the allowed styles,
      "durationSec": number,                 // 15-40
      "voiceover": string,                    // full VO script
      "onScreenText": string[],               // the on-screen captions in order
      "hashtags": string[],
      "storyboard": [                          // 4-8 scenes; scene 1 is the hook
        { "sceneNo": number, "durationSec": number, "visual": string,
          "onScreenText": string, "voiceover": string, "broll": string, "callout": string }
      ]
    }
  ],
  "captions": [{ "text": string, "hashtags": string[] }],                  // EXACTLY 3
  "ctas": [{ "text": string, "placement": string }],                       // EXACTLY 3
  "styleOptions": [{ "style": one of the allowed styles, "why": string }], // EXACTLY 3
  "recommended": { "scriptIndex": number, "styleOption": one of the allowed styles, "reasoning": string },
  "abTests": [{ "hypothesis": string, "variantA": string, "variantB": string, "metric": string }]
}`;

  return generateJSON({
    system: STRATEGIST_SYSTEM,
    user,
    schema: StrategyPackSchema,
    // Strategy packs are large; give Claude room. The TS SDK extends its timeout
    // for large max_tokens on non-streaming requests.
    maxTokens: 16000,
  });
}
