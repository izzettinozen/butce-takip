"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { navGroups } from "@/lib/navigation";
import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";

/** Masaüstü sol sidebar. Mobilde gizlidir (alt menü kullanılır). */
export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r lg:flex print:hidden">
      <div className="border-sidebar-border flex h-16 items-center border-b px-5">
        <Link href="/dashboard" aria-label="Ana sayfa">
          <Brand size="md" />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-muted-foreground px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-gradient-primary text-white shadow-sm shadow-indigo-500/30"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-sidebar-border border-t p-3">
        <Link
          href="/ayarlar"
          aria-current={isActive("/ayarlar") ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive("/ayarlar")
              ? "bg-gradient-primary text-white shadow-sm shadow-indigo-500/30"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <Settings className="size-4 shrink-0" />
          Ayarlar
        </Link>
      </div>
    </aside>
  );
}
