# AdMagic — Architecture

This document is the system-level map: components, data flow, the AI pipeline, the video
pipeline, social connection + scheduling, and the security/compliance posture. Pair it with
`DATABASE.md` (schema), `AI_WORKFLOW.md` (prompts + generation), `COMPLIANCE.md` (platform
rules), and `BUILD_PLAN.md` (phased delivery).

---

## 1. Product in one paragraph

A user signs up, connects TikTok/Instagram/YouTube, and adds a "source" — a product URL, a
TikTok/Reel link, or uploaded media. The AI analyzes the source into a structured
**Product Brief** (and, for video sources, a **Creative Teardown**). From a brief plus the
user's **Brand Kit**, the AI produces a **Strategy Pack** (10 hooks, 5 angles, 3 scripts, 3
captions, 3 CTAs, recommended best version, A/B suggestions). The user (or autopilot) turns
chosen concepts into **render jobs** that produce 1080×1920 MP4s. A **Campaign** schedules
one fresh ad per day per platform; a **scheduler worker** publishes approved videos via
official APIs at the chosen times; analytics flow back and steer future generations.

---

## 2. High-level component diagram

```
                       ┌─────────────────────────────────────────────────────────┐
                       │                    Next.js app (Vercel)                  │
   Browser  ◀────────▶ │  App Router UI  +  Route Handlers (/api/*)  +  Server     │
                       │  Actions. Auth via Supabase SSR cookies.                 │
                       └───────┬───────────────────────┬────────────────┬─────────┘
                               │                        │                │
                  Supabase     │            Anthropic   │     Upstash    │  Stripe
              (Postgres+Auth+  │             Claude     │   Redis (queue │  (billing)
                 Storage, RLS) │         (text+vision)  │   + ratelimit) │
                               │                        │                │
        ┌──────────────────────┴───────────┐            │                │
        │  enqueue jobs (render / publish)  │◀───────────┘                │
        └──────────┬─────────────────┬──────┘                             │
                   ▼                 ▼                                     │
        ┌────────────────┐  ┌──────────────────┐                          │
        │ Render worker  │  │ Scheduler worker │ (cron tick every minute) │
        │ FFmpeg/Remotion│  │ pops due posts   │                          │
        │ + TTS + music  │  │ → platform APIs  │──────────────────────────┘
        └───────┬────────┘  └────────┬─────────┘
                ▼                     ▼
         Supabase Storage     TikTok / Meta / YouTube  ◀── webhooks/poll ──▶ analytics
         (mp4, thumbnails)        (official APIs)
```

Everything user-facing is one Next.js deployment. Long-running and CPU-heavy work (video
rendering) and time-triggered work (scheduled posting) run as **separate worker processes**
so they never block web requests and can scale independently.

---

## 3. Why this stack

- **Next.js + TypeScript** — single language across UI, API, and workers; Route Handlers
  give us a clean API surface; Server Components keep secrets server-side.
- **Supabase** — Postgres with **Row-Level Security** is the cleanest way to get hard
  per-account data isolation in a multi-tenant SaaS, plus Auth and S3-style Storage in one
  product. Every table is scoped by `account_id` and protected by RLS so a bug in app code
  can't leak another tenant's data.
- **Anthropic Claude (`claude-opus-4-8`)** — the engine's quality bar lives here. Claude
  does the strategist reasoning, reads product images and screenshots (vision), and returns
  strict JSON we validate with Zod. Adaptive thinking is on for the hard reasoning steps.
- **FFmpeg worker (or managed render API)** — deterministic, scriptable 9:16 composition
  with subtitles, zooms, transitions, captions, and audio mixing. A managed render API
  (Remotion Lambda / Shotstack-style) is a drop-in alternative behind the same job contract.
- **Upstash Redis** — serverless queue + rate limiting that workers and the app share.
- **Stripe** — subscriptions and usage metering (videos generated / posts scheduled).

Alternatives considered: a Postgres-only `LISTEN/NOTIFY` queue (fine at small scale, but
Redis is simpler to operate across worker fleets); pure client-side rendering (rejected —
quality and consistency suffer; rendering belongs server-side).

---

## 4. Core domain model (see DATABASE.md for columns)

```
account ─┬─ membership ── auth user            (a workspace; users join via membership)
         ├─ brand_kit                           (logo, colors, voice, hashtags, defaults)
         ├─ connected_account                   (tiktok/instagram/youtube OAuth tokens)
         ├─ product ─┬─ product_asset           (images/clips owned by the user)
         │           └─ creative_teardown        (when source is a TikTok/Reel link)
         ├─ strategy_pack ── ad_concept          (hooks/angles/scripts/captions/CTAs)
         ├─ campaign ── content_plan_item        (the N-day calendar: 1 idea per day)
         ├─ video ── render_job                  (a finished/queued 9:16 ad)
         ├─ scheduled_post                       (a video queued to publish at a time)
         └─ post_metric                          (views/likes/etc. pulled back from APIs)
```

A **source** is normalized into a `product` (with `source_type` ∈
`product_url | tiktok | reel | upload | manual`). Video sources additionally get a
`creative_teardown`. Strategy and campaigns hang off products; videos reference the concept
they were generated from so analytics can attribute performance back to a hook/angle.

---

## 5. The four pipelines

### 5a. Ingestion & analysis
1. User submits a source (URL paste / upload).
2. **URL path:** server fetches the page server-side, extracts title, price, images, and
   metadata (Open Graph + JSON-LD product schema), and downloads candidate images.
   **Upload path:** files go to Supabase Storage; signed URLs are passed to Claude vision.
3. Claude produces a **Product Brief** (name, benefits, price, offer, target customer, pain
   points, selling angles) — vision reads the product images directly.
4. For TikTok/Reel sources, Claude produces a **Creative Teardown** (hook, pacing, on-screen
   text, structure, product angle, CTA, why it may work) from the **user-provided** caption
   text and/or a clip they uploaded. We analyze *structure*, never copy media.

### 5b. Strategy & generation (the crown jewel — see AI_WORKFLOW.md)
1. Brief + Brand Kit → **Strategy Pack**: 10 hooks, 5 angles, 3 full scripts (with
   voiceover + on-screen text + scene-by-scene storyboard), 3 captions, 3 CTAs, 3 style
   recommendations, a "recommended best version," and A/B test suggestions.
2. **Campaign series:** a 7/14/30-day **content plan** where each day gets a distinct
   hook + angle + script + caption + CTA + style, with an anti-repetition constraint so the
   same structure isn't reused back-to-back.
3. All AI output is strict JSON validated by Zod before it touches the database.

### 5c. Video rendering
1. A chosen `ad_concept` (+ product assets + brand kit + optional voiceover/music) becomes a
   **render job** enqueued in Redis.
2. The **render worker** builds a 1080×1920 timeline: hook text in the first 1–2s, fast
   cuts, product callouts, Ken-Burns zooms, transitions, auto-subtitles burned in, AI
   voiceover (ElevenLabs) mixed under licensed music, end-card CTA. FFmpeg composes it
   (or a managed render API renders a Remotion composition with identical inputs).
3. Output MP4 + thumbnail land in Storage; `video.status` flips to `ready`.

### 5d. Scheduling & posting
1. A campaign defines per-platform schedules (times, frequency, autopilot on/off).
2. Each day the planner materializes the next `content_plan_item` into a video (render job)
   and a `scheduled_post` at the chosen time (status `pending_review` or, on autopilot,
   `scheduled`).
3. The **scheduler worker** ticks every minute, pops due `scheduled` posts whose video is
   `ready`, and publishes through the official platform API for that `connected_account`.
4. Status → `published`; later, metrics are pulled back into `post_metric`.

---

## 6. Request/runtime boundaries

- **Server Components & Route Handlers** read/write Supabase with the user's RLS-scoped
  session. They never see other tenants' rows.
- **Workers** use the **service-role** key (RLS bypass) because they act system-wide, but
  they always filter by the `account_id` stored on the job. Workers are the *only* place the
  service-role key is used.
- **Secrets** (`ANTHROPIC_API_KEY`, OAuth client secrets, service-role key, token-encryption
  key) are server-only; the browser only ever sees `NEXT_PUBLIC_*` values. Connected-account
  OAuth tokens are encrypted at rest with `TOKEN_ENCRYPTION_KEY` (AES-256-GCM) before being
  stored.

---

## 7. Scaling notes

- Web tier is stateless → scale horizontally on Vercel.
- Render is the bottleneck → a pool of render workers consuming the Redis queue; back-pressure
  via per-account concurrency caps and Stripe-plan quotas.
- Posting is bursty around popular times → the scheduler dedupes and respects per-platform
  rate limits; failed posts retry with exponential backoff and surface in the Approval Queue.
- AI cost control → cache the Brand Kit + Product Brief prefix; use `claude-opus-4-8` for
  strategy and a cheaper model for routine caption variants if needed.

---

## 8. Failure handling philosophy

Every async step is a row with a `status` and an `error` column, not a fire-and-forget call.
Render jobs, scheduled posts, and analysis runs all move through explicit state machines
(`queued → running → ready/failed`), are retryable, and are visible in the dashboard. The
Approval Queue is the human-in-the-loop safety net before anything publishes.
