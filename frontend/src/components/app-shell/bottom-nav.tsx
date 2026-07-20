"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavIcon, type IconKey } from "@/components/ui/nav-icon";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV_ITEMS } from "@/lib/nav";

/** 手機底部導覽：僅顯示拇指可達的主要模組（見 nav.ts 的 primary 標記）。 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主要導覽"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {PRIMARY_NAV_ITEMS.map((item) => {
        const active = pathname === item.path || pathname?.startsWith(`${item.path}/`);
        return (
          <Link
            key={item.key}
            href={item.path}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-caption",
              active ? "text-ink" : "text-ink-muted",
            )}
          >
            <NavIcon name={item.icon as IconKey} size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
