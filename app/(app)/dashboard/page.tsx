"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, Percent, PiggyBank, Receipt } from "lucide-react";

import { useDashboard, type DashGider } from "@/hooks/use-dashboard";
import { useDonemler } from "@/hooks/use-donemler";
import {
  isInvestmentTuru,
  KISA_AYLAR,
  oncekiAy,
  trendYuzdesi,
} from "@/lib/dashboard";
import { AY_ADLARI, formatCurrency, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import {
  AylikYatirimChart,
  ButceBarChart,
  GelirGiderTrendChart,
  GiderTuruDonutChart,
  OdemeTuruPieChart,
  TopKalemlerBarChart,
} from "@/components/dashboard/charts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Belirli yıl/ay için kayıtların tutar toplamı. */
function aylikTutar(
  rows: { yil: number; ay: number; tutar: number }[],
  yil: number,
  ay: number,
): number {
  return rows.reduce(
    (s, r) => (r.yil === yil && r.ay === ay ? s + r.tutar : s),
    0,
  );
}

/** Belirli yıl için kayıtların tutar toplamı. */
function yillikTutar(
  rows: { yil: number; tutar: number }[],
  yil: number,
): number {
  return rows.reduce((s, r) => (r.yil === yil ? s + r.tutar : s), 0);
}

/** KPI kartlarının kapsamı. */
type KpiMode = "aylik" | "yillik";

/** Tutarları bir anahtara göre gruplayıp toplar. */
function gruplaTopla(
  rows: DashGider[],
  anahtar: (g: DashGider) => string,
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = anahtar(r);
    map.set(k, (map.get(k) ?? 0) + r.tutar);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

export default function DashboardPage() {
  const [currentYear] = useState(() => new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().getMonth() + 1,
  );
  const [kpiMode, setKpiMode] = useState<KpiMode>("aylik");

  const { data: donemler, isLoading: donemlerLoading } = useDonemler();
  const { data, isLoading: dashLoading, isError } = useDashboard();

  const loading = donemlerLoading || dashLoading;

  // Mevcut yıllar.
  const yillar = useMemo(() => {
    const set = new Set<number>();
    (donemler ?? []).forEach((d) => set.add(d.yil));
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [donemler, currentYear]);

  const effectiveYear = yillar.includes(selectedYear)
    ? selectedYear
    : (yillar[0] ?? currentYear);

  const selectedDonem = useMemo(
    () =>
      (donemler ?? []).find(
        (d) => d.yil === effectiveYear && d.ay === selectedMonth,
      ),
    [donemler, effectiveYear, selectedMonth],
  );

  const giderler = useMemo(() => data?.giderler ?? [], [data]);
  const gelirler = useMemo(() => data?.gelirler ?? [], [data]);
  const hedefler = useMemo(() => data?.hedefler ?? [], [data]);

  // Yatırım = is_investment=true olan tür(ler). Birden fazla olabilir
  // (Altın, BES, Acil Fon vb.). Saf gider = yatırım olmayan giderler.
  const safGiderler = useMemo(
    () => giderler.filter((g) => !isInvestmentTuru(g)),
    [giderler],
  );
  const yatirimGiderler = useMemo(
    () => giderler.filter((g) => isInvestmentTuru(g)),
    [giderler],
  );

  /* ---- KPI hesaplamaları (aylık veya yıllık kapsam) ---- */
  const kpi = useMemo(() => {
    // Seçili kapsama göre (aylık/yıllık) dönem toplamı.
    const donemToplam = (
      rows: { yil: number; ay: number; tutar: number }[],
      yil: number,
      ay: number,
    ) =>
      kpiMode === "yillik"
        ? yillikTutar(rows, yil)
        : aylikTutar(rows, yil, ay);

    const onceki =
      kpiMode === "yillik"
        ? { yil: effectiveYear - 1, ay: selectedMonth }
        : oncekiAy(effectiveYear, selectedMonth);

    const buGelir = donemToplam(gelirler, effectiveYear, selectedMonth);
    const buSafGider = donemToplam(safGiderler, effectiveYear, selectedMonth);
    const buYatirim = donemToplam(
      yatirimGiderler,
      effectiveYear,
      selectedMonth,
    );
    // Tasarruf oranı = Yatırım / Gelir × 100. Gelir 0 ise %0.
    const buTasarrufOrani = buGelir > 0 ? (buYatirim / buGelir) * 100 : 0;

    const gecenGelir = donemToplam(gelirler, onceki.yil, onceki.ay);
    const gecenSafGider = donemToplam(safGiderler, onceki.yil, onceki.ay);
    const gecenYatirim = donemToplam(yatirimGiderler, onceki.yil, onceki.ay);
    // Geçen dönemde gelir yoksa oran kıyaslaması yapılamaz.
    const gecenOran =
      gecenGelir > 0 ? (gecenYatirim / gecenGelir) * 100 : null;

    return {
      buGelir,
      buSafGider,
      buYatirim,
      buTasarrufOrani,
      gelirTrend: trendYuzdesi(buGelir, gecenGelir),
      safGiderTrend: trendYuzdesi(buSafGider, gecenSafGider),
      yatirimTrend: trendYuzdesi(buYatirim, gecenYatirim),
      // Puan farkı: bu dönem oranı − geçen dönem oranı.
      tasarrufTrend:
        gecenOran !== null ? buTasarrufOrani - gecenOran : null,
    };
  }, [
    gelirler,
    safGiderler,
    yatirimGiderler,
    effectiveYear,
    selectedMonth,
    kpiMode,
  ]);

  /* ---- Grafik 1: Seçili yılın 12 ayı (gider = saf gider, yatırım hariç) ---- */
  const trendData = useMemo(
    () =>
      KISA_AYLAR.map((ad, i) => ({
        ay: ad,
        gelir: aylikTutar(gelirler, effectiveYear, i + 1),
        gider: aylikTutar(safGiderler, effectiveYear, i + 1),
      })),
    [safGiderler, gelirler, effectiveYear],
  );

  /* ---- Seçili ay giderleri (tümü — bütçe hedefi karşılaştırması için) ---- */
  const ayGiderleri = useMemo(
    () =>
      giderler.filter(
        (g) => g.yil === effectiveYear && g.ay === selectedMonth,
      ),
    [giderler, effectiveYear, selectedMonth],
  );

  /* ---- Seçili ay saf giderleri (gider grafikleri için — yatırım hariç) ---- */
  const aySafGiderler = useMemo(
    () => ayGiderleri.filter((g) => !isInvestmentTuru(g)),
    [ayGiderleri],
  );

  /* ---- Grafik 2: Gider türü dağılımı (yatırım türü hariç) ---- */
  const giderTuruData = useMemo(
    () =>
      gruplaTopla(aySafGiderler, (g) => g.giderTuru).sort(
        (a, b) => b.value - a.value,
      ),
    [aySafGiderler],
  );

  /* ---- Grafik 3: Ödeme türü dağılımı (saf giderler — yatırım hariç) ---- */
  const odemeData = useMemo(() => {
    const tumu = gruplaTopla(aySafGiderler, (g) => g.odemeTuru);
    const ana: { name: string; value: number }[] = [];
    let diger = 0;
    for (const o of tumu) {
      if (o.name === "Nakit" || o.name === "Kredi Kartı") ana.push(o);
      else diger += o.value;
    }
    if (diger > 0) ana.push({ name: "Diğer", value: diger });
    return ana.sort((a, b) => b.value - a.value);
  }, [aySafGiderler]);

  /* ---- Grafik 4: Bütçe hedefi vs gerçekleşen ---- */
  const butceData = useMemo(() => {
    if (!selectedDonem) return [];
    return hedefler
      .filter((h) => h.donemId === selectedDonem.id)
      .map((h) => ({
        turu: h.giderTuru,
        hedef: h.hedefTutar,
        gercek: ayGiderleri
          .filter((g) => g.giderTuruId === h.giderTuruId)
          .reduce((s, g) => s + g.tutar, 0),
      }));
  }, [hedefler, selectedDonem, ayGiderleri]);

  /* ---- Grafik 5: En çok harcanan 5 kalem (saf giderler — yatırım hariç) ---- */
  const topKalemler = useMemo(
    () =>
      gruplaTopla(aySafGiderler, (g) => g.giderKalemi)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((k) => ({ kalem: k.name, tutar: k.value })),
    [aySafGiderler],
  );

  /* ---- Grafik 6: Aylık yatırım tutarı (12 ay, kümülatif değil) ---- */
  const yatirimData = useMemo(
    () =>
      KISA_AYLAR.map((kisaAd, i) => ({
        ay: kisaAd,
        ayTam: AY_ADLARI[i],
        tutar: aylikTutar(yatirimGiderler, effectiveYear, i + 1),
      })),
    [yatirimGiderler, effectiveYear],
  );

  /* Yıllık ortalama = toplam yatırım / 12 (basit). */
  const yatirimOrtalama = useMemo(
    () => yatirimData.reduce((s, d) => s + d.tutar, 0) / 12,
    [yatirimData],
  );

  /* ---- Boş durum bayrağı ---- */
  const trendBos = trendData.every((d) => d.gelir === 0 && d.gider === 0);

  const kpiTrendLabel =
    kpiMode === "yillik" ? "geçen yıla göre" : "geçen aya göre";

  const giderlerLinki = (
    <Button asChild variant="outline" size="sm">
      <Link href="/giderler">Giderler&apos;e Git</Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Seçili döneme ait gelir, gider ve bütçe durumunuzun genel görünümü."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={kpiMode}
            onValueChange={(v) => setKpiMode(v as KpiMode)}
          >
            <TabsList>
              <TabsTrigger
                value="aylik"
                className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Aylık
              </TabsTrigger>
              <TabsTrigger
                value="yillik"
                className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Yıllık
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select
            value={String(effectiveYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yillar.map((yil) => (
                <SelectItem key={yil} value={String(yil)}>
                  {yil}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(Number(v))}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AY_ADLARI.map((adi, index) => (
                <SelectItem key={adi} value={String(index + 1)}>
                  {adi}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {loading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground text-sm">
            Dashboard verileri yüklenirken bir hata oluştu.
          </p>
        </Card>
      ) : (
        <>
          {/* KPI kartları */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              title="Toplam Gelir"
              value={formatCurrency(kpi.buGelir)}
              icon={Banknote}
              trend={kpi.gelirTrend}
              trendLabel={kpiTrendLabel}
            />
            <KpiCard
              title="Saf Gider"
              value={formatCurrency(kpi.buSafGider)}
              icon={Receipt}
              trend={kpi.safGiderTrend}
              trendLabel={kpiTrendLabel}
              tooltip="Yatırım hariç giderler"
              iconClassName="bg-destructive/15 text-destructive"
            />
            <KpiCard
              title="Yatırım"
              value={formatCurrency(kpi.buYatirim)}
              icon={PiggyBank}
              trend={kpi.yatirimTrend}
              trendLabel={kpiTrendLabel}
            />
            <KpiCard
              title="Tasarruf Oranı"
              value={formatPercent(kpi.buTasarrufOrani)}
              icon={Percent}
              trend={kpi.tasarrufTrend}
              trendBirim="puan"
              trendLabel={kpiTrendLabel}
              valueClassName={
                kpi.buTasarrufOrani >= 20
                  ? "text-success"
                  : kpi.buTasarrufOrani >= 10
                    ? "text-warning"
                    : "text-destructive"
              }
            />
          </div>

          {/* Grafikler */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* 1 — tam genişlik */}
            <div className="lg:col-span-2">
              <ChartCard
                title={`${effectiveYear} Aylık Gelir-Gider Trendi`}
                description="Ocak – Aralık"
                isEmpty={trendBos}
                emptyMessage={`${effectiveYear} yılında kayıtlı gelir veya gider yok.`}
                emptyAction={giderlerLinki}
              >
                <GelirGiderTrendChart data={trendData} />
              </ChartCard>
            </div>

            {/* 2 */}
            <ChartCard
              title="Gider Türü Dağılımı"
              description={`${AY_ADLARI[selectedMonth - 1]} ${effectiveYear}`}
              isEmpty={giderTuruData.length === 0}
              emptyMessage="Bu dönemde gider kaydı yok."
              emptyAction={giderlerLinki}
            >
              <GiderTuruDonutChart data={giderTuruData} />
            </ChartCard>

            {/* 3 */}
            <ChartCard
              title="Nakit vs Kredi Kartı"
              description={`${AY_ADLARI[selectedMonth - 1]} ${effectiveYear}`}
              isEmpty={odemeData.length === 0}
              emptyMessage="Bu dönemde gider kaydı yok."
              emptyAction={giderlerLinki}
            >
              <OdemeTuruPieChart data={odemeData} />
            </ChartCard>

            {/* 4 */}
            <ChartCard
              title="Bütçe Hedefi vs Gerçekleşen"
              description={`${AY_ADLARI[selectedMonth - 1]} ${effectiveYear}`}
              isEmpty={butceData.length === 0}
              emptyMessage="Bu dönem için bütçe hedefi tanımlanmamış."
              emptyAction={
                <Button asChild variant="outline" size="sm">
                  <Link href="/butce-hedefleri">Bütçe Hedefi Ekle</Link>
                </Button>
              }
            >
              <ButceBarChart data={butceData} />
            </ChartCard>

            {/* 5 */}
            <ChartCard
              title="En Çok Harcanan 5 Kalem"
              description={`${AY_ADLARI[selectedMonth - 1]} ${effectiveYear}`}
              isEmpty={topKalemler.length === 0}
              emptyMessage="Bu dönemde gider kaydı yok."
              emptyAction={giderlerLinki}
            >
              <TopKalemlerBarChart data={topKalemler} />
            </ChartCard>

            {/* 6 — tam genişlik */}
            <div className="lg:col-span-2">
              <ChartCard
                title="Aylık Yatırım Tutarı"
                description={String(effectiveYear)}
              >
                <AylikYatirimChart
                  data={yatirimData}
                  ortalama={yatirimOrtalama}
                  yil={effectiveYear}
                />
              </ChartCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Dashboard yükleniyor iskeleti. */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="mt-4 h-4 w-24" />
            <Skeleton className="mt-2 h-7 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-64 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
