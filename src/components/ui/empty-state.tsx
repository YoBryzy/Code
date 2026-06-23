import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-ink-900/40 px-6 py-16 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-brand-500/10 text-brand-300">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-100">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-400">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className={cn(buttonClasses("primary", "md"), "mt-5")}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
