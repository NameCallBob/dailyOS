"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavIcon, type IconKey } from "@/components/ui/nav-icon";
import { cn } from "@/lib/cn";
import { NAV_GROUPS, navItemsByGroup } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主要導覽"
      className="hidden w-60 shrink-0 flex-col gap-8 border-r border-line bg-paper px-4 py-6 lg:flex"
    >
      <Link href="/dashboard" className="px-2 text-h3 text-ink">
        DailyOS
      </Link>

      {NAV_GROUPS.map((group) => {
        const items = navItemsByGroup(group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="flex flex-col gap-1">
            <p className="px-2 text-label uppercase text-ink-faint">{group}</p>
            {items.map((item) => {
              const active = pathname === item.path || pathname?.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.key}
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-2 text-body transition-colors",
                    active ? "bg-paper-sunken text-ink" : "text-ink-muted hover:bg-paper-sunken hover:text-ink",
                  )}
                >
                  <NavIcon name={item.icon as IconKey} size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
