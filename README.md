# AdMagic

**AI ad-generation + auto-posting platform for short-form product video ads.**

Paste a product link, a TikTok/Reel URL, or upload product media → AdMagic analyzes it,
generates a full strategy (hooks, angles, scripts, captions, CTAs, storyboards), renders
polished 9:16 video ads, and auto-posts one per day to TikTok, Instagram Reels, and
YouTube Shorts on a schedule you control.

Think **FacelessReels + an AI TikTok-ads agency + a social scheduler + a product-research
assistant**, focused on ecommerce brands, dropshippers, Shopify owners, and affiliate
marketers.

---

## What's in this repo

This is a real, production-shaped Next.js application — not a demo slideshow. The MVP
implemented here covers the highest-leverage, hardest-to-fake part of the product: the
**AI strategy + ad-generation engine**, wired end-to-end through a real database, auth,
and dashboard. Video rendering and social posting are implemented as worker services with
clear contracts (see `workers/` and `docs/`).

```
docs/                  Full architecture, schema, AI workflow, compliance, and build plan
supabase/migrations/   Postgres schema with Row-Level Security
src/app/               Next.js App Router: landing, auth, dashboard, API routes
src/components/        UI + feature components
src/lib/               Supabase clients, Anthropic AI services, types, utilities
workers/               Background workers: scheduler (auto-post) + video renderer
```

Start with **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** and
**[`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md)**.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 15 (App Router) + React 19 + TypeScript** | One codebase for UI, API routes, and server logic |
| Styling | **Tailwind CSS** | Fast, consistent, professional UI |
| Auth + DB + Storage | **Supabase** (Postgres, Auth, Storage, RLS) | Batteries-included, RLS for hard multi-tenant isolation |
| AI text + vision | **Anthropic Claude (`claude-opus-4-8`)** | Strategy reasoning, product/video analysis (vision), structured ad generation |
| Voiceover | **ElevenLabs** | Natural ad voiceovers |
| Video render | **FFmpeg worker** (or a managed Remotion/Shotstack-style render API) | Deterministic 9:16 composition |
| Music | Licensed/royalty-free catalog API | Compliant background tracks |
| Queue / jobs | **Upstash Redis** + worker processes | Render + scheduled-post jobs, rate limiting |
| Billing | **Stripe** | Subscriptions + usage metering |
| Posting | **Official** TikTok Content Posting API, Meta Graph API, YouTube Data API | Compliant publishing |

See `docs/ARCHITECTURE.md` for the full rationale and alternatives.

---

## Quickstart (local)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#   → fill in Supabase + Anthropic keys at minimum (the AI flow needs these two)

# 3. Apply the database schema
#   Paste supabase/migrations/0001_init.sql into the Supabase SQL editor,
#   or run it with the Supabase CLI:  supabase db push

# 4. Run the app
npm run dev          # http://localhost:3000

# 5. (Optional) run background workers
npm run worker:scheduler
npm run worker:render
```

The **minimum** to see the AI engine work end-to-end is `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ANTHROPIC_API_KEY`.

---

## Where API keys go

**Never** in the repo. Locally they live in `.env.local` (git-ignored). In production they
go in your host's secret manager. The split between public (`NEXT_PUBLIC_*`, safe in the
browser) and server-only secrets (everything else, incl. the Supabase service-role key and
all OAuth client secrets) is documented inline in `.env.example` and enforced in
`src/lib/env.ts`.

---

## Compliance note (read before connecting socials)

Auto-posting uses **official platform APIs only**. Each requires app review and specific
scopes, and TikTok/Instagram publishing requires business/creator accounts. AdMagic only
posts content the user owns or has rights to — it never re-uploads someone else's video.
The TikTok/Reel "analysis" feature studies *structure* (hook, pacing, CTA) for inspiration;
it does not copy media. See **[`docs/COMPLIANCE.md`](docs/COMPLIANCE.md)**.
