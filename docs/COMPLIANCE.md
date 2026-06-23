# AdMagic — Compliance & Platform Rules

Auto-posting and content analysis touch three regulated platform APIs and other people's
intellectual property. This is the non-negotiable posture. **Read before building the
posting or analysis features.**

---

## 1. Ownership & copyright (the core rule)

- AdMagic **only publishes content the user owns** — AI-generated ads built from the user's
  own product and their own uploaded/licensed media.
- AdMagic **never re-uploads or reposts someone else's video.** There is no "download this
  TikTok and post it" path, by design.
- The TikTok/Reel **analysis** feature studies *structure and technique* (hook, pacing,
  on-screen text style, CTA, why it works) to teach the AI transferable principles. It does
  **not** copy footage, audio, captions, or the creator's likeness. The product requires the
  user to confirm they have rights to any clip they upload.
- Background music must come from a **licensed/royalty-free** catalog. Never rip platform
  audio or use copyrighted tracks.

If a feature would require copying third-party media to publish, it is out of scope.

---

## 2. TikTok — Content Posting API

- Use the official **Content Posting API** with **Login Kit** (OAuth 2.0). Scopes:
  `user.info.basic`, `video.upload`, `video.publish`.
- The app must pass **TikTok app review**; unaudited apps can only post to private/self
  accounts in sandbox. Plan for the review (privacy policy, ToS, demo video, scope
  justification).
- Respect rate limits and the **content disclosure / branded-content** settings the API
  exposes. Surface them in the UI when relevant.
- Direct-publish vs. upload-to-drafts: support both; some review tiers only allow
  upload-to-inbox until fully approved.

## 3. Instagram — Meta Graph API (Content Publishing)

- Requires an **Instagram Business or Creator account** linked to a **Facebook Page**.
- Use the **Content Publishing API** (`POST /{ig-user-id}/media` → `media_publish`).
  Permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`,
  `business_management`.
- Requires **Meta App Review** + Business Verification. Reels publishing has format rules
  (duration, aspect, codec) we enforce at render time.
- Honor per-user publishing rate limits (rolling 24h quota).

## 4. YouTube — Data API v3 (Shorts)

- OAuth 2.0 with `https://www.googleapis.com/auth/youtube.upload`.
- A Short is just a ≤60s vertical video; we upload via `videos.insert` and tag `#Shorts`.
- Daily quota units apply; uploads are expensive in quota — batch and back off.

---

## 5. What "design around approval" means in practice

Because all three require review/verification that takes time:

1. **Connection states** are explicit (`active | expired | revoked | error`) and the UI tells
   the user exactly what's missing (e.g. "Instagram needs a linked Facebook Page").
2. **Sandbox-first:** in development the posting layer can run in a dry-run mode that records
   what *would* be posted without calling the live API, so the whole flow is testable before
   approval lands.
3. **Token lifecycle:** tokens are encrypted at rest, refreshed proactively before expiry,
   and a revoked/expired token pauses (not deletes) the affected schedules and flags the
   account for reconnection.
4. **Graceful degradation:** if a platform isn't connected/approved yet, campaigns can still
   generate and render videos and queue them for review — only the publish step is gated.

---

## 6. Data protection & user trust

- OAuth tokens encrypted at rest (AES-256-GCM, `TOKEN_ENCRYPTION_KEY`); never logged.
- Per-tenant isolation enforced by Postgres RLS (see `DATABASE.md`).
- Users can disconnect an account (revoke + delete tokens) and delete products/videos.
- Clear in-product disclosure that content is AI-generated; encourage users to follow each
  platform's AI-content labeling guidance where applicable.
- Privacy Policy + Terms required for the platform app reviews anyway — ship them.

---

## 7. Abuse prevention

- Spam controls: per-account daily post caps aligned to platform limits + plan quotas.
- No engagement automation (no fake likes/follows) — out of scope and against platform ToS.
- Content moderation: the generation prompts forbid fabricated claims, and accounts posting
  prohibited content can be suspended.
