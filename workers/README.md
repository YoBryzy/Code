# Workers

Long-running and time-triggered work runs here, **out of the web request path**:

| Worker | Trigger | Job source | Does |
| --- | --- | --- | --- |
| `video-render` | continuous poll | `render_jobs` (status `queued`) | composes the 9:16 MP4, uploads to Storage, flips `videos.status` |
| `scheduler` | poll every ~minute (or cron) | `scheduled_posts` (due + ready) | publishes via the official platform API, records `external_post_id` |

Both use the **service-role** Supabase client (RLS bypass) and always filter by the
`account_id` on each job. They never run inside the Next.js server.

```bash
npm run worker:render      # tsx workers/video-render/index.ts
npm run worker:scheduler   # tsx workers/scheduler/index.ts
```

## Render-job contract

A `render_jobs.inputs` payload (written when a concept/plan-day is promoted to a video):

```jsonc
{
  "title": "Glow Serum — UGC",
  "style": "ugc",
  "durationSec": 24,
  "aspect": "9:16",            // always 1080x1920
  "hook": "Stop scrolling if your skin feels dull",
  "scenes": [                   // from the StrategyPack storyboard
    { "sceneNo": 1, "durationSec": 2, "onScreenText": "...", "voiceover": "...", "assetUrl": "https://...", "callout": "" }
  ],
  "subtitles": true,
  "voiceover": { "provider": "elevenlabs", "voiceId": "...", "script": "..." },
  "music": { "url": "https://licensed-track.mp3", "gainDb": -18 },
  "brand": { "primaryColor": "#6366f1", "logoUrl": "https://...", "font": "Inter" }
}
```

The renderer turns this into a timeline: **hook text in the first 1–2s**, fast cuts between
product shots with Ken-Burns zooms and transitions, product callouts, burned-in auto
subtitles, AI voiceover mixed under licensed music, and an end-card CTA. Output is a
1080×1920 H.264 MP4 + a thumbnail, uploaded to the `renders` bucket.

Two interchangeable backends behind this contract:
- **FFmpeg** (self-hosted, in `video-render/`) — deterministic, scriptable.
- **Managed render API** (Remotion Lambda / Shotstack-style) — same inputs, set `RENDER_API_URL`/`RENDER_API_KEY`.

## Scheduler contract

Each minute the scheduler claims `scheduled_posts` where `status='scheduled'` and
`scheduled_for <= now()` and the linked `video.status='ready'`, then publishes via the
official API for that `connected_account` (TikTok Content Posting, Meta Content Publishing,
YouTube `videos.insert`). On success it records `external_post_id` and sets `published`; on
failure it retries with backoff and surfaces the error in the dashboard.

**Dry-run mode:** until a platform app is approved, set the connection to dry-run and the
scheduler records what *would* post without calling the live API — so the whole pipeline is
testable pre-approval. See `docs/COMPLIANCE.md`.
