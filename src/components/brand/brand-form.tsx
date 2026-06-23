"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { BrandKit } from "@/lib/types";

export function BrandForm({ initial }: { initial: Partial<BrandKit> | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    brand_name: initial?.brand_name ?? "",
    tone_of_voice: initial?.tone_of_voice ?? "",
    target_audience: initial?.target_audience ?? "",
    cta_style: initial?.cta_style ?? "",
    caption_style: initial?.caption_style ?? "",
    primary_color: initial?.primary_color ?? "#6366f1",
    hashtags: (initial?.hashtags ?? []).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          hashtags: form.hashtags
            .split(",")
            .map((h) => h.trim().replace(/^#/, ""))
            .filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const field = "input-base";
  return (
    <form onSubmit={save} className="card max-w-2xl space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-400">Brand name</label>
          <input className={field} value={form.brand_name} onChange={(e) => set("brand_name", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-400">Primary color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.primary_color}
              onChange={(e) => set("primary_color", e.target.value)}
              className="h-10 w-12 rounded-lg border border-white/10 bg-ink-900"
            />
            <input className={field} value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} />
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-400">Tone of voice</label>
        <input className={field} placeholder="Playful, confident, no-fluff" value={form.tone_of_voice} onChange={(e) => set("tone_of_voice", e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-400">Target audience</label>
        <input className={field} placeholder="Women 25-40 into clean beauty" value={form.target_audience} onChange={(e) => set("target_audience", e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-400">CTA style</label>
          <input className={field} placeholder="Urgent, scarcity-driven" value={form.cta_style} onChange={(e) => set("cta_style", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-400">Caption style</label>
          <input className={field} placeholder="Short, lots of emojis" value={form.caption_style} onChange={(e) => set("caption_style", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-400">Default hashtags (comma-separated)</label>
        <input className={field} placeholder="skincare, glowup, tiktokmademebuyit" value={form.hashtags} onChange={(e) => set("hashtags", e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>Save brand kit</Button>
        {saved && <span className="text-sm text-emerald-300">Saved ✓</span>}
      </div>
    </form>
  );
}
