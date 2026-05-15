"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import {
  AGG_LABELS,
  DIMENSIONS,
  hesapla,
  hesaplamaParasal,
  pivotDuzlestir,
  pivotSirala,
  type AggId,
  type DimId,
  type PivotNode,
  type PivotSiraAlani,
  type RaporKaynak,
  type RaporSatiri,
} from "@/lib/rapor";
import { ayAdi, formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SATIR_LIMITI = 1000;

/** Hesaplama sonucunu agg'a göre biçimlendirir. */
function degerBicimle(deger: number, agg: AggId): string {
  return hesaplamaParasal(agg)
    ? formatCurrency(deger)
    : formatNumber(deger);
}

interface SiralanabilirBaslikProps {
  baslik: string;
  aktif: boolean;
  artan: boolean;
  onClick: () => void;
  sagaHizali?: boolean;
}

function SiralanabilirBaslik({
  baslik,
  aktif,
  artan,
  onClick,
  sagaHizali,
}: SiralanabilirBaslikProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:text-foreground inline-flex items-center gap-1.5",
        sagaHizali && "flex-row-reverse",
      )}
    >
      {baslik}
      {!aktif ? (
        <ArrowUpDown className="size-3.5 opacity-40" />
      ) : artan ? (
        <ArrowUp className="size-3.5" />
      ) : (
        <ArrowDown className="size-3.5" />
      )}
    </button>
  );
}

/* ================================================================
 *  Pivot (gruplu) tablo
 * ================================================================ */

interface PivotTabloProps {
  nodes: PivotNode[];
  gruplama: DimId[];
  agg: AggId;
  rows: RaporSatiri[];
}

function PivotTablo({ nodes, gruplama, agg, rows }: PivotTabloProps) {
  const [kapali, setKapali] = useState<Set<string>>(new Set());
  const [siraAlani, setSiraAlani] = useState<PivotSiraAlani>("varsayilan");
  const [siraArtan, setSiraArtan] = useState(true);

  const siraliNodes = useMemo(
    () => pivotSirala(nodes, siraAlani, siraArtan),
    [nodes, siraAlani, siraArtan],
  );
  const gorunur = useMemo(
    () => pivotDuzlestir(siraliNodes, kapali),
    [siraliNodes, kapali],
  );

  function toggleKapali(key: string) {
    setKapali((prev) => {
      const yeni = new Set(prev);
      if (yeni.has(key)) yeni.delete(key);
      else yeni.add(key);
      return yeni;
    });
  }

  function sirala(alan: PivotSiraAlani) {
    if (siraAlani === alan) {
      setSiraArtan((a) => !a);
    } else {
      setSiraAlani(alan);
      setSiraArtan(alan === "grup");
    }
  }

  const grupBaslik = gruplama
    .map((d) => DIMENSIONS[d].label)
    .join(" › ");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <SiralanabilirBaslik
              baslik={grupBaslik}
              aktif={siraAlani === "grup"}
              artan={siraArtan}
              onClick={() => sirala("grup")}
            />
          </TableHead>
          <TableHead className="text-right">
            <SiralanabilirBaslik
              baslik={AGG_LABELS[agg]}
              aktif={siraAlani === "deger"}
              artan={siraArtan}
              onClick={() => sirala("deger")}
              sagaHizali
            />
          </TableHead>
          <TableHead className="w-24 text-right">
            <SiralanabilirBaslik
              baslik="Adet"
              aktif={siraAlani === "adet"}
              artan={siraArtan}
              onClick={() => sirala("adet")}
              sagaHizali
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {gorunur.map((node) => {
          const cocukVar = node.cocuklar.length > 0;
          const acik = !kapali.has(node.key);
          return (
            <TableRow key={node.key}>
              <TableCell>
                <div
                  className="flex items-center gap-1.5"
                  style={{ paddingLeft: `${node.depth * 1.25}rem` }}
                >
                  {cocukVar ? (
                    <button
                      type="button"
                      onClick={() => toggleKapali(node.key)}
                      className="hover:bg-muted rounded p-0.5"
                      aria-label={acik ? "Daralt" : "Genişlet"}
                    >
                      {acik ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                  ) : (
                    <span className="w-5" />
                  )}
                  <span
                    className={cn(node.depth === 0 && "font-medium")}
                  >
                    {node.label}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {degerBicimle(node.deger, agg)}
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {node.adet}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-semibold">Genel Toplam</TableCell>
          <TableCell className="text-right font-bold tabular-nums">
            {degerBicimle(hesapla(rows, agg), agg)}
          </TableCell>
          <TableCell className="text-muted-foreground text-right font-semibold tabular-nums">
            {rows.length}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

/* ================================================================
 *  Düz (gruplamasız) tablo
 * ================================================================ */

interface Sutun {
  id: string;
  baslik: string;
  sagaHizali?: boolean;
  deger: (r: RaporSatiri) => string;
  sira: (r: RaporSatiri) => number | string;
}

function DuzTablo({
  kaynak,
  rows,
  agg,
}: {
  kaynak: RaporKaynak;
  rows: RaporSatiri[];
  agg: AggId;
}) {
  const [siraId, setSiraId] = useState("tarih");
  const [siraArtan, setSiraArtan] = useState(false);

  const sutunlar = useMemo<Sutun[]>(() => {
    const tutar: Sutun = {
      id: "tutar",
      baslik: "Tutar",
      sagaHizali: true,
      deger: (r) => formatCurrency(r.tutar),
      sira: (r) => r.tutar,
    };
    const donem: Sutun = {
      id: "donem",
      baslik: "Dönem",
      deger: (r) => `${ayAdi(r.ay)} ${r.yil}`,
      sira: (r) => r.yil * 100 + r.ay,
    };
    const tarih: Sutun = {
      id: "tarih",
      baslik: "Eklenme Tarihi",
      deger: (r) => formatDate(r.createdAt),
      sira: (r) => r.createdAt,
    };
    if (kaynak === "giderler") {
      return [
        tutar,
        {
          id: "giderTuru",
          baslik: "Gider Türü",
          deger: (r) => r.giderTuru || "—",
          sira: (r) => r.giderTuru,
        },
        {
          id: "giderKalemi",
          baslik: "Gider Kalemi",
          deger: (r) => r.giderKalemi || "—",
          sira: (r) => r.giderKalemi,
        },
        {
          id: "odemeTuru",
          baslik: "Ödeme Türü",
          deger: (r) => r.odemeTuru || "—",
          sira: (r) => r.odemeTuru,
        },
        donem,
        tarih,
      ];
    }
    return [
      tutar,
      {
        id: "gelirTuru",
        baslik: "Gelir Türü",
        deger: (r) => r.gelirTuru || "—",
        sira: (r) => r.gelirTuru,
      },
      donem,
      tarih,
    ];
  }, [kaynak]);

  const siraliRows = useMemo(() => {
    const sutun = sutunlar.find((s) => s.id === siraId) ?? sutunlar[0];
    const kopya = [...rows];
    kopya.sort((a, b) => {
      const av = sutun.sira(a);
      const bv = sutun.sira(b);
      let fark = 0;
      if (typeof av === "number" && typeof bv === "number") fark = av - bv;
      else fark = String(av).localeCompare(String(bv), "tr");
      return siraArtan ? fark : -fark;
    });
    return kopya;
  }, [rows, sutunlar, siraId, siraArtan]);

  const gosterilen = siraliRows.slice(0, SATIR_LIMITI);

  function sirala(id: string) {
    if (siraId === id) setSiraArtan((a) => !a);
    else {
      setSiraId(id);
      setSiraArtan(true);
    }
  }

  return (
    <div>
      {rows.length > SATIR_LIMITI && (
        <p className="text-warning bg-warning/10 border-b px-4 py-2 text-sm">
          {formatNumber(rows.length)} kayıttan ilk {SATIR_LIMITI} satır
          gösteriliyor. Daha dar bir filtre uygulayın.
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            {sutunlar.map((s) => (
              <TableHead
                key={s.id}
                className={cn(s.sagaHizali && "text-right")}
              >
                <SiralanabilirBaslik
                  baslik={s.baslik}
                  aktif={siraId === s.id}
                  artan={siraArtan}
                  onClick={() => sirala(s.id)}
                  sagaHizali={s.sagaHizali}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {gosterilen.map((r, i) => (
            <TableRow key={r.id}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              {sutunlar.map((s) => (
                <TableCell
                  key={s.id}
                  className={cn(
                    s.sagaHizali && "text-right tabular-nums",
                    s.id === "tutar" && "font-medium",
                  )}
                >
                  {s.deger(r)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={1} />
            <TableCell className="text-right font-bold tabular-nums">
              {hesaplamaParasal(agg)
                ? formatCurrency(hesapla(rows, agg))
                : formatNumber(hesapla(rows, agg))}
            </TableCell>
            <TableCell
              colSpan={sutunlar.length - 1}
              className="text-muted-foreground font-semibold"
            >
              {AGG_LABELS[agg]} · {formatNumber(rows.length)} kayıt
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

/* ================================================================
 *  Dış bileşen
 * ================================================================ */

interface RaporSonucTabloProps {
  kaynak: RaporKaynak;
  rows: RaporSatiri[];
  gruplama: DimId[];
  agg: AggId;
  pivotNodes: PivotNode[];
}

export function RaporSonucTablo({
  kaynak,
  rows,
  gruplama,
  agg,
  pivotNodes,
}: RaporSonucTabloProps) {
  if (gruplama.length > 0) {
    return (
      <PivotTablo
        nodes={pivotNodes}
        gruplama={gruplama}
        agg={agg}
        rows={rows}
      />
    );
  }
  return <DuzTablo kaynak={kaynak} rows={rows} agg={agg} />;
}
