import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import { parseCurrency } from "@/lib/format";
import type { TablesInsert } from "@/types/database";

/* ================================================================
 *  Excel İçe Aktarma — şablon, ayrıştırma, analiz ve içe aktarma
 *
 *  Akıllı varsayılan: Gider Kalemi / Ödeme Türü boş satırlar "Diğer"e
 *  atanır. Tüm eşleştirmeler aksan ve büyük/küçük harf duyarsızdır.
 * ================================================================ */

export type ImportKaynak = "giderler" | "gelirler";

export interface ImportAlan {
  key: string;
  label: string;
  zorunlu: boolean;
}

/**
 * Beklenen sütunlar. Gider Kalemi ve Ödeme Türü boş bırakılabilir;
 * boş satırlar içe aktarmada "Diğer"e atanır.
 */
export const IMPORT_ALANLARI: Record<ImportKaynak, ImportAlan[]> = {
  giderler: [
    { key: "tutar", label: "Tutar", zorunlu: true },
    { key: "giderTuru", label: "Gider Türü", zorunlu: true },
    { key: "giderKalemi", label: "Gider Kalemi", zorunlu: false },
    { key: "odemeTuru", label: "Ödeme Türü", zorunlu: false },
    { key: "aciklama", label: "Açıklama", zorunlu: false },
    { key: "yil", label: "Yıl", zorunlu: true },
    { key: "ay", label: "Ay", zorunlu: true },
  ],
  gelirler: [
    { key: "tutar", label: "Tutar", zorunlu: true },
    { key: "gelirTuru", label: "Gelir Türü", zorunlu: true },
    { key: "yil", label: "Yıl", zorunlu: true },
    { key: "ay", label: "Ay", zorunlu: true },
  ],
};

/** Boş kalem/ödeme türü satırları bu ada atanır. */
const DIGER = "Diğer";

/**
 * Ad eşleştirme için normalleştirme: trim + küçük harf + Türkçe aksan
 * sadeleştirme. "EV GIDERLERI", "Ev Giderleri", "ev giderleri" → aynı.
 * "Diğer", "Diger", "DIĞER" → aynı.
 */
function normalizeAd(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

/* ---- Şablon ---- */

/** Seçili kaynak için örnek satırlı bir .xlsx şablonu indirir. */
export function sablonIndir(kaynak: ImportKaynak): void {
  const basliklar = IMPORT_ALANLARI[kaynak].map((a) => a.label);
  const ornekler: (string | number)[][] =
    kaynak === "giderler"
      ? [
          [1500, "Araç", "Benzin", "Kredi Kartı", "", 2026, 5],
          [850, "Ev Giderleri", "Market", "Nakit", "Haftalık alışveriş", 2026, 5],
        ]
      : [
          [70000, "Maaş - Eş 1", 2026, 5],
          [3000, "Kira Geliri", 2026, 5],
        ];

  const sheet = XLSX.utils.aoa_to_sheet([basliklar, ...ornekler]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Şablon");
  XLSX.writeFile(wb, `butce-takip-${kaynak}-sablon.xlsx`);
}

/* ---- Dosya okuma ---- */

export interface OkunanDosya {
  basliklar: string[];
  satirlar: (string | number | null)[][];
}

/** .xlsx veya .csv dosyasını matris olarak okur. */
export async function dosyaOku(file: File): Promise<OkunanDosya> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetAdi = wb.SheetNames[0];
  const sheet = sheetAdi ? wb.Sheets[sheetAdi] : undefined;
  if (!sheet) throw new Error("Dosyada okunabilir bir sayfa bulunamadı.");

  const matris = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: null,
  });
  if (matris.length === 0) throw new Error("Dosya boş görünüyor.");

  const basliklar = (matris[0] ?? []).map((h) => String(h ?? "").trim());
  const satirlar = matris
    .slice(1)
    .filter((r) => r.some((c) => c !== null && String(c).trim() !== ""));

  return { basliklar, satirlar };
}

/** Dosya başlıklarını beklenen alanlara otomatik eşler (tam eşleşme). */
export function otomatikEslestir(
  basliklar: string[],
  alanlar: ImportAlan[],
): Record<string, number> {
  const eslesme: Record<string, number> = {};
  for (const alan of alanlar) {
    eslesme[alan.key] = basliklar.findIndex(
      (h) => normalizeAd(h) === normalizeAd(alan.label),
    );
  }
  return eslesme;
}

/* ---- Hücre dönüştürme ---- */

function hucreSayi(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  const s = String(v).trim();
  if (!s) return null;
  const dogrudan = Number(s);
  if (!Number.isNaN(dogrudan)) return dogrudan;
  const trParse = parseCurrency(s);
  return trParse || null;
}

function hucreMetin(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/* ---- Analiz ---- */

export interface AnalizSatiri {
  satirNo: number;
  tutar: number;
  giderTuru: string;
  giderKalemi: string;
  odemeTuru: string;
  gelirTuru: string;
  aciklama: string;
  yil: number;
  ay: number;
  gecerli: boolean;
  /** Gider kalemi boş — "Diğer"e atanacak. */
  digerKalem: boolean;
  /** Ödeme türü boş — "Diğer"e atanacak. */
  digerOdeme: boolean;
  hatalar: string[];
}

export interface AnalizSonucu {
  satirlar: AnalizSatiri[];
  gecerliSayi: number;
  hataliSayi: number;
  digerKalemSayi: number;
  digerOdemeSayi: number;
}

/** Eşlenmiş satırları ayrıştırır, doğrular ve "Diğer" atamalarını işaretler. */
export function analizEt(
  kaynak: ImportKaynak,
  ham: (string | number | null)[][],
  eslesme: Record<string, number>,
): AnalizSonucu {
  const hucre = (row: (string | number | null)[], key: string) => {
    const idx = eslesme[key];
    return idx >= 0 ? row[idx] : null;
  };

  const satirlar: AnalizSatiri[] = ham.map((row, i) => {
    const hatalar: string[] = [];

    const tutar = hucreSayi(hucre(row, "tutar"));
    if (tutar === null) hatalar.push("Tutar boş veya sayı değil");
    else if (tutar <= 0) hatalar.push("Tutar sıfırdan büyük olmalı");

    const yil = hucreSayi(hucre(row, "yil"));
    if (yil === null || !Number.isInteger(yil) || yil < 1900 || yil > 2100)
      hatalar.push("Yıl 1900-2100 aralığında olmalı");

    const ay = hucreSayi(hucre(row, "ay"));
    if (ay === null || !Number.isInteger(ay) || ay < 1 || ay > 12)
      hatalar.push("Ay 1-12 aralığında olmalı");

    const giderTuru = hucreMetin(hucre(row, "giderTuru"));
    const giderKalemi = hucreMetin(hucre(row, "giderKalemi"));
    const odemeTuru = hucreMetin(hucre(row, "odemeTuru"));
    const gelirTuru = hucreMetin(hucre(row, "gelirTuru"));
    const aciklama = hucreMetin(hucre(row, "aciklama"));

    if (kaynak === "giderler") {
      if (!giderTuru) hatalar.push("Gider Türü boş");
    } else {
      if (!gelirTuru) hatalar.push("Gelir Türü boş");
    }

    const gecerli = hatalar.length === 0;
    return {
      satirNo: i + 1,
      tutar: tutar ?? 0,
      giderTuru,
      giderKalemi,
      odemeTuru,
      gelirTuru,
      aciklama,
      yil: yil ?? 0,
      ay: ay ?? 0,
      gecerli,
      digerKalem: kaynak === "giderler" && gecerli && !giderKalemi,
      digerOdeme: kaynak === "giderler" && gecerli && !odemeTuru,
      hatalar,
    };
  });

  return {
    satirlar,
    gecerliSayi: satirlar.filter((s) => s.gecerli).length,
    hataliSayi: satirlar.filter((s) => !s.gecerli).length,
    digerKalemSayi: satirlar.filter((s) => s.digerKalem).length,
    digerOdemeSayi: satirlar.filter((s) => s.digerOdeme).length,
  };
}

/* ---- İçe aktarma ---- */

const PARCA_BOYUTU = 500;

export interface ImportSonucu {
  eklenen: number;
  atlanan: number;
  digerKalem: number;
  digerOdeme: number;
}

/**
 * Geçerli satırları içe aktarır. Eksik tanımları (türler, "Diğer" kalemleri,
 * "Diğer" ödeme türü) ve dönemleri otomatik oluşturur.
 */
export async function importEt(
  kaynak: ImportKaynak,
  gecerli: AnalizSatiri[],
  onProgress?: (yapilan: number, toplam: number) => void,
): Promise<ImportSonucu> {
  const supabase = createClient();
  const userId = await getUserId();

  const turMap = new Map<string, string>(); // normalize(ad) -> id
  const kalemMap = new Map<string, string>(); // `${turuId}|||${normalize}` -> id
  const odemeMap = new Map<string, string>();

  /* --- Mevcut master veriyi çek --- */
  if (kaynak === "giderler") {
    const [turRes, kalemRes, odemeRes] = await Promise.all([
      supabase.from("gider_turleri").select("id, name"),
      supabase.from("gider_kalemleri").select("id, name, gider_turu_id"),
      supabase.from("odeme_turleri").select("id, name"),
    ]);
    if (turRes.error) throw turRes.error;
    if (kalemRes.error) throw kalemRes.error;
    if (odemeRes.error) throw odemeRes.error;
    turRes.data.forEach((t) => turMap.set(normalizeAd(t.name), t.id));
    odemeRes.data.forEach((o) => odemeMap.set(normalizeAd(o.name), o.id));
    kalemRes.data.forEach((k) =>
      kalemMap.set(`${k.gider_turu_id}|||${normalizeAd(k.name)}`, k.id),
    );
  } else {
    const turRes = await supabase.from("gelir_turleri").select("id, name");
    if (turRes.error) throw turRes.error;
    turRes.data.forEach((t) => turMap.set(normalizeAd(t.name), t.id));
  }

  /* --- 1. Eksik türleri oluştur --- */
  const eksikTur = new Map<string, string>(); // normalize -> orijinal
  for (const s of gecerli) {
    const ad = kaynak === "giderler" ? s.giderTuru : s.gelirTuru;
    if (ad && !turMap.has(normalizeAd(ad))) {
      eksikTur.set(normalizeAd(ad), ad.trim());
    }
  }
  if (eksikTur.size > 0) {
    const yeniler = [...eksikTur.values()].map((name) => ({
      user_id: userId,
      name,
    }));
    if (kaynak === "giderler") {
      const { data, error } = await supabase
        .from("gider_turleri")
        .insert(yeniler)
        .select("id, name");
      if (error) throw error;
      data.forEach((t) => turMap.set(normalizeAd(t.name), t.id));
    } else {
      const { data, error } = await supabase
        .from("gelir_turleri")
        .insert(yeniler)
        .select("id, name");
      if (error) throw error;
      data.forEach((t) => turMap.set(normalizeAd(t.name), t.id));
    }
  }

  if (kaynak === "giderler") {
    /* --- 2. Eksik ödeme türlerini oluştur (adlı + "Diğer") --- */
    const eksikOdeme = new Map<string, string>();
    let digerOdemeGerekli = false;
    for (const s of gecerli) {
      if (s.digerOdeme) {
        digerOdemeGerekli = true;
      } else if (s.odemeTuru && !odemeMap.has(normalizeAd(s.odemeTuru))) {
        eksikOdeme.set(normalizeAd(s.odemeTuru), s.odemeTuru.trim());
      }
    }
    if (digerOdemeGerekli && !odemeMap.has(normalizeAd(DIGER))) {
      eksikOdeme.set(normalizeAd(DIGER), DIGER);
    }
    if (eksikOdeme.size > 0) {
      const { data, error } = await supabase
        .from("odeme_turleri")
        .insert(
          [...eksikOdeme.values()].map((name) => ({
            user_id: userId,
            name,
            is_default: false,
          })),
        )
        .select("id, name");
      if (error) throw error;
      data.forEach((o) => odemeMap.set(normalizeAd(o.name), o.id));
    }

    /* --- 3. Eksik gider kalemlerini oluştur (adlı + türü başına "Diğer") --- */
    const eksikKalem = new Map<string, { turuId: string; ad: string }>();
    for (const s of gecerli) {
      const turuId = turMap.get(normalizeAd(s.giderTuru));
      if (!turuId) continue;
      const kalemAd = s.digerKalem ? DIGER : s.giderKalemi.trim();
      const key = `${turuId}|||${normalizeAd(kalemAd)}`;
      if (!kalemMap.has(key) && !eksikKalem.has(key)) {
        eksikKalem.set(key, { turuId, ad: kalemAd });
      }
    }
    if (eksikKalem.size > 0) {
      const { data, error } = await supabase
        .from("gider_kalemleri")
        .insert(
          [...eksikKalem.values()].map((k) => ({
            user_id: userId,
            gider_turu_id: k.turuId,
            name: k.ad,
          })),
        )
        .select("id, name, gider_turu_id");
      if (error) throw error;
      data.forEach((k) =>
        kalemMap.set(`${k.gider_turu_id}|||${normalizeAd(k.name)}`, k.id),
      );
    }
  }

  /* --- 4. Eksik dönemleri oluştur --- */
  const donemRes = await supabase.from("donemler").select("id, yil, ay");
  if (donemRes.error) throw donemRes.error;
  const donemMap = new Map<string, string>();
  donemRes.data.forEach((d) => donemMap.set(`${d.yil}-${d.ay}`, d.id));

  const eksikDonem = new Map<string, { yil: number; ay: number }>();
  for (const s of gecerli) {
    const k = `${s.yil}-${s.ay}`;
    if (!donemMap.has(k)) eksikDonem.set(k, { yil: s.yil, ay: s.ay });
  }
  if (eksikDonem.size > 0) {
    const { data, error } = await supabase
      .from("donemler")
      .insert(
        [...eksikDonem.values()].map((d) => ({
          user_id: userId,
          yil: d.yil,
          ay: d.ay,
        })),
      )
      .select("id, yil, ay");
    if (error) throw error;
    data.forEach((d) => donemMap.set(`${d.yil}-${d.ay}`, d.id));
  }

  /* --- 5. Insert nesnelerini hazırla --- */
  let atlanan = 0;
  let digerKalemSayi = 0;
  let digerOdemeSayi = 0;
  const giderEkle: TablesInsert<"giderler">[] = [];
  const gelirEkle: TablesInsert<"gelirler">[] = [];

  for (const s of gecerli) {
    const donemId = donemMap.get(`${s.yil}-${s.ay}`);
    if (!donemId) {
      atlanan++;
      continue;
    }
    if (kaynak === "giderler") {
      const turuId = turMap.get(normalizeAd(s.giderTuru));
      const kalemAd = s.digerKalem ? DIGER : s.giderKalemi;
      const kalemId = turuId
        ? kalemMap.get(`${turuId}|||${normalizeAd(kalemAd)}`)
        : undefined;
      const odemeAd = s.digerOdeme ? DIGER : s.odemeTuru;
      const odemeId = odemeMap.get(normalizeAd(odemeAd));
      if (!turuId || !kalemId || !odemeId) {
        atlanan++;
        continue;
      }
      giderEkle.push({
        user_id: userId,
        tutar: s.tutar,
        gider_turu_id: turuId,
        gider_kalemi_id: kalemId,
        odeme_turu_id: odemeId,
        aciklama: s.aciklama || null,
        donem_id: donemId,
      });
      if (s.digerKalem) digerKalemSayi++;
      if (s.digerOdeme) digerOdemeSayi++;
    } else {
      const turuId = turMap.get(normalizeAd(s.gelirTuru));
      if (!turuId) {
        atlanan++;
        continue;
      }
      gelirEkle.push({
        user_id: userId,
        tutar: s.tutar,
        gelir_turu_id: turuId,
        donem_id: donemId,
      });
    }
  }

  /* --- 6. Toplu ekleme (parçalı) --- */
  let eklenen = 0;
  if (kaynak === "giderler") {
    for (let i = 0; i < giderEkle.length; i += PARCA_BOYUTU) {
      const parca = giderEkle.slice(i, i + PARCA_BOYUTU);
      const { error } = await supabase.from("giderler").insert(parca);
      if (error) throw error;
      eklenen += parca.length;
      onProgress?.(eklenen, giderEkle.length);
    }
  } else {
    for (let i = 0; i < gelirEkle.length; i += PARCA_BOYUTU) {
      const parca = gelirEkle.slice(i, i + PARCA_BOYUTU);
      const { error } = await supabase.from("gelirler").insert(parca);
      if (error) throw error;
      eklenen += parca.length;
      onProgress?.(eklenen, gelirEkle.length);
    }
  }

  return {
    eklenen,
    atlanan,
    digerKalem: digerKalemSayi,
    digerOdeme: digerOdemeSayi,
  };
}
