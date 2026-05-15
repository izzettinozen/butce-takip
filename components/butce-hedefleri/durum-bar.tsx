import { cn } from "@/lib/utils";

interface DurumBarProps {
  /** Gerçekleşen / Hedef yüzdesi (100'ü aşabilir). */
  yuzde: number;
}

/**
 * Bütçe durumu gösterge çubuğu.
 * %0-70 yeşil · %70-100 sarı · %100+ kırmızı (aşıldı).
 */
export function DurumBar({ yuzde }: DurumBarProps) {
  const barRenk =
    yuzde > 100
      ? "bg-destructive"
      : yuzde >= 70
        ? "bg-warning"
        : "bg-success";
  const metinRenk =
    yuzde > 100
      ? "text-destructive"
      : yuzde >= 70
        ? "text-warning"
        : "text-success";
  const genislik = Math.min(Math.max(yuzde, 0), 100);

  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-2 w-full min-w-20 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full", barRenk)}
          style={{ width: `${genislik}%` }}
        />
      </div>
      <span
        className={cn(
          "w-12 shrink-0 text-right text-xs font-semibold tabular-nums",
          metinRenk,
        )}
      >
        %{yuzde}
      </span>
    </div>
  );
}
