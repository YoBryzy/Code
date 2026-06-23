"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DEMO_MODE } from "@/lib/demo-flag";
import type { Platform } from "@/lib/types";

const DEMO_MSG = "Demo mode — add your Supabase + Anthropic keys to enable this. The dashboard you're viewing is seeded sample data.";

/** Generic "POST this endpoint, then refresh or redirect" button with states. */
export function RunActionButton({
  endpoint,
  label,
  body,
  variant = "primary",
  size = "md",
  redirectTo,
}: {
  endpoint: string;
  label: string;
  body?: Record<string, unknown>;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  redirectTo?: (json: Record<string, unknown>) => string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (DEMO_MODE) {
      setError(DEMO_MSG);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Request failed.");
      if (redirectTo) {
        router.push(redirectTo(json));
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={run} loading={loading} variant={variant} size={size}>
        {label}
      </Button>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram Reels" },
  { id: "youtube", label: "YouTube Shorts" },
];

/** Inline form to plan an N-day campaign series for a product. */
export function CampaignForm({ productId, defaultName }: { productId: string; defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [days, setDays] = useState(30);
  const [platforms, setPlatforms] = useState<Platform[]>(["tiktok", "instagram"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(p: Platform) {
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (DEMO_MODE) return setError(DEMO_MSG);
    if (platforms.length === 0) return setError("Pick at least one platform.");
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, name, days, platforms }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not create the campaign.");
      router.push(`/campaigns/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-400">Campaign name</label>
        <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-400">Length</label>
          <select
            className="input-base"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-400">Platforms</label>
          <div className="flex flex-wrap gap-2 pt-1">
            {PLATFORMS.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`rounded-full px-3 py-1 text-xs ${
                  platforms.includes(p.id)
                    ? "bg-brand-600 text-white"
                    : "bg-white/5 text-ink-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <Button type="submit" loading={loading}>
        Generate {days}-day plan
      </Button>
    </form>
  );
}
