"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Megaphone,
  Clapperboard,
  CalendarDays,
  CheckSquare,
  BarChart3,
  Palette,
  Link2,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/videos", label: "Videos", icon: Clapperboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/approvals", label: "Approval queue", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/brand", label: "Brand kit", icon: Palette },
  { href: "/accounts", label: "Connected accounts", icon: Link2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-ink-950/80 px-3 py-5 md:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2 font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600">
          <Sparkles className="h-4 w-4 text-white" />
        </span>
        AdMagic
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-500/15 text-brand-200"
                  : "text-ink-400 hover:bg-white/5 hover:text-ink-100",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
