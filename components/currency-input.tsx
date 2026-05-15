"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Kullanıcı yazarken TR para biçimi uygular:
 * binlik ayıracı nokta, ondalık ayıracı virgül (en fazla 2 hane).
 */
function maskCurrency(raw: string): string {
  // Yalnızca rakam ve virgül.
  let s = raw.replace(/[^\d,]/g, "");

  // İlk virgülden sonraki virgülleri kaldır.
  const commaIndex = s.indexOf(",");
  if (commaIndex !== -1) {
    s =
      s.slice(0, commaIndex + 1) +
      s.slice(commaIndex + 1).replace(/,/g, "");
  }

  const [intRaw = "", decRaw] = s.split(",");
  // Baştaki gereksiz sıfırları temizle.
  const intPart = intRaw.replace(/^0+(?=\d)/, "");
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (decRaw === undefined) {
    return s.includes(",") ? `${intFormatted},` : intFormatted;
  }
  return `${intFormatted},${decRaw.slice(0, 2)}`;
}

interface CurrencyInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

/** TR para birimi maskeli giriş alanı. Sağda ₺ simgesi gösterir. */
export const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  CurrencyInputProps
>(({ value, onChange, className, ...props }, ref) => {
  return (
    <div className="relative">
      <Input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(maskCurrency(e.target.value))}
        className={cn("pr-8", className)}
        {...props}
      />
      <span className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm">
        ₺
      </span>
    </div>
  );
});

CurrencyInput.displayName = "CurrencyInput";
