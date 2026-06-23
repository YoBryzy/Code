import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
      </div>
      {children}
      {actionLabel && actionHref && (
        <Link href={actionHref} className={cn(buttonClasses("primary", "md"))}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
