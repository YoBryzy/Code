/**
 * Scheduler worker.
 *
 * Every tick it claims due, ready posts and publishes them through the official
 * platform API for the linked connected account, then records the external post
 * id. Run with:
 *
 *   npm run worker:scheduler
 *
 * Until a platform app is approved, the worker runs in DRY-RUN mode (set
 * SCHEDULER_LIVE=1 to attempt live publishing): it records exactly what *would*
 * post without calling the live API, so the full pipeline is testable. See
 * docs/COMPLIANCE.md.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken } from "@/lib/crypto/tokens";

const POLL_MS = 30_000;
const LIVE = process.env.SCHEDULER_LIVE === "1";

const supabase = createServiceClient();

interface DuePost {
  id: string;
  account_id: string;
  video_id: string;
  platform: "tiktok" | "instagram" | "youtube";
  caption: string | null;
  connected_account_id: string | null;
}

/** Publish a single post. Returns the platform's external post id. */
async function publish(post: DuePost): Promise<string> {
  // Resolve a signed URL for the rendered video.
  const { data: video } = await supabase
    .from("videos")
    .select("storage_path, status")
    .eq("id", post.video_id)
    .single();
  if (!video?.storage_path || video.status !== "ready") {
    throw new Error("video not ready");
  }
  const { data: signed } = await supabase.storage
    .from("renders")
    .createSignedUrl(video.storage_path, 3600);
  const videoUrl = signed?.signedUrl;
  if (!videoUrl) throw new Error("could not sign video url");

  if (!LIVE) {
    // DRY-RUN: log the intended publish; don't call the live API.
    console.log(`[dry-run] would publish ${post.platform} post for video ${post.video_id}`);
    console.log(`          caption: ${post.caption ?? "(none)"}`);
    return `dryrun_${post.id}`;
  }

  // LIVE: load the connected account's (decrypted) token, then call the official
  // platform publishing API. Each requires an approved app + scopes:
  //   - tiktok    → Content Posting API (init upload → publish)
  //   - instagram → Graph API: POST /{ig-user-id}/media → /media_publish
  //   - youtube   → Data API v3: videos.insert (resumable upload)
  if (!post.connected_account_id) throw new Error("no connected account");
  const { data: acct } = await supabase
    .from("connected_accounts")
    .select("access_token_enc, status, external_id")
    .eq("id", post.connected_account_id)
    .single();
  if (!acct || acct.status !== "active" || !acct.access_token_enc) {
    throw new Error("connected account is not active");
  }
  const accessToken = decryptToken(acct.access_token_enc);
  void accessToken; // used by the per-platform publish implementations below

  // TODO (per platform): implement the official upload+publish call using
  // `accessToken`, `videoUrl`, and `post.caption`. These are intentionally not
  // stubbed with fake success — wire them once the app is approved.
  throw new Error(`live publishing for ${post.platform} is not yet wired (needs approved app)`);
}

async function tick() {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("scheduled_posts")
    .select("id, account_id, video_id, platform, caption, connected_account_id")
    .eq("status", "scheduled")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(5);

  for (const post of (data ?? []) as DuePost[]) {
    // Claim the post so concurrent workers don't double-publish.
    const { data: claimed } = await supabase
      .from("scheduled_posts")
      .update({ status: "publishing" })
      .eq("id", post.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    try {
      const externalId = await publish(post);
      await supabase
        .from("scheduled_posts")
        .update({ status: "published", external_post_id: externalId, published_at: new Date().toISOString(), error: null })
        .eq("id", post.id);
      console.log(`✓ published ${post.id} (${externalId})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "publish failed";
      await supabase
        .from("scheduled_posts")
        .update({ status: "failed", error: message })
        .eq("id", post.id);
      console.error(`✗ publish ${post.id}: ${message}`);
    }
  }
}

async function main() {
  console.log(`scheduler worker started (${LIVE ? "LIVE" : "dry-run"}); polling scheduled_posts…`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await tick();
    } catch (e) {
      console.error("tick error:", e);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main();
