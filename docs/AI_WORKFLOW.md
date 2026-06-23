# AdMagic — AI Workflow

The AI is the product. This document specifies exactly what the model does, the prompts and
output contracts, and how quality + safety are enforced. Implemented in
`src/lib/ai/*`.

Model: **`claude-opus-4-8`** (configurable via `ANTHROPIC_MODEL`). Adaptive thinking is
enabled for the reasoning-heavy steps (analysis, strategy, campaign planning). All outputs
are **strict JSON** validated with **Zod** before persistence; on a validation miss we
re-ask once with the validation error appended, then surface a clean error.

---

## 1. Steps overview

| Step | Input | Output | File |
| --- | --- | --- | --- |
| Product analysis | scraped page data and/or product images (vision) | `ProductBrief` | `product-analysis.ts` |
| Creative teardown | user-owned TikTok/Reel caption + optional clip | `CreativeTeardown` | `product-analysis.ts` |
| Strategy pack | `ProductBrief` + `BrandKit` | `StrategyPack` | `ad-generation.ts` |
| Campaign plan | `ProductBrief` + `BrandKit` + N days | `ContentPlan` | `campaign-planning.ts` |

Schemas live in `src/lib/ai/schemas.ts`; the Anthropic client + the strict-JSON helper live
in `src/lib/ai/anthropic.ts`.

---

## 2. Product Brief (extraction)

The model acts as a **DTC product researcher**. It receives whatever we could gather (page
title, description, price, Open Graph/JSON-LD fields, and up to ~6 product images passed as
vision blocks) and returns:

```
ProductBrief {
  name, category, oneLiner,
  price?, currency?, offer?,           // e.g. "50% off + free shipping"
  benefits[],                          // outcome-focused, not features
  features[],
  painPoints[],                        // problems the product solves
  targetCustomer { persona, demographics, psychographics },
  sellingAngles[],                     // the strategic angles to attack
  objections[],                        // and how to counter them
  brandTone?, confidence (0-1), notes?
}
```

Vision matters: passing the actual product photos lets Claude describe what it *sees*
(form factor, packaging, use context) instead of guessing from text.

---

## 3. Creative Teardown (video sources)

Only runs when the user supplies a TikTok/Reel they **own or have rights to**. We pass the
caption text and (if uploaded) the clip context. The model returns:

```
CreativeTeardown {
  hook, hookType,                      // e.g. "Stop scrolling", "POV", "3 reasons"
  pacing,                              // cut rhythm + energy
  structure[],                         // beat-by-beat
  onScreenTextStyle, productAngle, cta,
  whyItWorks[],                        // the transferable principles
  replicableTactics[]                  // what to reuse for THIS product
}
```

This is **inspiration extraction**, not reposting. The output is principles ("opens with a
pattern interrupt in 0.5s, problem stated by 2s, product reveal at 4s"), which we then apply
to the user's own product. See `COMPLIANCE.md`.

---

## 4. Strategy Pack (the core generation)

The model is prompted as a **senior short-form/DTC ads strategist**. Given the brief + brand
kit, it returns one structured pack:

```
StrategyPack {
  hooks[10]            { text, style, rationale },
  angles[5]            { name, premise, bestFor },
  scripts[3]           { title, angle, style, durationSec,
                          voiceover, onScreenText[], hashtags[],
                          storyboard[] { sceneNo, durationSec, visual,
                                         onScreenText, voiceover, broll, callout } },
  captions[3]          { text, hashtags[] },
  ctas[3]              { text, placement },
  styleOptions[3]      { style, why },     // UGC / problem-solution / before-after / etc.
  recommended          { scriptIndex, styleOption, reasoning },
  abTests[]            { hypothesis, variantA, variantB, metric }
}
```

Supported video styles the model can choose among: UGC, problem-solution, before-after,
product showcase, fast-paced TikTok, luxury, direct-response, testimonial, faceless,
"TikTok made me buy it", "3 reasons you need this", "stop scrolling", "a problem you didn't
know you had."

The first 1–2 seconds (the hook) is treated as the highest-leverage asset — every script's
storyboard front-loads the hook as scene 1 with on-screen text.

---

## 5. Campaign Plan (FacelessReels-style series)

For "post one video a day for N days," the model returns a day-by-day plan:

```
ContentPlan {
  days[N] { day, angle, hookText, style, scriptOutline,
            caption, cta, hashtags[], rationale }
}
```

**Anti-repetition constraint** is in the prompt and re-checked in code: no two consecutive
days share the same `style`, and `angle`/`hookType` rotate across the window so a 30-day
series feels varied. Days can later be regenerated individually (e.g. analytics says hook
type X is winning → bias the next regeneration toward it).

---

## 6. Output contract & robustness

`anthropic.ts` exposes `generateJSON({ system, user, images?, schema, thinking })`:

1. Builds a Claude `messages.create` call with a system prompt that **demands a single JSON
   object** and the exact shape, optional image blocks for vision, and adaptive thinking.
2. Extracts the first balanced JSON object from the response text (tolerant to stray prose).
3. `schema.safeParse()` — on success returns typed data; on failure re-asks once with the
   Zod error message appended; if it still fails, throws a typed `AIValidationError`.

This keeps generation deterministic enough to store directly, while staying robust to the
occasional model formatting slip. Streaming is used for the long campaign-plan generations
to avoid request timeouts.

---

## 7. Analytics-driven improvement (closed loop)

`post_metric` rows are aggregated per hook/angle/style/posting-time. When regenerating a
campaign day or a new strategy pack, we inject a compact "what's working for this account"
summary into the prompt (best hooks, best posting times, best styles). The model is asked to
bias toward winners while still exploring, so the series compounds rather than plateauing.

---

## 8. Safety & guardrails

- **Ownership gate:** teardown/analysis of social links is allowed only for content the user
  attests they own or have rights to; posting only ever uploads the user's own rendered ads.
- **No false claims:** the strategist prompt forbids fabricating medical/financial/earnings
  claims or specific statistics not present in the brief.
- **PII:** we never store secrets or third-party PII in briefs; product analysis is about the
  product, not people.
- **Validation:** strict Zod parsing means malformed or prompt-injected output can't silently
  corrupt the database.
