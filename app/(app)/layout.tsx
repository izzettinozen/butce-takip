import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { RecurringExpensesChecker } from "@/components/recurring-expenses-checker";

/** Uygulama (giriş yapılmış) alanı layout'u: sidebar + header + alt menü. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <RecurringExpensesChecker />
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:pl-64 print:pl-0">
        <Header />
        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
