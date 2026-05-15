import Link from "next/link";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

/** Üst başlık çubuğu: mobilde marka, her zaman tema ve kullanıcı menüsü. */
export function Header() {
  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b px-4 backdrop-blur lg:px-6 print:hidden">
      <Link href="/dashboard" className="lg:hidden" aria-label="Ana sayfa">
        <Brand size="sm" />
      </Link>
      <div className="hidden lg:block" aria-hidden />

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
