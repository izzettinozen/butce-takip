import * as XLSX from "xlsx";

import { ayAdi } from "@/lib/format";

/* ================================================================
 *  Raporlar — tipler, boyutlar, filtreleme, pivot ve Excel
 * ================================================================ */

export type RaporKaynak = "giderler" | "gelirler";

/** Rapor için normalleştirilmiş tek satır (gider veya gelir). */
export interface RaporSatiri {
  id: string;
  tutar: number;
  yil: number;
  ay: number;
  createdAt: string;
  giderTuruId: string;
  giderTuru: string;
  giderKalemiId: string;
  giderKalemi: string;
  odemeTuruId: string;
  odemeTuru: string;
  gelirTuruId: string;
  gelirTuru: string;
}

/* ---- Boyutlar (gruplama / eksen) ---- */

export type DimId =
  | "yil"
  | "ay"
  | "giderTuru"
  | "giderKalemi"
  | "odemeTuru"
  | "gelirTuru";

export interface Dimension {
  id: DimId;
  label: string;
  /** Satırın bu boyuttaki grup etiketi. */
  deger: (r: RaporSatiri) => string;
  /** Gruplar arası doğal sıralama anahtarı. */
  sira: (r: RaporSatiri) => number | string;
}

export const DIMENSIONS: Record<DimId, Dimension> = {
  yil: {
    id: "yil",
    label: "Yıl",
    deger: (r) => String(r.yil),
    sira: (r) => r.yil,
  },
  ay: {
    id: "ay",
    label: "Ay",
    deger: (r) => ayAdi(r.ay),
    sira: (r) => r.ay,
  },
  giderTuru: {
    id: "giderTuru",
    label: "Gider Türü",
    deger: (r) => r.giderTuru || "—",
    sira: (r) => r.giderTuru,
  },
  giderKalemi: {
    id: "giderKalemi",
    label: "Gider Kalemi",
    deger: (r) => r.giderKalemi || "—",
    sira: (r) => r.giderKalemi,
  },
  odemeTuru: {
    id: "odemeTuru",
    label: "Ödeme Türü",
    deger: (r) => r.odemeTuru || "—",
    sira: (r) => r.odemeTuru,
  },
  gelirTuru: {
    id: "gelirTuru",
    label: "Gelir Türü",
    deger: (r) => r.gelirTuru || "—",
    sira: (r) => r.gelirTuru,
  },
};

/** Veri kaynağına göre kullanılabilir boyutlar. */
export function kaynakDimleri(kaynak: RaporKaynak): DimId[] {
  return kaynak === "giderler"
    ? ["yil", "ay", "giderTuru", "giderKalemi", "odemeTuru"]
    : ["yil", "ay", "gelirTuru"];
}

/* ---- Hesaplama ---- */

export type AggId = "toplam" | "ortalama" | "adet" | "min" | "max";

export const AGG_LABELS: Record<AggId, string> = {
  toplam: "Toplam",
  ortalama: "Ortalama",
  adet: "Adet",
  min: "En Az",
  max: "En Çok",
};

/** Bir satır kümesi üzerinde seçili hesaplamayı uygular. */
export function hesapla(rows: RaporSatiri[], agg: AggId): number {
  if (rows.length === 0) return 0;
  const tutarlar = rows.map((r) => r.tutar);
  switch (agg) {
    case "toplam":
      return tutarlar.reduce((s, v) => s + v, 0);
    case "ortalama":
      return tutarlar.reduce((s, v) => s + v, 0) / rows.length;
    case "adet":
      return rows.length;
    case "min":
      return Math.min(...tutarlar);
    case "max":
      return Math.max(...tutarlar);
  }
}

/** Hesaplama parasal mı (Adet değil)? */
export function hesaplamaParasal(agg: AggId): boolean {
  return agg !== "adet";
}

/* ---- Filtreler ---- */

export interface RaporFiltre {
  yillar: number[];
  aylar: number[];
  giderTuruIds: string[];
  giderKalemiIds: string[];
  odemeTuruIds: string[];
  gelirTuruIds: string[];
  minTutar: string;
  maxTutar: string;
  baslangic: string; // YYYY-MM-DD
  bitis: string; // YYYY-MM-DD
}

export function bosFiltre(): RaporFiltre {
  return {
    yillar: [],
    aylar: [],
    giderTuruIds: [],
    giderKalemiIds: [],
    odemeTuruIds: [],
    gelirTuruIds: [],
    minTutar: "",
    maxTutar: "",
    baslangic: "",
    bitis: "",
  };
}

/** Aktif (varsayılandan farklı) filtre sayısı. */
export function aktifFiltreSayisi(f: RaporFiltre): number {
  let n = 0;
  if (f.yillar.length) n++;
  if (f.aylar.length) n++;
  if (f.giderTuruIds.length) n++;
  if (f.giderKalemiIds.length) n++;
  if (f.odemeTuruIds.length) n++;
  if (f.gelirTuruIds.length) n++;
  if (f.minTutar.trim()) n++;
  if (f.maxTutar.trim()) n++;
  if (f.baslangic) n++;
  if (f.bitis) n++;
  return n;
}

/** Satırları filtreye göre süzer. */
export function filtrele(
  rows: RaporSatiri[],
  f: RaporFiltre,
): RaporSatiri[] {
  const min = f.minTutar.trim() ? Number(f.minTutar) : null;
  const max = f.maxTutar.trim() ? Number(f.maxTutar) : null;

  return rows.filter((r) => {
    if (f.yillar.length && !f.yillar.includes(r.yil)) return false;
    if (f.aylar.length && !f.aylar.includes(r.ay)) return false;
    if (f.giderTuruIds.length && !f.giderTuruIds.includes(r.giderTuruId))
      return false;
    if (
      f.giderKalemiIds.length &&
      !f.giderKalemiIds.includes(r.giderKalemiId)
    )
      return false;
    if (f.odemeTuruIds.length && !f.odemeTuruIds.includes(r.odemeTuruId))
      return false;
    if (f.gelirTuruIds.length && !f.gelirTuruIds.includes(r.gelirTuruId))
      return false;
    if (min !== null && !Number.isNaN(min) && r.tutar < min) return false;
    if (max !== null && !Number.isNaN(max) && r.tutar > max) return false;
    if (f.baslangic && r.createdAt < f.baslangic) return false;
    // Bitiş günü dahil olsun diye gün sonuna kadar.
    if (f.bitis && r.createdAt > `${f.bitis}T23:59:59`) return false;
    return true;
  });
}

/* ---- Pivot ---- */

export interface PivotNode {
  key: string;
  label: string;
  depth: number;
  deger: number;
  adet: number;
  sira: number | string;
  cocuklar: PivotNode[];
}

function siraKarsilastir(
  a: number | string,
  b: number | string,
): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "tr");
}

/** Ordered boyutlara göre hiyerarşik pivot ağacı kurar. */
export function pivotKur(
  rows: RaporSatiri[],
  dimIds: DimId[],
  agg: AggId,
  depth = 0,
  parentKey = "",
): PivotNode[] {
  if (depth >= dimIds.length) return [];
  const dim = DIMENSIONS[dimIds[depth]];

  const gruplar = new Map<string, RaporSatiri[]>();
  for (const r of rows) {
    const k = dim.deger(r);
    const liste = gruplar.get(k);
    if (liste) liste.push(r);
    else gruplar.set(k, [r]);
  }

  const nodes: PivotNode[] = [...gruplar.entries()].map(
    ([label, grupRows]) => {
      const key = `${parentKey}/${depth}:${label}`;
      return {
        key,
        label,
        depth,
        deger: hesapla(grupRows, agg),
        adet: grupRows.length,
        sira: dim.sira(grupRows[0]),
        cocuklar: pivotKur(grupRows, dimIds, agg, depth + 1, key),
      };
    },
  );

  nodes.sort((a, b) => siraKarsilastir(a.sira, b.sira));
  return nodes;
}

export type PivotSiraAlani = "varsayilan" | "grup" | "deger" | "adet";

/** Pivot ağacını her seviyede verilen alana göre yeniden sıralar. */
export function pivotSirala(
  nodes: PivotNode[],
  alan: PivotSiraAlani,
  artan: boolean,
): PivotNode[] {
  if (alan === "varsayilan") return nodes;
  const sirali = [...nodes].sort((a, b) => {
    let fark = 0;
    if (alan === "grup") fark = a.label.localeCompare(b.label, "tr");
    else if (alan === "deger") fark = a.deger - b.deger;
    else fark = a.adet - b.adet;
    return artan ? fark : -fark;
  });
  return sirali.map((n) => ({
    ...n,
    cocuklar: pivotSirala(n.cocuklar, alan, artan),
  }));
}

/** Görünür (collapse edilmemiş) pivot satırlarını düz listeye çevirir. */
export function pivotDuzlestir(
  nodes: PivotNode[],
  kapali: Set<string>,
): PivotNode[] {
  const out: PivotNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.cocuklar.length > 0 && !kapali.has(n.key)) {
      out.push(...pivotDuzlestir(n.cocuklar, kapali));
    }
  }
  return out;
}

/* ---- Excel ---- */

/** Verilen başlık ve satırlardan xlsx dosyası indirir. */
export function excelIndir(
  basliklar: string[],
  satirlar: (string | number)[][],
  dosyaAdiOnek = "rapor",
): void {
  const aoa = [basliklar, ...satirlar];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Rapor");

  const bugun = new Date();
  const tarih = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, "0")}-${String(bugun.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(workbook, `${dosyaAdiOnek}-${tarih}.xlsx`);
}
