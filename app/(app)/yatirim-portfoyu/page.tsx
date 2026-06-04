"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Coins,
  Percent,
  PiggyBank,
  Plus,
  Scale,
  Wallet,
} from "lucide-react";

import { usePortfoyOzet, usePortfoyTrend } from "@/hooks/use-portfoy";
import { useBekleyenNakit } from "@/hooks/use-bekleyen-nakit";
import { useProfile } from "@/hooks/use-profile";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { trendGorunum, type TrendAralik } from "@/lib/portfoy-trend";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/empty-state";
import {
  PortfoyPastaChart,
  PortfoyTrendChart,
  type PastaDilim,
} from "@/components/yatirim-portfoyu/portfoy-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ARALIKLAR: { value: TrendAralik; label: string }[] = [
  { value: "1A", label: "1A" },
  { value: "6A", label: "6A" },
  { value: "1Y", label: "1Y" },
  { value: "tum", label: "Tümü" },
];

/** İşaretli yüzde: "+%5,0" / "−%5,0" / "—". */
function yuzdeIsaretli(v: number | null): string {
  if (v === null) return "—";
  return (v >= 0 ? "+" : "−") + formatPercent(Math.abs(v));
}

/** Kâr/zarar değerine göre yeşil/kırmızı renk sınıfı. */
function kzRenk(v: number): string {
  return v >= 0 ? "text-success" : "text-destructive";
}

export default function YatirimPortfoyuPage() {
  const router = useRouter();
  const [aralik, setAralik] = useState<TrendAralik>("1Y");

  const { data: ozet, isLoading, isError, refetch } = usePortfoyOzet();
  const { data: trendSeri } = usePortfoyTrend();
  const { data: bekleyenNakit } = useBekleyenNakit();
  const { data: profil } = useProfile();
  const mode = profil?.dashboardInvestmentMode ?? "savings";

  const negatifBekleyen = (bekleyenNakit ?? 0) < 0;

  // Pasta verisi: araç güncel değerleri + bekleyen nakit dilimi, %3 altı "Diğer".
  const pastaData = useMemo<PastaDilim[]>(() => {
    if (!ozet) return [];
    const dilimler: PastaDilim[] = ozet.araclar
      .filter((a) => a.guncelDeger > 0)
      .map((a) => ({ name: a.ad, value: a.guncelDeger }));
    if ((bekleyenNakit ?? 0) > 0) {
      dilimler.push({ name: "Bekleyen Nakit", value: bekleyenNakit! });
    }
    const toplam = dilimler.reduce((s, d) => s + d.value, 0);
    if (toplam <= 0) return [];
    const buyuk: PastaDilim[] = [];
    let digerToplam = 0;
    for (const d of dilimler) {
      if (d.value / toplam < 0.03) digerToplam += d.value;
      else buyuk.push(d);
    }
    if (digerToplam > 0) buyuk.push({ name: "Diğer", value: digerToplam });
    return buyuk;
  }, [ozet, bekleyenNakit]);

  // Trend görünümü: aralık filtresi + downsampling + etiket.
  const trendData = useMemo(() => {
    const seri = trendGorunum(trendSeri ?? [], aralik, new Date());
    return seri.map((n) => ({
      label: formatDate(n.tarih, "dd MMM yy"),
      deger: n.deger,
    }));
  }, [trendSeri, aralik]);

  // ---- Yükleniyor / hata / boş sayfa ----
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Yatırım Portföyü"
          description="Tüm zamanlardaki yatırımlarınız özet halinde gösteriliyor."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !ozet) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Yatırım Portföyü"
          description="Tüm zamanlardaki yatırımlarınız özet halinde gösteriliyor."
        />
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Portföy yüklenirken bir hata oluştu.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Tekrar dene
          </Button>
        </Card>
      </div>
    );
  }

  if (ozet.araclar.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Yatırım Portföyü"
          description="Tüm zamanlardaki yatırımlarınız özet halinde gösteriliyor."
        />
        <Card className="py-0">
          <EmptyState
            icon={PiggyBank}
            title="Yatırım takibine başlayın"
            description="Yatırım araçlarınızı ekleyerek portföyünüzü takip etmeye başlayın."
            action={
              <Button
                onClick={() => router.push("/yatirim-araclari")}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                İlk Yatırım Aracını Ekle
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const bekleyenNakitTooltip =
    mode === "savings"
      ? "Gelir − Saf Gider − Net Yatırım"
      : "Yatırım gider türü − Net Yatırım";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yatırım Portföyü"
        description="Tüm zamanlardaki yatırımlarınız özet halinde gösteriliyor."
      />

      {/* 5 KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Toplam Yatırılan"
          value={formatCurrency(ozet.toplamYatirilan)}
          icon={Wallet}
          trend={null}
          trendLabel="şu an yatırımda olan net tutar"
        />
        <KpiCard
          title="Mevcut Değer"
          value={formatCurrency(ozet.mevcutDeger)}
          icon={Coins}
          trend={null}
          trendLabel="araçların güncel toplam değeri"
        />
        <KpiCard
          title="Kâr / Zarar"
          value={formatCurrency(ozet.karZararTL)}
          valueClassName={kzRenk(ozet.karZararTL)}
          icon={Scale}
          trend={null}
          trendLabel="mevcut değer − toplam yatırılan"
        />
        <KpiCard
          title="Kâr / Zarar %"
          value={yuzdeIsaretli(ozet.karZararYuzde)}
          valueClassName={
            ozet.karZararYuzde === null ? undefined : kzRenk(ozet.karZararYuzde)
          }
          icon={Percent}
          trend={null}
          trendLabel="getiri oranı"
        />
        <KpiCard
          title="Bekleyen Nakit"
          value={
            bekleyenNakit === undefined ? "…" : formatCurrency(bekleyenNakit)
          }
          valueClassName={negatifBekleyen ? "text-destructive" : undefined}
          icon={PiggyBank}
          trend={null}
          trendLabel="araçlara dağıtılmamış tutar"
          tooltip={bekleyenNakitTooltip}
        />
      </div>

      {/* Tutarsızlık uyarıları (koşullu) */}
      {(ozet.negatifMiktarVar || negatifBekleyen) && (
        <div className="space-y-3">
          {ozet.negatifMiktarVar && (
            <UyariKutusu
              baslik="Tutarsızlık Tespit Edildi"
              mesaj="Bazı araçlarda satılan miktar alınan miktardan fazla. İşlem geçmişinizi kontrol edin."
            />
          )}
          {negatifBekleyen && (
            <UyariKutusu
              baslik="Bekleyen Nakit Negatif"
              mesaj="Yatırım araçlarına yatırılan tutar, havuzunuzdaki tutardan fazla. Yatırım gider kayıtlarınızı veya işlemlerinizi kontrol edin."
            />
          )}
        </div>
      )}

      {/* Grafikler */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Araç Dağılımı"
          description="Güncel değere göre yüzde dağılımı"
          isEmpty={pastaData.length === 0}
          emptyMessage="Dağılım için güncel değeri olan araç yok."
        >
          <PortfoyPastaChart data={pastaData} />
        </ChartCard>

        <Card>
          <div className="flex flex-col gap-3 p-6 pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Portföy Trendi</h3>
              <p className="text-muted-foreground text-sm">
                Fiyat güncellemesi olan tarihlerdeki toplam değer
              </p>
            </div>
            <div className="bg-muted/50 inline-flex gap-1 self-start rounded-lg border p-1">
              {ARALIKLAR.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAralik(a.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    aralik === a.value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6 pt-3">
            {trendData.length < 2 ? (
              <div className="text-muted-foreground flex h-72 items-center justify-center text-center text-sm">
                Bu aralıkta portföy trendi için yeterli veri yok.
              </div>
            ) : (
              <PortfoyTrendChart data={trendData} />
            )}
          </div>
        </Card>
      </div>

      {/* Detaylı tablo */}
      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-card sticky left-0">Ad</TableHead>
                <TableHead className="text-right">Toplam Maliyet</TableHead>
                <TableHead className="text-right">Güncel Değer</TableHead>
                <TableHead className="text-right">Kâr/Zarar</TableHead>
                <TableHead className="text-right">Kâr/Zarar %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ozet.araclar.map((a) => (
                <TableRow
                  key={a.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() =>
                    router.push(`/yatirim-islemleri?arac=${a.id}`)
                  }
                >
                  <TableCell
                    className={cn(
                      "bg-card sticky left-0 font-medium",
                      !a.aktif && "text-muted-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {a.ad}
                      {!a.aktif && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium"
                        >
                          Pasif
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(a.toplamMaliyet)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(a.guncelDeger)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      kzRenk(a.karZararTL),
                    )}
                  >
                    {formatCurrency(a.karZararTL)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      a.karZararYuzde !== null && kzRenk(a.karZararYuzde),
                    )}
                  >
                    {yuzdeIsaretli(a.karZararYuzde)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

/** Koşullu tutarsızlık uyarı kutusu (amber). */
function UyariKutusu({ baslik, mesaj }: { baslik: string; mesaj: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{baslik}</p>
        <p className="mt-0.5 text-sm">{mesaj}</p>
      </div>
    </div>
  );
}
