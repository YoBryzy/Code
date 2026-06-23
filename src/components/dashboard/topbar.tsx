import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Topbar({ accountName, email }: { accountName: string; email: string | null }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-ink-950/80 px-4 backdrop-blur md:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-100">{accountName}</p>
        {email && <p className="truncate text-xs text-ink-500">{email}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Link href="/products/new" className={buttonClasses("primary", "sm")}>
          <Plus className="h-4 w-4" /> New product
        </Link>
        <form action="/auth/signout" method="post">
          <button type="submit" className={cn(buttonClasses("ghost", "sm"))} title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
