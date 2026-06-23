# AdMagic — Database

Postgres on Supabase. The authoritative DDL is `supabase/migrations/0001_init.sql`; this
file explains the model, the multi-tenant strategy, and the state machines.

---

## Multi-tenancy & security

- Every domain row carries `account_id`. An **account** is a workspace; **memberships** link
  Supabase `auth.users` to accounts with a role (`owner | admin | member`).
- **Row-Level Security is ON for every table.** Policies allow a row only if the requesting
  user has a membership in that row's `account_id`. App code therefore cannot read or write
  across tenants even if a query forgets a filter.
- Workers use the service-role key (bypasses RLS) and must filter by the `account_id` on the
  job they're processing.
- OAuth tokens on `connected_account` are stored **encrypted** (AES-256-GCM via
  `TOKEN_ENCRYPTION_KEY`); the raw token never sits in plaintext at rest.

---

## Tables

| Table | Purpose | Key columns |
| --- | --- | --- |
| `accounts` | Workspace / billing entity | `id`, `name`, `plan`, `stripe_customer_id` |
| `memberships` | User ↔ account, with role | `account_id`, `user_id`, `role` |
| `brand_kits` | Saved brand identity & defaults | colors, `logo_url`, `tone_of_voice`, `target_audience`, `cta_style`, `hashtags[]`, `caption_style`, default schedule |
| `connected_accounts` | Social OAuth connections | `platform`, `external_id`, `username`, `access_token_enc`, `refresh_token_enc`, `token_expires_at`, `scopes[]`, `status` |
| `products` | Normalized source/product | `source_type`, `source_url`, `name`, `brief` (jsonb `ProductBrief`), `status` |
| `product_assets` | User-owned media | `product_id`, `kind` (image/video), `storage_path`, `width`, `height` |
| `creative_teardowns` | Analysis of a user-owned video source | `product_id`, `teardown` (jsonb) |
| `strategy_packs` | Generated strategy | `product_id`, `pack` (jsonb `StrategyPack`), `model`, `created_by` |
| `ad_concepts` | A single chosen concept to render | `strategy_pack_id`, `hook`, `script` (jsonb), `caption`, `cta`, `style` |
| `campaigns` | A series ("1/day for N days") | `product_id`, `name`, `platforms[]`, `cadence`, `autopilot`, `status`, `starts_on`, `days_total` |
| `content_plan_items` | One planned day in a campaign | `campaign_id`, `day_index`, `plan` (jsonb), `status` |
| `videos` | A rendered (or rendering) ad | `ad_concept_id`, `aspect`, `duration_sec`, `storage_path`, `thumbnail_path`, `status` |
| `render_jobs` | Render queue record | `video_id`, `status`, `inputs` (jsonb), `attempts`, `error` |
| `scheduled_posts` | A video queued to publish | `video_id`, `connected_account_id`, `platform`, `scheduled_for`, `caption`, `status`, `external_post_id`, `error` |
| `post_metrics` | Performance pulled from APIs | `scheduled_post_id`, `views`, `likes`, `comments`, `shares`, `saves`, `clicks`, `captured_at` |
| `usage_events` | Metering for billing | `account_id`, `kind`, `quantity`, `created_at` |

`jsonb` columns hold the AI structures (validated by Zod in app code before insert), which
keeps the schema stable while the AI output shape evolves.

---

## State machines

```
products.status:        pending → analyzing → ready | failed
render_jobs.status:      queued → running → done | failed   (attempts++, retry w/ backoff)
videos.status:           draft → rendering → ready | failed
scheduled_posts.status:  pending_review → scheduled → publishing → published | failed | canceled
campaigns.status:        draft → active → paused | completed
connected_accounts.status: active | expired | revoked | error
```

The dashboard's **Approval Queue** = `scheduled_posts WHERE status = 'pending_review'`.
The **Calendar** = `scheduled_posts` grouped by day. Autopilot moves new posts straight to
`scheduled`; otherwise they wait in `pending_review`.

---

## Important indexes

- `scheduled_posts (status, scheduled_for)` — the scheduler's hot query ("due & ready").
- `render_jobs (status, created_at)` — render worker's queue scan.
- `products (account_id, created_at desc)`, `videos (account_id, status)` — dashboard lists.
- `post_metrics (scheduled_post_id, captured_at)` — analytics rollups.

---

## Storage buckets

| Bucket | Contents | Access |
| --- | --- | --- |
| `product-assets` | user-uploaded images/clips | private; signed URLs |
| `renders` | finished MP4s + thumbnails | private; signed URLs for preview/publish |
| `brand` | logos | private; signed URLs |

All buckets are private; the app issues short-lived signed URLs. Public exposure happens only
when a video is published to a social platform via its API.
