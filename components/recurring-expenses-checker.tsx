"use client";

import { useRecurringExpensesCheck } from "@/hooks/use-recurring-expenses-check";

/**
 * Görünmez bileşen: uygulama (app) layout'una yerleştirilir ve kullanıcı
 * giriş yaptığında tekrarlayan gider kontrolünü bir kez tetikler.
 */
export function RecurringExpensesChecker() {
  useRecurringExpensesCheck({ autoRun: true });
  return null;
}
