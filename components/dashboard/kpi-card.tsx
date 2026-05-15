import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  /** Biçimlendirilmiş ana değer (örn. "12.500,00 ₺" veya "%24,5"). */
  value: string;
  icon: LucideIcon;
  /** Önceki döneme göre yüzde değişim. null ise kıyas yapılamıyor demektir. */
  trend: number | null;
  /** Trend göstergesinin altındaki açıklama (örn. "geçen aya göre"). */
  trendLabel?: string;
  /** Ana değere uygulanacak ek renk sınıfı (net durum için). */
  valueClassName?: string;
}

/** Dashboard üst bölümündeki tekil KPI kartı. */
export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel = "geçen aya göre",
  valueClassName,
}: KpiCardProps) {
  const trendYukari = trend !== null && trend >= 0;

  return (
    <Card className="gap-0 p-5">
      <div className="flex items-start justify-between">
        <div className="bg-gradient-primary flex size-10 items-center justify-center rounded-xl text-white shadow-sm shadow-indigo-500/30">
          <Icon className="size-5" />
        </div>

        {trend === null ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trendYukari
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {trendYukari ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            %{Math.abs(trend).toFixed(1).replace(".", ",")}
          </span>
        )}
      </div>

      <p className="text-muted-foreground mt-4 text-sm">{title}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{trendLabel}</p>
    </Card>
  );
}
