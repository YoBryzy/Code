import { z } from "zod";

/**
 * Zod schemas = the contract between Claude and our database. Every AI response
 * is parsed through one of these before it is persisted, so malformed or
 * prompt-injected output can never silently corrupt state.
 */

// ── Video styles the strategist may choose among ──────────────────────────────
export const VIDEO_STYLES = [
  "ugc",
  "problem_solution",
  "before_after",
  "product_showcase",
  "fast_paced_tiktok",
  "luxury",
  "direct_response",
  "testimonial",
  "faceless",
  "tiktok_made_me_buy_it",
  "three_reasons",
  "stop_scrolling",
  "problem_you_didnt_know",
] as const;
export const VideoStyle = z.enum(VIDEO_STYLES);

// ── Product Brief (extraction output) ─────────────────────────────────────────
export const ProductBriefSchema = z.object({
  name: z.string(),
  category: z.string(),
  oneLiner: z.string(),
  price: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  offer: z.string().nullable().optional(),
  benefits: z.array(z.string()).min(1),
  features: z.array(z.string()).default([]),
  painPoints: z.array(z.string()).default([]),
  targetCustomer: z.object({
    persona: z.string(),
    demographics: z.string(),
    psychographics: z.string(),
  }),
  sellingAngles: z.array(z.string()).min(1),
  objections: z.array(z.object({ objection: z.string(), counter: z.string() })).default([]),
  brandTone: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable().optional(),
});
export type ProductBrief = z.infer<typeof ProductBriefSchema>;

// ── Creative Teardown (analysis of a user-owned TikTok/Reel) ──────────────────
export const CreativeTeardownSchema = z.object({
  hook: z.string(),
  hookType: z.string(),
  pacing: z.string(),
  structure: z.array(z.string()).min(1),
  onScreenTextStyle: z.string(),
  productAngle: z.string(),
  cta: z.string(),
  whyItWorks: z.array(z.string()).min(1),
  replicableTactics: z.array(z.string()).min(1),
});
export type CreativeTeardown = z.infer<typeof CreativeTeardownSchema>;

// ── Strategy Pack (the core generation) ───────────────────────────────────────
export const StoryboardSceneSchema = z.object({
  sceneNo: z.number().int(),
  durationSec: z.number(),
  visual: z.string(),
  onScreenText: z.string().default(""),
  voiceover: z.string().default(""),
  broll: z.string().default(""),
  callout: z.string().default(""),
});

export const ScriptVariantSchema = z.object({
  title: z.string(),
  angle: z.string(),
  style: VideoStyle,
  durationSec: z.number(),
  voiceover: z.string(),
  onScreenText: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
  storyboard: z.array(StoryboardSceneSchema).min(2),
});
export type ScriptVariant = z.infer<typeof ScriptVariantSchema>;

export const StrategyPackSchema = z.object({
  hooks: z
    .array(z.object({ text: z.string(), style: z.string(), rationale: z.string() }))
    .min(8),
  angles: z
    .array(z.object({ name: z.string(), premise: z.string(), bestFor: z.string() }))
    .min(4),
  scripts: z.array(ScriptVariantSchema).min(3),
  captions: z.array(z.object({ text: z.string(), hashtags: z.array(z.string()).default([]) })).min(3),
  ctas: z.array(z.object({ text: z.string(), placement: z.string() })).min(3),
  styleOptions: z.array(z.object({ style: VideoStyle, why: z.string() })).min(3),
  recommended: z.object({
    scriptIndex: z.number().int(),
    styleOption: VideoStyle,
    reasoning: z.string(),
  }),
  abTests: z
    .array(
      z.object({
        hypothesis: z.string(),
        variantA: z.string(),
        variantB: z.string(),
        metric: z.string(),
      }),
    )
    .min(1),
});
export type StrategyPack = z.infer<typeof StrategyPackSchema>;

// ── Campaign content plan (N-day series) ──────────────────────────────────────
export const ContentPlanDaySchema = z.object({
  day: z.number().int(),
  angle: z.string(),
  hookText: z.string(),
  hookType: z.string(),
  style: VideoStyle,
  scriptOutline: z.string(),
  caption: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()).default([]),
  rationale: z.string(),
});
export type ContentPlanDay = z.infer<typeof ContentPlanDaySchema>;

export const ContentPlanSchema = z.object({
  days: z.array(ContentPlanDaySchema).min(1),
});
export type ContentPlan = z.infer<typeof ContentPlanSchema>;
