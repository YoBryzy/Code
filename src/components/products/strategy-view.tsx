import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";
import { Star } from "lucide-react";
import type { StrategyPack } from "@/lib/types";

export function StrategyView({ pack }: { pack: StrategyPack }) {
  const recommendedScript = pack.scripts[pack.recommended.scriptIndex] ?? pack.scripts[0];

  return (
    <div className="space-y-4">
      {/* Recommended */}
      <Card className="border-brand-500/30">
        <CardHeader className="flex items-center gap-2">
          <Star className="h-4 w-4 text-brand-300" />
          <CardTitle>Recommended best version</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{recommendedScript?.title}</span>
            <Badge tone="brand">{humanize(pack.recommended.styleOption)}</Badge>
          </div>
          <p className="text-sm text-ink-400">{pack.recommended.reasoning}</p>
        </CardBody>
      </Card>

      {/* Hooks */}
      <Card>
        <CardHeader><CardTitle>{pack.hooks.length} hook options</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2">
            {pack.hooks.map((h, i) => (
              <div key={i} className="rounded-lg bg-white/5 p-3">
                <p className="text-sm font-medium">“{h.text}”</p>
                <p className="mt-1 text-xs text-ink-500">{h.style} — {h.rationale}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Angles + styles */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{pack.angles.length} ad angles</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {pack.angles.map((a, i) => (
              <div key={i}>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-ink-400">{a.premise}</p>
                <p className="text-xs text-ink-600">Best for: {a.bestFor}</p>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Style recommendations</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {pack.styleOptions.map((s, i) => (
              <div key={i}>
                <Badge tone="blue">{humanize(s.style)}</Badge>
                <p className="mt-1 text-xs text-ink-400">{s.why}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Scripts */}
      <Card>
        <CardHeader><CardTitle>{pack.scripts.length} full scripts</CardTitle></CardHeader>
        <CardBody className="space-y-5">
          {pack.scripts.map((s, i) => (
            <div key={i} className="rounded-xl border border-white/10 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.title}</span>
                <Badge tone="blue">{humanize(s.style)}</Badge>
                <Badge>{s.durationSec}s</Badge>
                {i === pack.recommended.scriptIndex && <Badge tone="brand">Recommended</Badge>}
              </div>
              <p className="mt-2 text-xs text-ink-500">Angle: {s.angle}</p>

              <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-ink-500">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Visual</th>
                      <th className="px-3 py-2">On-screen</th>
                      <th className="px-3 py-2">Voiceover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.storyboard.map((sc) => (
                      <tr key={sc.sceneNo} className="border-t border-white/5 align-top">
                        <td className="px-3 py-2 text-ink-500">{sc.sceneNo}</td>
                        <td className="px-3 py-2 text-ink-300">
                          {sc.visual}
                          {sc.callout && <span className="mt-1 block text-brand-300">▸ {sc.callout}</span>}
                        </td>
                        <td className="px-3 py-2 font-medium text-ink-200">{sc.onScreenText}</td>
                        <td className="px-3 py-2 text-ink-400">{sc.voiceover}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {s.hashtags.length > 0 && (
                <p className="mt-2 text-xs text-brand-300">{s.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}</p>
              )}
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Captions + CTAs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Caption options</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {pack.captions.map((c, i) => (
              <div key={i} className="rounded-lg bg-white/5 p-3 text-sm">
                <p>{c.text}</p>
                {c.hashtags.length > 0 && (
                  <p className="mt-1 text-xs text-brand-300">{c.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}</p>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>CTA options & A/B tests</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {pack.ctas.map((c, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">“{c.text}”</span>
                <span className="ml-1 text-xs text-ink-500">({c.placement})</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-3">
              {pack.abTests.map((t, i) => (
                <div key={i} className="mb-2 text-xs text-ink-400">
                  <p className="text-ink-300">{t.hypothesis}</p>
                  <p>A: {t.variantA} · B: {t.variantB} · measure {t.metric}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
