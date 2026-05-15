"use client";

import { Layers } from "lucide-react";

import { DIMENSIONS, type DimId } from "@/lib/rapor";
import { cn } from "@/lib/utils";

interface GruplamaSeciciProps {
  /** Kaynağa göre kullanılabilir boyutlar. */
  dimler: DimId[];
  /** Sıralı seçili boyutlar. */
  secili: DimId[];
  onChange: (secili: DimId[]) => void;
  /** Tek seçim modu (grafik görünümleri için). */
  tekSecim?: boolean;
}

/**
 * Gruplama seçici. Tablo görünümünde sıralı çoklu seçim (numaralı),
 * grafik görünümünde tek seçim modunda çalışır.
 */
export function GruplamaSecici({
  dimler,
  secili,
  onChange,
  tekSecim = false,
}: GruplamaSeciciProps) {
  function toggle(d: DimId) {
    if (secili.includes(d)) {
      onChange(secili.filter((x) => x !== d));
    } else if (tekSecim) {
      onChange([d]);
    } else {
      onChange([...secili, d]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
        <Layers className="size-4" />
        Grupla:
      </span>
      {dimler.map((d) => {
        const sira = secili.indexOf(d);
        const aktif = sira >= 0;
        return (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
              aktif
                ? "bg-gradient-primary border-transparent text-white shadow-sm shadow-indigo-500/30"
                : "hover:bg-muted",
            )}
          >
            {aktif && !tekSecim && (
              <span className="flex size-4 items-center justify-center rounded-full bg-white/25 text-[10px] font-semibold">
                {sira + 1}
              </span>
            )}
            {DIMENSIONS[d].label}
          </button>
        );
      })}
    </div>
  );
}
