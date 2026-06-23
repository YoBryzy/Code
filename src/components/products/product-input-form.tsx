"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Upload, PenLine, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { SourceType } from "@/lib/types";

type Mode = "link" | "upload" | "manual";

function detectSourceType(url: string): SourceType {
  const u = url.toLowerCase();
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("instagram.com")) return "reel";
  return "product_url";
}

export function ProductInputForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [ownsRights, setOwnsRights] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceType: SourceType =
    mode === "link" ? detectSourceType(url) : mode === "upload" ? "upload" : "manual";
  const isSocial = sourceType === "tiktok" || sourceType === "reel";
  const needsRights = isSocial || (mode === "upload" && files.length > 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "link" && !url.trim()) return setError("Paste a product or video URL.");
    if (mode === "manual" && !name.trim()) return setError("Give your product a name.");
    if (mode === "upload" && files.length === 0) return setError("Choose at least one file to upload.");
    if (needsRights && !ownsRights)
      return setError("Please confirm you own or have rights to this content.");

    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceUrl: mode === "link" ? url.trim() : null,
          name: name.trim() || null,
          manualNotes: mode === "manual" ? notes.trim() : null,
          ownsRights: needsRights ? ownsRights : true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not create the product.");

      const { id, accountId } = json as { id: string; accountId: string };

      // Upload media client-side to private Storage and record asset rows (RLS-scoped).
      if (mode === "upload" && files.length > 0) {
        const supabase = createClient();
        for (const file of files) {
          const path = `${accountId}/${id}/${crypto.randomUUID()}-${file.name}`;
          const { error: upErr } = await supabase.storage
            .from("product-assets")
            .upload(path, file, { upsert: false });
          if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
          await supabase.from("product_assets").insert({
            account_id: accountId,
            product_id: id,
            kind: file.type.startsWith("video") ? "video" : "image",
            storage_path: path,
            mime_type: file.type,
          });
        }
      }

      router.push(`/products/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  const tabs: { id: Mode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "link", label: "Paste a link", icon: Link2 },
    { id: "upload", label: "Upload media", icon: Upload },
    { id: "manual", label: "Enter manually", icon: PenLine },
  ];

  return (
    <form onSubmit={onSubmit} className="card p-6">
      <div className="mb-6 grid grid-cols-3 gap-2 rounded-lg bg-white/5 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
              mode === t.id ? "bg-brand-600 text-white" : "text-ink-400 hover:text-ink-100",
            )}
          >
            <t.icon className="h-4 w-4" /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {mode === "link" && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">
              Product URL, TikTok link, or Instagram Reel link
            </label>
            <input
              className="input-base"
              placeholder="https://yourstore.com/products/glow-serum"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            {url && (
              <p className="mt-1 text-xs text-ink-500">
                Detected source: <span className="text-brand-300">{detectSourceType(url)}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {mode === "upload" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-ink-900 px-6 py-10 text-center hover:border-brand-500/50"
          >
            <Upload className="mb-2 h-6 w-6 text-brand-300" />
            <span className="text-sm font-medium">
              {files.length ? `${files.length} file(s) selected` : "Click to upload images or video"}
            </span>
            <span className="mt-1 text-xs text-ink-500">PNG, JPG, MP4 — your own product media</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </div>
      )}

      {mode === "manual" && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">Product name</label>
            <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="Glow Serum" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">
              Describe the product, benefits, price, and target customer
            </label>
            <textarea
              className="input-base min-h-32"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="A vitamin-C serum that brightens skin in 2 weeks. $39, free shipping. For women 25-45 who want a simpler routine…"
            />
          </div>
        </div>
      )}

      {/* Optional product name for link/upload modes */}
      {mode !== "manual" && (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-ink-400">
            Product name <span className="text-ink-600">(optional)</span>
          </label>
          <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="Auto-detected if left blank" />
        </div>
      )}

      {needsRights && (
        <label className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
          <input
            type="checkbox"
            checked={ownsRights}
            onChange={(e) => setOwnsRights(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I own or have the rights to this content. AdMagic analyzes structure for inspiration
            and only ever posts content I own.
          </span>
        </label>
      )}

      <div className="mt-4 flex items-start gap-2 text-xs text-ink-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Adding a product is instant. You'll run the AI analysis on the next screen.</span>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <Button type="submit" loading={loading} className="mt-5 w-full">
        Add product
      </Button>
    </form>
  );
}
