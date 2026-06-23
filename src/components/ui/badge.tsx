import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "green" | "amber" | "red" | "blue";

const tones: Record<Tone, string> = {
  neutral: "bg-white/10 text-ink-300",
  brand: "bg-brand-500/15 text-brand-300",
  green: "bg-emerald-500/15 text-emerald-300",
  amber: "bg-amber-500/15 text-amber-300",
  red: "bg-red-500/15 text-red-300",
  blue: "bg-sky-500/15 text-sky-300",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Map a domain status string to a sensible badge tone. */
export function statusTone(status: string): Tone {
  switch (status) {
    case "ready":
    case "active":
    case "published":
    case "done":
      return "green";
    case "analyzing":
    case "rendering":
    case "publishing":
    case "running":
    case "scheduled":
      return "blue";
    case "pending":
    case "pending_review":
    case "draft":
    case "queued":
      return "amber";
    case "failed":
    case "error":
    case "revoked":
    case "expired":
    case "canceled":
      return "red";
    default:
      return "neutral";
  }
}
