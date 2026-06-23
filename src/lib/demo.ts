/**
 * Seeded sample data for DEMO_MODE. Lets you click through the entire dashboard
 * UI with realistic content and no Supabase/Anthropic accounts. Server-only
 * (imported by the data layer + pages). Shapes mirror the real DB row types so
 * the same components render demo and live data identically.
 */
import type {
  Account,
  Product,
  StrategyPack,
  CreativeTeardown,
  Campaign,
  ContentPlanDay,
  Video,
  ScheduledPost,
  ConnectedAccount,
  BrandKit,
} from "@/lib/types";
import type { SessionContext } from "@/lib/account";

const now = Date.now();
const DAY = 86_400_000;
const iso = (offsetDays: number, hour = 18): string => {
  const d = new Date(now + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const DEMO_ACCOUNT_ID = "demo-account";

export const demoContext: SessionContext = {
  userId: "demo-user",
  email: "founder@glowdrip.co",
  account: {
    id: DEMO_ACCOUNT_ID,
    name: "GlowDrip (Demo)",
    plan: "growth",
    created_at: new Date(now - 30 * DAY).toISOString(),
  } satisfies Account,
};

export const demoBrandKit: BrandKit = {
  id: "demo-brand",
  account_id: DEMO_ACCOUNT_ID,
  name: "Default",
  brand_name: "GlowDrip",
  logo_url: null,
  primary_color: "#6366f1",
  secondary_color: "#22d3ee",
  accent_color: "#f59e0b",
  font_style: "Inter",
  tone_of_voice: "Playful, confident, no-fluff — talks like a friend who knows skincare",
  target_audience: "Women 22–40 into clean, results-driven beauty",
  cta_style: "Soft urgency — 'while it's still in stock'",
  caption_style: "Short, punchy, 2–3 emojis max",
  hashtags: ["skincare", "glowup", "vitaminc", "tiktokmademebuyit", "skintok"],
  default_platforms: ["tiktok", "instagram"],
  is_default: true,
  updated_at: new Date(now - 2 * DAY).toISOString(),
};

const glowdripBrief: Product["brief"] = {
  name: "GlowDrip Vitamin-C Serum",
  category: "Skincare / Serums",
  oneLiner: "A 15% vitamin-C serum that visibly brightens dull skin in two weeks.",
  price: "$39",
  currency: "USD",
  offer: "Buy 2, get 1 free + free shipping",
  benefits: [
    "Visibly brighter, more even skin tone in ~2 weeks",
    "Fades dark spots and post-acne marks",
    "Lightweight, non-sticky — layers under makeup",
    "Clean formula: vegan, cruelty-free, no parabens",
  ],
  features: ["15% stabilized vitamin C (THD ascorbate)", "Hyaluronic acid + vitamin E", "30ml airless pump"],
  painPoints: [
    "Skin looks dull and tired in photos",
    "Dark spots that makeup can't fully hide",
    "Burned by harsh vitamin-C serums that oxidize fast",
  ],
  targetCustomer: {
    persona: "Maya, 29 — busy professional rebuilding a simple, effective routine",
    demographics: "Women 22–40, US/UK/AU, mid-income, mobile-first shoppers",
    psychographics: "Wants visible results, distrusts overhyped claims, reads reviews before buying",
  },
  sellingAngles: [
    "The 2-week glow-up everyone notices",
    "Finally a vitamin C that doesn't sting or oxidize",
    "Fade dark spots without a 10-step routine",
    "The serum that makes your skin look filtered IRL",
    "Dermatologist-loved, TikTok-famous",
  ],
  objections: [
    { objection: "Vitamin C always breaks me out", counter: "Stabilized THD form is gentle — designed for sensitive skin" },
    { objection: "These never actually work", counter: "Before/after photos + 12,000 reviews at 4.8★" },
    { objection: "Too expensive", counter: "Buy 2 get 1 free works out to ~$26/bottle, cheaper than one facial" },
  ],
  brandTone: "Confident, friendly, results-first",
  confidence: 0.92,
  notes: "Strong before/after potential; lead with the brightness transformation.",
};

export const demoProducts: Product[] = [
  {
    id: "demo-product-1",
    account_id: DEMO_ACCOUNT_ID,
    source_type: "product_url",
    source_url: "https://glowdrip.co/products/vitamin-c-serum",
    name: "GlowDrip Vitamin-C Serum",
    status: "ready",
    brief: glowdripBrief,
    raw_extract: { title: "GlowDrip Vitamin-C Serum", price: "39", currency: "USD", images: [] },
    owns_rights: true,
    error: null,
    created_at: new Date(now - 6 * DAY).toISOString(),
    updated_at: new Date(now - 1 * DAY).toISOString(),
  },
  {
    id: "demo-product-2",
    account_id: DEMO_ACCOUNT_ID,
    source_type: "upload",
    source_url: null,
    name: "PosturePal Back Support",
    status: "ready",
    brief: {
      name: "PosturePal Back Support",
      category: "Wellness / Posture",
      oneLiner: "An adjustable brace that quietly fixes your slouch at your desk.",
      price: "$29",
      currency: "USD",
      offer: "30% off launch",
      benefits: ["Relieves desk-job back ache", "Trains better posture in weeks", "Discreet under clothing"],
      features: ["Breathable neoprene", "Adjustable figure-8 straps"],
      painPoints: ["Chronic upper-back pain", "Slouching on video calls"],
      targetCustomer: { persona: "Remote worker, 30–50", demographics: "Office/remote workers", psychographics: "Health-conscious, time-poor" },
      sellingAngles: ["Fix your WFH slouch", "The $29 fix for desk back pain"],
      objections: [{ objection: "Braces are uncomfortable", counter: "Breathable, wear-it-all-day design" }],
      brandTone: "Practical, reassuring",
      confidence: 0.81,
      notes: null,
    },
    raw_extract: null,
    owns_rights: true,
    error: null,
    created_at: new Date(now - 3 * DAY).toISOString(),
    updated_at: new Date(now - 3 * DAY).toISOString(),
  },
  {
    id: "demo-product-3",
    account_id: DEMO_ACCOUNT_ID,
    source_type: "tiktok",
    source_url: "https://www.tiktok.com/@creator/video/123",
    name: "AquaFlow Smart Bottle",
    status: "analyzing",
    brief: null,
    raw_extract: { caption: "this water bottle reminds me to drink 💧 #hydration" },
    owns_rights: true,
    error: null,
    created_at: new Date(now - 1 * DAY).toISOString(),
    updated_at: new Date(now - 1 * DAY).toISOString(),
  },
];

export const demoStrategyPack: StrategyPack = {
  hooks: [
    { text: "Stop scrolling if your skin looks dull in every photo", style: "stop_scrolling", rationale: "Calls out the exact insecurity in 1s" },
    { text: "POV: your skin finally looks filtered… without a filter", style: "POV", rationale: "Aspirational + relatable" },
    { text: "I tried this serum for 14 days and the dark spots are GONE", style: "before_after", rationale: "Time-bound proof" },
    { text: "3 reasons this $39 serum went viral", style: "three_reasons", rationale: "Listicle = high retention" },
    { text: "TikTok made me buy it and… okay it actually works", style: "tiktok_made_me_buy_it", rationale: "Social proof native to platform" },
    { text: "The vitamin C that doesn't sting or turn orange", style: "problem_solution", rationale: "Kills the #1 objection up front" },
    { text: "Estheticians are quietly recommending this one", style: "authority", rationale: "Borrowed credibility" },
    { text: "Your makeup looks cakey because you skipped this step", style: "problem_you_didnt_know", rationale: "Reframes a hidden problem" },
    { text: "Watch my dark spots fade in real time", style: "before_after", rationale: "Visual payoff" },
    { text: "If your skincare shelf is chaos, watch this", style: "ugc", rationale: "Simplicity angle" },
  ],
  angles: [
    { name: "The 2-week glow-up", premise: "Visible brightness fast", bestFor: "Cold audiences, before/after" },
    { name: "No-sting vitamin C", premise: "Gentle, stable formula", bestFor: "Skeptics burned before" },
    { name: "Fade dark spots", premise: "Targets hyperpigmentation", bestFor: "Specific concern buyers" },
    { name: "Filtered skin IRL", premise: "Photo-ready confidence", bestFor: "Younger, social audiences" },
    { name: "Dermatologist-approved + viral", premise: "Authority meets trend", bestFor: "Trust-driven buyers" },
  ],
  scripts: [
    {
      title: "14-Day Brightness Test (UGC)",
      angle: "The 2-week glow-up",
      style: "before_after",
      durationSec: 24,
      voiceover:
        "I documented 14 days with this vitamin-C serum. Day 1 — dull and uneven. I used two drops every morning. By day 7 my dark spots started fading. Day 14? My skin looks brighter than it has in years. Link's in my bio while the buy-2-get-1 is live.",
      onScreenText: ["Day 1: dull skin 😞", "2 drops every AM", "Day 7: spots fading", "Day 14: GLOW ✨", "Buy 2 Get 1 Free"],
      hashtags: ["skincare", "vitaminc", "glowup", "skintok"],
      storyboard: [
        { sceneNo: 1, durationSec: 2, visual: "Close-up bare face, no makeup, soft light", onScreenText: "Day 1: dull skin 😞", voiceover: "I documented 14 days…", broll: "", callout: "Hook: pattern interrupt" },
        { sceneNo: 2, durationSec: 6, visual: "Hand applying 2 drops, pump product shot", onScreenText: "2 drops every AM", voiceover: "Two drops every morning…", broll: "product macro", callout: "Show the product" },
        { sceneNo: 3, durationSec: 10, visual: "Split screen day 7 vs day 1", onScreenText: "Day 7: spots fading", voiceover: "By day seven…", broll: "", callout: "Proof" },
        { sceneNo: 4, durationSec: 6, visual: "Glowing face in daylight, smiling", onScreenText: "Day 14: GLOW ✨ — Buy 2 Get 1 Free", voiceover: "Day 14? Brighter than ever. Link in bio.", broll: "", callout: "CTA end card" },
      ],
    },
    {
      title: "Why It Doesn't Sting (Problem → Solution)",
      angle: "No-sting vitamin C",
      style: "problem_solution",
      durationSec: 21,
      voiceover:
        "If vitamin C has ever stung your face or turned orange in the bottle, here's why — most use cheap L-ascorbic acid that oxidizes fast. This one uses a stabilized form that's gentle enough for sensitive skin and actually stays potent. That's why it works.",
      onScreenText: ["Vitamin C stings? Here's why", "Cheap formulas oxidize ⚠️", "Stabilized = gentle + potent", "Made for sensitive skin"],
      hashtags: ["skintok", "sensitiveskin", "vitaminc"],
      storyboard: [
        { sceneNo: 1, durationSec: 2, visual: "Person wincing, hand on cheek", onScreenText: "Vitamin C stings? Here's why", voiceover: "If vitamin C has ever stung…", broll: "", callout: "Hook" },
        { sceneNo: 2, durationSec: 7, visual: "Oxidized orange serum vs fresh", onScreenText: "Cheap formulas oxidize ⚠️", voiceover: "Most use cheap L-ascorbic acid…", broll: "comparison", callout: "Educate" },
        { sceneNo: 3, durationSec: 7, visual: "Product hero with ingredient callout", onScreenText: "Stabilized = gentle + potent", voiceover: "This one uses a stabilized form…", broll: "macro", callout: "Solution" },
        { sceneNo: 4, durationSec: 5, visual: "Apply + glowing result", onScreenText: "Made for sensitive skin", voiceover: "That's why it works.", broll: "", callout: "CTA" },
      ],
    },
    {
      title: "3 Reasons It Went Viral (Fast TikTok)",
      angle: "Dermatologist-approved + viral",
      style: "three_reasons",
      durationSec: 18,
      voiceover:
        "Three reasons this serum is everywhere right now. One — visible brightness in two weeks, not two months. Two — it's gentle enough for sensitive skin. Three — buy two, get one free. That's why it keeps selling out.",
      onScreenText: ["3 reasons it went viral", "1. Glow in 2 weeks", "2. No sting", "3. Buy 2 Get 1 Free"],
      hashtags: ["tiktokmademebuyit", "skincare", "viral"],
      storyboard: [
        { sceneNo: 1, durationSec: 2, visual: "Fast zoom on product, bold text", onScreenText: "3 reasons it went viral", voiceover: "Three reasons this serum is everywhere…", broll: "", callout: "Hook" },
        { sceneNo: 2, durationSec: 5, visual: "Before/after flash", onScreenText: "1. Glow in 2 weeks", voiceover: "Visible brightness in two weeks…", broll: "", callout: "Reason 1" },
        { sceneNo: 3, durationSec: 5, visual: "Drop on sensitive skin", onScreenText: "2. No sting", voiceover: "Gentle enough for sensitive skin…", broll: "", callout: "Reason 2" },
        { sceneNo: 4, durationSec: 6, visual: "Three bottles, offer sticker", onScreenText: "3. Buy 2 Get 1 Free", voiceover: "Buy two, get one free. It keeps selling out.", broll: "", callout: "CTA" },
      ],
    },
  ],
  captions: [
    { text: "14 days. Two drops a day. The glow is unreal ✨ (buy 2 get 1 is still live)", hashtags: ["skincare", "vitaminc", "glowup"] },
    { text: "POV: you found the vitamin C that doesn't sting 🫶", hashtags: ["skintok", "sensitiveskin"] },
    { text: "the serum that made my skin look filtered irl 📸", hashtags: ["tiktokmademebuyit", "skincare"] },
  ],
  ctas: [
    { text: "Tap the link before the buy-2-get-1 ends", placement: "End card + caption" },
    { text: "Comment GLOW and I'll send the link", placement: "Mid-video + pinned comment" },
    { text: "Shop it in my bio", placement: "End card" },
  ],
  styleOptions: [
    { style: "before_after", why: "The transformation is the product's strongest proof" },
    { style: "ugc", why: "Authentic talking-to-camera converts cold skincare audiences" },
    { style: "three_reasons", why: "High retention, easy to batch many variants" },
  ],
  recommended: {
    scriptIndex: 0,
    styleOption: "before_after",
    reasoning: "Brightness is a visual, time-bound result — a 14-day before/after maximizes proof and retention, and the offer lands naturally on the end card.",
  },
  abTests: [
    { hypothesis: "Time-bound hooks beat curiosity hooks", variantA: "I tried this for 14 days…", variantB: "3 reasons this went viral", metric: "3s retention" },
    { hypothesis: "Offer in hook lifts CTR", variantA: "Offer only on end card", variantB: "Offer in first 2s", metric: "link CTR" },
  ],
};

export const demoTeardown: CreativeTeardown | null = null;

export const demoCampaign: Campaign = {
  id: "demo-campaign-1",
  account_id: DEMO_ACCOUNT_ID,
  product_id: "demo-product-1",
  name: "GlowDrip Serum — daily ads",
  platforms: ["tiktok", "instagram"],
  cadence: "daily",
  autopilot: true,
  status: "active",
  starts_on: new Date(now - 2 * DAY).toISOString().slice(0, 10),
  days_total: 30,
  created_at: new Date(now - 2 * DAY).toISOString(),
};

const planDay = (
  day: number,
  style: ContentPlanDay["style"],
  hookText: string,
  angle: string,
  hookType: string,
  outline: string,
): { id: string; day_index: number; plan: ContentPlanDay; status: string } => ({
  id: `demo-day-${day}`,
  day_index: day,
  status: day <= 2 ? "scheduled" : "planned",
  plan: {
    day,
    angle,
    hookText,
    hookType,
    style,
    scriptOutline: outline,
    caption: "the glow is unreal ✨ link in bio",
    cta: "Tap the link before the buy-2-get-1 ends",
    hashtags: ["skincare", "vitaminc", "glowup"],
    rationale: "Rotates angle + style to keep the series fresh and avoid fatigue.",
  },
});

export const demoContentDays = [
  planDay(1, "before_after", "I tried this serum for 14 days and the dark spots are GONE", "The 2-week glow-up", "before/after", "Document a 14-day brightness test with split-screen proof."),
  planDay(2, "stop_scrolling", "Stop scrolling if your skin looks dull in every photo", "Filtered skin IRL", "stop scrolling", "Call out dull-in-photos, reveal the serum as the fix."),
  planDay(3, "three_reasons", "3 reasons this $39 serum went viral", "Derm-approved + viral", "3 reasons", "Listicle: glow speed, no sting, the offer."),
  planDay(4, "problem_solution", "The vitamin C that doesn't sting or turn orange", "No-sting vitamin C", "problem/solution", "Explain oxidation, position stabilized formula."),
  planDay(5, "tiktok_made_me_buy_it", "TikTok made me buy it and okay it actually works", "Filtered skin IRL", "tiktok made me buy it", "Unboxing + first impression + 1-week update."),
  planDay(6, "testimonial", "Estheticians are quietly recommending this one", "Derm-approved + viral", "authority", "Creator relays expert recommendation + demo."),
  planDay(7, "product_showcase", "Watch my dark spots fade in real time", "Fade dark spots", "demo", "Macro product + timelapse-style result montage."),
  planDay(8, "ugc", "If your skincare shelf is chaos, watch this", "The 2-week glow-up", "ugc", "Simplicity angle: replace 3 products with one step."),
];

export const demoVideos: Video[] = [
  { id: "demo-video-1", account_id: DEMO_ACCOUNT_ID, title: "14-Day Brightness Test", status: "ready", duration_sec: 24, storage_path: null, thumbnail_path: null, created_at: new Date(now - 1 * DAY).toISOString() },
  { id: "demo-video-2", account_id: DEMO_ACCOUNT_ID, title: "Why It Doesn't Sting", status: "ready", duration_sec: 21, storage_path: null, thumbnail_path: null, created_at: new Date(now - 1 * DAY).toISOString() },
  { id: "demo-video-3", account_id: DEMO_ACCOUNT_ID, title: "3 Reasons It Went Viral", status: "rendering", duration_sec: 18, storage_path: null, thumbnail_path: null, created_at: new Date(now).toISOString() },
  { id: "demo-video-4", account_id: DEMO_ACCOUNT_ID, title: "Fade Dark Spots Demo", status: "draft", duration_sec: 22, storage_path: null, thumbnail_path: null, created_at: new Date(now).toISOString() },
];

export const demoScheduledPosts: ScheduledPost[] = [
  { id: "demo-post-1", video_id: "demo-video-1", platform: "tiktok", scheduled_for: iso(0, 18) as string, caption: "14 days. two drops a day. the glow is unreal ✨", status: "scheduled", created_at: new Date(now - DAY).toISOString() },
  { id: "demo-post-2", video_id: "demo-video-2", platform: "instagram", scheduled_for: iso(0, 20) as string, caption: "POV: vitamin C that doesn't sting 🫶", status: "pending_review", created_at: new Date(now - DAY).toISOString() },
  { id: "demo-post-3", video_id: "demo-video-3", platform: "tiktok", scheduled_for: iso(1, 18) as string, caption: "3 reasons it went viral 👀", status: "pending_review", created_at: new Date(now).toISOString() },
  { id: "demo-post-4", video_id: "demo-video-1", platform: "instagram", scheduled_for: iso(-1, 18) as string, caption: "the serum that made my skin look filtered irl 📸", status: "published", created_at: new Date(now - 2 * DAY).toISOString() },
  { id: "demo-post-5", video_id: "demo-video-2", platform: "tiktok", scheduled_for: iso(2, 18) as string, caption: "your makeup looks cakey because you skipped this", status: "scheduled", created_at: new Date(now).toISOString() },
];

export const demoConnectedAccounts: ConnectedAccount[] = [
  { id: "demo-conn-1", platform: "tiktok", username: "glowdrip", display_name: "GlowDrip", status: "active", created_at: new Date(now - 5 * DAY).toISOString() },
];

export const demoMetricsRows = [
  { views: 48210, likes: 6120, comments: 312, shares: 540, saves: 1890 },
  { views: 23110, likes: 2980, comments: 144, shares: 221, saves: 870 },
  { views: 91500, likes: 12400, comments: 720, shares: 1320, saves: 4300 },
];

export const demoCounts = {
  products: demoProducts.length,
  videos: demoVideos.length,
  scheduled: demoScheduledPosts.length,
  campaigns: 1,
};
