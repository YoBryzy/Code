# AdMagic — Build Plan

Phased delivery, from MVP to full advanced product, mapped to the user flow. Each phase is
shippable. ✅ = implemented in this repo, 🟡 = scaffolded/contract defined, ⬜ = planned.

---

## The user flow (target)

1. Sign up → 2. Connect TikTok/Instagram/YouTube → 3. Add a product/link or upload media →
4. AI analyzes → 5. AI creates angles/scripts/captions/concepts → 6. Pick a style (or let AI
choose) → 7. AI renders a finished vertical ad → 8. Approve/edit → 9. Schedule daily posting →
10. Platform auto-posts 1/day → 11. AI learns from analytics and improves the next videos.

---

## Phase 0 — Foundations  ✅
- Next.js 15 + TS + Tailwind project, env contract, lint/typecheck. ✅
- Supabase schema + RLS + storage buckets (`0001_init.sql`). ✅
- Supabase auth (email) with SSR cookies + protected dashboard. ✅
- Dashboard shell: sidebar, top bar, empty/loading states. ✅

## Phase 1 — The AI engine (MVP core)  ✅
- Product input: paste URL / upload media / manual entry. ✅
- Server-side URL extraction (OG + JSON-LD + images). ✅
- Claude product analysis with **vision** → `ProductBrief`. ✅
- Claude **Strategy Pack**: 10 hooks, 5 angles, 3 scripts, 3 captions, 3 CTAs, styles,
  recommended best, A/B suggestions. ✅
- Creative teardown for user-owned TikTok/Reel sources. ✅
- Strict-JSON + Zod validation with one self-correction retry. ✅
- Product library + product detail with brief & strategy views. ✅
- Brand Kit (save identity + defaults; injected into generation). ✅

## Phase 2 — Campaigns & calendar  ✅ / 🟡
- Campaign Series: choose product + platforms + cadence + N days. ✅
- Claude **N-day content plan** with anti-repetition. ✅
- Calendar view of scheduled posts. ✅ (UI) / 🟡 (auto-materialization worker)
- Approval Queue (review/edit caption before publish). ✅ (UI) / 🟡 (wire to posts)

## Phase 3 — Video rendering  🟡
- Render-job contract + queue record + worker scaffold. 🟡 (`workers/video-render`)
- FFmpeg 9:16 timeline: hook text, cuts, zooms, transitions, burned subtitles, callouts,
  end-card CTA. ⬜ (compositor)
- ElevenLabs voiceover + royalty-free music mix. ⬜
- Managed render API alternative behind the same contract. ⬜
- Upload outputs to Storage, flip `video.status`. 🟡

## Phase 4 — Connections & posting  🟡
- OAuth connect flows: TikTok / Meta / YouTube (encrypted token storage). 🟡 (routes + token crypto)
- Scheduler worker: tick → publish due posts via official APIs. 🟡 (`workers/scheduler`)
- Token refresh + revoke handling; dry-run mode pre-approval. 🟡
- Per-platform schedules, autopilot on/off, edit-before-post. ✅ (model) / 🟡 (wiring)

## Phase 5 — Analytics & the learning loop  🟡 / ⬜
- Pull metrics from platform APIs into `post_metrics`. ⬜
- Dashboards: best hooks/captions/products/times. 🟡 (UI shells)
- Analytics-driven regeneration (inject winners into prompts). 🟡 (hook in `ad-generation`)

## Phase 6 — Monetization & polish  🟡 / ⬜
- Stripe subscriptions + usage metering (`usage_events`). 🟡 (env + table)
- Plan quotas/back-pressure on render + posts. ⬜
- Team seats (memberships), roles. ✅ (schema) / 🟡 (UI)
- Bulk generation, A/B hook testing dashboards, posting-time optimization. ⬜

---

## MVP definition (what makes it real, not a demo)

A user can: sign up → add a product URL or upload images → get a genuine AI Product Brief +
full Strategy Pack (real Claude output, validated) → save a Brand Kit that shapes generation
→ create a 30-day campaign plan → see it on a calendar and in an approval queue. That entire
spine is implemented here against a real database with real auth and real AI. Rendering and
live posting are the next worker-layer milestones, with contracts already defined.

---

## Implementation order (for a team picking this up)

1. Run `0001_init.sql`; set Supabase + Anthropic env. Confirm analysis + strategy work.
2. Build the FFmpeg compositor in `workers/video-render` to satisfy the render-job contract.
3. Implement one platform end-to-end (TikTok) connect→render→publish, dry-run first.
4. Add the daily planner (materialize content_plan_items → videos + scheduled_posts).
5. Wire metrics ingestion; turn on the analytics→prompt feedback.
6. Stripe plans + quotas; then Instagram + YouTube; then bulk/A-B tooling.

---

## Risks & how the design mitigates them

| Risk | Mitigation |
| --- | --- |
| Platform app review delays posting | Dry-run mode; generate+render+queue works without live posting |
| AI output drift / malformed JSON | Strict Zod + one self-correction retry + typed errors |
| Render quality feels "AI slideshow" | Storyboard-driven timelines, hook-first, fast cuts, real product media, burned subtitles |
| Cost blowups | Prompt caching of brand/brief; cheaper model for routine variants; plan quotas |
| Multi-tenant data leaks | Postgres RLS on every table; workers filter by job's account_id |
| Token theft | AES-256-GCM encryption at rest; never logged; revoke on disconnect |
