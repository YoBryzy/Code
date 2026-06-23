/**
 * Video render worker.
 *
 * Polls `render_jobs` for queued work, composes a 1080x1920 vertical ad with
 * FFmpeg from the job's storyboard inputs, uploads the result to the `renders`
 * Storage bucket, and flips the linked video to `ready`. Run with:
 *
 *   npm run worker:render
 *
 * Requires FFmpeg on the host (FFMPEG_PATH) and the Supabase service-role key.
 * This is the self-hosted backend for the render-job contract in workers/README.md;
 * a managed render API can be dropped in behind the same contract.
 */
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServiceClient } from "@/lib/supabase/service";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FONT = process.env.FONT_PATH || "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const POLL_MS = 5000;
const MAX_ATTEMPTS = 3;

interface RenderScene {
  sceneNo: number;
  durationSec: number;
  onScreenText?: string;
  assetUrl?: string;
}
interface RenderInputs {
  title?: string;
  hook?: string;
  durationSec?: number;
  scenes?: RenderScene[];
  music?: { url?: string };
}

const supabase = createServiceClient();

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-500)}`)),
    );
  });
}

/** Escape text for FFmpeg drawtext. */
function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "’").slice(0, 120);
}

async function download(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

/** Compose a basic but real 9:16 ad: product image (or color), hook text, duration. */
async function composeVideo(inputs: RenderInputs, workDir: string): Promise<string> {
  const out = path.join(workDir, "out.mp4");
  const duration = Math.max(6, Math.min(60, inputs.durationSec ?? 20));
  const hook = inputs.hook ?? inputs.title ?? "Stop scrolling";

  // Use the first available scene image as the background; else a brand-color canvas.
  let bg: string | null = null;
  const firstAsset = inputs.scenes?.find((s) => s.assetUrl)?.assetUrl;
  if (firstAsset) {
    const imgPath = path.join(workDir, "bg.img");
    if (await download(firstAsset, imgPath)) bg = imgPath;
  }

  const drawHook =
    `drawtext=fontfile=${FONT}:text='${esc(hook)}':fontcolor=white:fontsize=64:box=1:` +
    `boxcolor=black@0.5:boxborderw=24:x=(w-text_w)/2:y=140:enable='lte(t,3)'`;
  const drawCta =
    `drawtext=fontfile=${FONT}:text='Tap to shop':fontcolor=white:fontsize=56:box=1:` +
    `boxcolor=0x6366f1@0.9:boxborderw=24:x=(w-text_w)/2:y=h-260:enable='gte(t,${duration - 3})'`;

  const args: string[] = ["-y"];
  if (bg) {
    args.push("-loop", "1", "-t", String(duration), "-i", bg);
  } else {
    args.push("-f", "lavfi", "-t", String(duration), "-i", "color=c=0x1e1b4b:s=1080x1920:r=30");
  }

  // Scale/crop to cover 1080x1920, slow zoom (Ken-Burns), then text overlays.
  const vf =
    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920," +
    `zoompan=z='min(zoom+0.0005,1.15)':d=${duration * 30}:s=1080x1920,` +
    `${drawHook},${drawCta},format=yuv420p`;
  args.push("-vf", vf, "-r", "30", "-pix_fmt", "yuv420p");
  args.push("-c:v", "libx264", "-preset", "veryfast", "-movflags", "+faststart", out);

  await run(FFMPEG, args);
  return out;
}

async function processJob(job: { id: string; account_id: string; video_id: string; inputs: RenderInputs; attempts: number }) {
  const workDir = await mkdtemp(path.join(tmpdir(), "admagic-"));
  try {
    await supabase
      .from("render_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", job.id);
    await supabase.from("videos").update({ status: "rendering" }).eq("id", job.video_id);

    const outPath = await composeVideo(job.inputs, workDir);
    const bytes = await readFile(outPath);

    const storagePath = `${job.account_id}/${job.video_id}.mp4`;
    const { error: upErr } = await supabase.storage
      .from("renders")
      .upload(storagePath, bytes, { contentType: "video/mp4", upsert: true });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    await supabase
      .from("videos")
      .update({ status: "ready", storage_path: storagePath })
      .eq("id", job.video_id);
    await supabase
      .from("render_jobs")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", job.id);

    console.log(`✓ rendered video ${job.video_id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "render failed";
    const failed = job.attempts + 1 >= MAX_ATTEMPTS;
    await supabase
      .from("render_jobs")
      .update({ status: failed ? "failed" : "queued", attempts: job.attempts + 1, error: message })
      .eq("id", job.id);
    if (failed) await supabase.from("videos").update({ status: "failed", error: message }).eq("id", job.video_id);
    console.error(`✗ render job ${job.id}: ${message}`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function tick() {
  const { data } = await supabase
    .from("render_jobs")
    .select("id, account_id, video_id, inputs, attempts")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  const job = data?.[0];
  if (job) await processJob(job as Parameters<typeof processJob>[0]);
}

async function main() {
  console.log("video-render worker started; polling render_jobs…");
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
