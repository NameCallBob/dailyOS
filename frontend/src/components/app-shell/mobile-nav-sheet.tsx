"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavIcon, type IconKey } from "@/components/ui/nav-icon";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { NAV_GROUPS, navItemsByGroup } from "@/lib/nav";

export function MobileNavSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onClose={onClose} title="所有模組">
      <nav aria-label="所有模組導覽" className="flex flex-col gap-6">
        {NAV_GROUPS.map((group) => {
          const items = navItemsByGroup(group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="flex flex-col gap-1">
              <p className="px-1 text-label uppercase text-ink-faint">{group}</p>
              {items.map((item) => {
                const active = pathname === item.path || pathname?.startsWith(`${item.path}/`);
                return (
                  <Link
                    key={item.key}
                    href={item.path}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2 py-2.5 text-body",
                      active ? "bg-paper-sunken text-ink" : "text-ink-soft hover:bg-paper-sunken",
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
    </Sheet>
  );
}
