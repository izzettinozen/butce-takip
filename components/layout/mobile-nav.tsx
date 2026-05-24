"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon } from "lucide-react";

import { bottomSheetGroups, primaryNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** Bottom sheet'te listelenen tüm sayfa yolları — Menü butonu aktiflik kontrolü. */
const SHEET_HREFS = bottomSheetGroups.flatMap((g) =>
  g.items.map((i) => i.href),
);

/** Mobil alt navigasyon çubuğu + Menü bottom sheet. Masaüstünde gizlidir. */
export function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const menuActive = SHEET_HREFS.some((h) => isActive(h));

  return (
    <>
      <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t backdrop-blur lg:hidden print:hidden">
        {primaryNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-current={menuActive ? "page" : undefined}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
            menuActive
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MenuIcon className="size-5" />
          <span>Menü</span>
        </button>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80vh] overflow-y-auto rounded-t-2xl pb-6"
        >
          <SheetHeader className="pb-0 pt-2">
            {/* Sürükle kapat — sadece tutamaç alanı */}
            <div
              onTouchStart={(e) => setTouchStartY(e.touches[0].clientY)}
              onTouchEnd={(e) => {
                if (touchStartY === null) return;
                const delta = e.changedTouches[0].clientY - touchStartY;
                if (delta > 60) setMenuOpen(false);
                setTouchStartY(null);
              }}
              className="-mt-2 mb-1 flex cursor-grab touch-none justify-center py-2"
              aria-hidden
            >
              <span className="bg-muted-foreground/30 h-1 w-12 rounded-full" />
            </div>
            <SheetTitle className="sr-only">Menü</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 px-2">
            {bottomSheetGroups.map((group) => (
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
                          onClick={() => setMenuOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                            active
                              ? "bg-gradient-primary text-white shadow-sm shadow-indigo-500/30"
                              : "hover:bg-muted active:bg-muted",
                          )}
                        >
                          <item.icon className="size-5 shrink-0" />
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
