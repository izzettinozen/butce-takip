"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download, Filter, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useRapor } from "@/hooks/use-rapor";
import {
  AGG_LABELS,
  aktifFiltreSayisi,
  bosFiltre,
  excelIndir,
  filtrele,
  hesapla,
  kaynakDimleri,
  pivotDuzlestir,
  pivotKur,
  type AggId,
  type DimId,
  type RaporFiltre,
  type RaporKaynak,
} from "@/lib/rapor";
import { ayAdi, formatDate, formatNumber } from "@/lib/format";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/table-skeleton";
import { RaporFiltreler } from "@/components/raporlar/rapor-filtreler";
import { RaporSonucTablo } from "@/components/raporlar/rapor-sonuc-tablo";
import { RaporGrafik, type GrafikTuru } from "@/components/raporlar/rapor-grafik";
import { GruplamaSecici } from "@/components/raporlar/gruplama-secici";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Gorunum = "tablo" | GrafikTuru;

const gradientTab =
  "data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-sm";

export default function RaporlarPage() {
  const [currentYear] = useState(() => new Date().getFullYear());
  const [kaynak, setKaynak] = useState<RaporKaynak>("giderler");
  const [filtre, setFiltre] = useState<RaporFiltre>(bosFiltre);
  const [gruplama, setGruplama] = useState<DimId[]>([]);
  const [agg, setAgg] = useState<AggId>("toplam");
  const [gorunum, setGorunum] = useState<Gorunum>("tablo");
  const [mobilFiltreAcik, setMobilFiltreAcik] = useState(false);

  const { data: rawRows, isLoading, isError } = useRapor(kaynak);

  const mevcutYillar = useMemo(() => {
    const set = new Set<number>([currentYear]);
    (rawRows ?? []).forEach((r) => {
      if (r.yil > 0) set.add(r.yil);
    });
    return [...set].sort((a, b) => b - a);
  }, [rawRows, currentYear]);

  const filtrelenmis = useMemo(
    () => filtrele(rawRows ?? [], filtre),
    [rawRows, filtre],
  );

  const pivotNodes = useMemo(
    () =>
      gruplama.length > 0
        ? pivotKur(filtrelenmis, gruplama, agg)
        : [],
    [filtrelenmis, gruplama, agg],
  );

  const aktifSayi = aktifFiltreSayisi(filtre);
  const dimler = kaynakDimleri(kaynak);

  function handleKaynak(yeni: string) {
    setKaynak(yeni as RaporKaynak);
    setFiltre(bosFiltre());
    setGruplama([]);
  }

  function handleSifirla() {
    setGruplama([]);
    setAgg("toplam");
    setGorunum("tablo");
  }

  /** Görünüm değişince grafik modunda gruplamayı tek seçime indirger. */
  function handleGorunum(v: Gorunum) {
    setGorunum(v);
    if (v !== "tablo" && gruplama.length > 1) {
      setGruplama(gruplama.slice(0, 1));
    }
  }

  function handleExcel() {
    try {
      if (gruplama.length > 0) {
        const duz = pivotDuzlestir(
          pivotKur(filtrelenmis, gruplama, agg),
          new Set(),
        );
        const satirlar: (string | number)[][] = duz.map((n) => [
          "  ".repeat(n.depth) + n.label,
          n.deger,
          n.adet,
        ]);
        satirlar.push([
          "Genel Toplam",
          hesapla(filtrelenmis, agg),
          filtrelenmis.length,
        ]);
        excelIndir(["Grup", AGG_LABELS[agg], "Adet"], satirlar);
      } else if (kaynak === "giderler") {
        excelIndir(
          ["Tutar", "Gider Türü", "Gider Kalemi", "Ödeme Türü", "Dönem", "Eklenme Tarihi"],
          filtrelenmis.map((r) => [
            r.tutar,
            r.giderTuru || "—",
            r.giderKalemi || "—",
            r.odemeTuru || "—",
            `${ayAdi(r.ay)} ${r.yil}`,
            formatDate(r.createdAt),
          ]),
        );
      } else {
        excelIndir(
          ["Tutar", "Gelir Türü", "Dönem", "Eklenme Tarihi"],
          filtrelenmis.map((r) => [
            r.tutar,
            r.gelirTuru || "—",
            `${ayAdi(r.ay)} ${r.yil}`,
            formatDate(r.createdAt),
          ]),
        );
      }
      toast.success("Excel dosyası indirildi");
    } catch (error) {
      toast.error("Dışa aktarma başarısız", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  const sonucBos = filtrelenmis.length === 0;
  const grafikGorunumu = gorunum !== "tablo";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar"
        description="Gelir ve giderlerinizi dinamik olarak filtreleyin, gruplayın ve analiz edin."
      >
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            onClick={handleExcel}
            disabled={isLoading || sonucBos}
          >
            <Download className="size-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Yazdır
          </Button>
        </div>
      </PageHeader>

      {/* Veri kaynağı */}
      <div className="print:hidden">
        <Tabs value={kaynak} onValueChange={handleKaynak}>
          <TabsList>
            <TabsTrigger value="giderler" className={gradientTab}>
              Giderler
            </TabsTrigger>
            <TabsTrigger value="gelirler" className={gradientTab}>
              Gelirler
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Görünüm kontrolleri */}
      <div className="flex flex-col gap-3 print:hidden lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <GruplamaSecici
            dimler={dimler}
            secili={gruplama}
            onChange={setGruplama}
            tekSecim={grafikGorunumu}
          />
          {grafikGorunumu && (
            <p className="text-muted-foreground text-xs">
              Grafik görünümünde yalnızca bir gruplama kullanılır.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={agg} onValueChange={(v) => setAgg(v as AggId)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(AGG_LABELS) as AggId[]).map((a) => (
                <SelectItem key={a} value={a}>
                  {AGG_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={gorunum}
            onValueChange={(v) => handleGorunum(v as Gorunum)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tablo">Tablo</SelectItem>
              <SelectItem value="bar">Bar Grafik</SelectItem>
              <SelectItem value="line">Çizgi Grafik</SelectItem>
              <SelectItem value="pie">Pasta Grafik</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleSifirla}>
            <RotateCcw className="size-4" />
            Sıfırla
          </Button>

          {/* Mobil filtre */}
          <Sheet open={mobilFiltreAcik} onOpenChange={setMobilFiltreAcik}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <Filter className="size-4" />
                Filtreler
                {aktifSayi > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {aktifSayi}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtreler</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-6">
                <RaporFiltreler
                  kaynak={kaynak}
                  filtre={filtre}
                  setFiltre={setFiltre}
                  mevcutYillar={mevcutYillar}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Özet satırı */}
      <p className="text-muted-foreground text-sm">
        Şu an gösterilen:{" "}
        <span className="text-foreground font-medium">
          {formatNumber(filtrelenmis.length)} kayıt
        </span>
        {aktifSayi > 0 && (
          <>
            {" · "}
            <span className="text-foreground font-medium">
              {aktifSayi} filtre aktif
            </span>
          </>
        )}
      </p>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Masaüstü filtre paneli */}
        <aside className="hidden lg:block print:hidden">
          <Card className="sticky top-20 p-4">
            <RaporFiltreler
              kaynak={kaynak}
              filtre={filtre}
              setFiltre={setFiltre}
              mevcutYillar={mevcutYillar}
            />
          </Card>
        </aside>

        {/* Sonuç */}
        <Card className="overflow-hidden py-0">
          {isLoading ? (
            <TableSkeleton columns={["Grup", "Değer", "Adet"]} />
          ) : isError ? (
            <div className="px-6 py-16 text-center">
              <p className="text-muted-foreground text-sm">
                Rapor verileri yüklenirken bir hata oluştu.
              </p>
            </div>
          ) : sonucBos ? (
            <EmptyState
              icon={BarChart3}
              title="Eşleşen kayıt bulunamadı"
              description="Seçtiğiniz filtrelerle eşleşen kayıt yok. Filtreleri gevşetmeyi deneyin."
              action={
                aktifSayi > 0 ? (
                  <Button
                    variant="outline"
                    onClick={() => setFiltre(bosFiltre())}
                  >
                    Filtreleri Temizle
                  </Button>
                ) : undefined
              }
            />
          ) : grafikGorunumu && gruplama.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-muted-foreground text-sm">
                Grafik görünümü için en az bir gruplama boyutu seçin.
              </p>
            </div>
          ) : grafikGorunumu ? (
            <div className="p-4">
              <RaporGrafik
                nodes={pivotNodes}
                tur={gorunum as GrafikTuru}
                agg={agg}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <RaporSonucTablo
                kaynak={kaynak}
                rows={filtrelenmis}
                gruplama={gruplama}
                agg={agg}
                pivotNodes={pivotNodes}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
