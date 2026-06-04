/**
 * Yatırım Portföyü trend hesaplaması (Faz 16c).
 *
 * Portföyün zaman içindeki toplam değerini, yalnızca FİYAT GÜNCELLEMESİ
 * olan tarihlerde (snapshot) hesaplar (interpolation yok):
 *
 *   değer(D) = Σ_araç [ (D tarihindeki net miktar) × (D itibarıyla son fiyat) ]
 *
 * - Birim bazlı araç: net miktar × o tarihteki birim fiyat
 * - Tutar bazlı araç: o tarihteki fiyat (= toplam değer) doğrudan
 *
 * Tam seri bir kez hesaplanır; aralık filtresi ve downsampling görünümde
 * uygulanır (aralık değişince yeniden veri çekilmez).
 */

import { subMonths } from "date-fns";

import { createClient } from "@/lib/supabase/client";
import type { YatirimAracTip, YatirimIslemTip } from "@/types/database";

export type TrendAralik = "1A" | "6A" | "1Y" | "tum";

export interface PortfoyTrendNoktasi {
  /** yyyy-MM-dd */
  tarih: string;
  deger: number;
}

interface TrendArac {
  id: string;
  tip: YatirimAracTip;
}
interface TrendFiyat {
  arac_id: string;
  kayit_tarihi: string;
  fiyat: number;
}
interface TrendIslem {
  arac_id: string | null;
  tarih: string;
  tip: YatirimIslemTip;
  adet: number | null;
}

/** Her aralık için maksimum gösterilecek nokta sayısı (downsampling). */
const ARALIK_MAX: Record<TrendAralik, number> = {
  "1A": 30,
  "6A": 26,
  "1Y": 12,
  tum: 60,
};

/**
 * Tam trend serisini hesaplar (tüm snapshot tarihleri, tarih ASC).
 * Saf fonksiyon — önceden çekilmiş veriyle çalışır.
 */
export function portfoyTrendHesapla(
  araclar: TrendArac[],
  fiyatGecmisi: TrendFiyat[],
  islemler: TrendIslem[],
): PortfoyTrendNoktasi[] {
  // Araç başına fiyat noktaları (tarih ASC).
  const fiyatByArac = new Map<string, { tarih: string; fiyat: number }[]>();
  for (const f of fiyatGecmisi) {
    const arr = fiyatByArac.get(f.arac_id) ?? [];
    arr.push({ tarih: f.kayit_tarihi, fiyat: Number(f.fiyat) });
    fiyatByArac.set(f.arac_id, arr);
  }
  for (const arr of fiyatByArac.values()) {
    arr.sort((a, b) => a.tarih.localeCompare(b.tarih));
  }

  // Araç başına işlemler (tarih ASC), yalnızca araçlı (alış/satış) olanlar.
  const islemByArac = new Map<string, { tarih: string; tip: YatirimIslemTip; adet: number | null }[]>();
  for (const i of islemler) {
    if (!i.arac_id) continue;
    const arr = islemByArac.get(i.arac_id) ?? [];
    arr.push({ tarih: i.tarih, tip: i.tip, adet: i.adet });
    islemByArac.set(i.arac_id, arr);
  }
  for (const arr of islemByArac.values()) {
    arr.sort((a, b) => a.tarih.localeCompare(b.tarih));
  }

  // Snapshot tarihleri = tüm fiyat güncelleme tarihlerinin birleşimi (ASC).
  const tarihSet = new Set<string>();
  for (const f of fiyatGecmisi) tarihSet.add(f.kayit_tarihi);
  const snapshotTarihler = [...tarihSet].sort((a, b) => a.localeCompare(b));

  const tipByArac = new Map<string, YatirimAracTip>();
  for (const a of araclar) tipByArac.set(a.id, a.tip);

  const noktalar: PortfoyTrendNoktasi[] = [];
  for (const D of snapshotTarihler) {
    let toplam = 0;
    for (const a of araclar) {
      const fiyatlar = fiyatByArac.get(a.id);
      if (!fiyatlar || fiyatlar.length === 0) continue;
      // D itibarıyla son fiyat (tarih <= D).
      let fiyat: number | null = null;
      for (const p of fiyatlar) {
        if (p.tarih <= D) fiyat = p.fiyat;
        else break;
      }
      if (fiyat === null) continue; // araç o tarihte henüz yoktu

      if (a.tip === "tutar_bazli") {
        toplam += fiyat;
      } else {
        // D'ye kadar net miktar.
        let net = 0;
        const isl = islemByArac.get(a.id) ?? [];
        for (const x of isl) {
          if (x.tarih > D) break;
          if (x.adet == null) continue;
          if (x.tip === "alis") net += Number(x.adet);
          else if (x.tip === "satis") net -= Number(x.adet);
        }
        toplam += net * fiyat;
      }
    }
    noktalar.push({ tarih: D, deger: toplam });
  }

  return noktalar;
}

/** Noktaları seçili aralığa göre filtreler (bugüne göre geriye doğru). */
export function filtreAralik(
  noktalar: PortfoyTrendNoktasi[],
  aralik: TrendAralik,
  bugun: Date,
): PortfoyTrendNoktasi[] {
  if (aralik === "tum") return noktalar;
  const aySayisi = aralik === "1A" ? 1 : aralik === "6A" ? 6 : 12;
  const sinir = subMonths(bugun, aySayisi);
  const p = (n: number) => String(n).padStart(2, "0");
  const sinirStr = `${sinir.getFullYear()}-${p(sinir.getMonth() + 1)}-${p(
    sinir.getDate(),
  )}`;
  return noktalar.filter((n) => n.tarih >= sinirStr);
}

/**
 * Nokta sayısını max'a indirir; ilk ve son nokta korunur, aradakiler
 * eşit aralıkla seçilir. Zaten azsa olduğu gibi döner.
 */
export function downsampleTrend(
  noktalar: PortfoyTrendNoktasi[],
  max: number,
): PortfoyTrendNoktasi[] {
  if (noktalar.length <= max) return noktalar;
  const step = (noktalar.length - 1) / (max - 1);
  const idx = new Set<number>();
  for (let i = 0; i < max; i++) idx.add(Math.round(i * step));
  idx.add(noktalar.length - 1); // son nokta daima
  return [...idx].sort((a, b) => a - b).map((i) => noktalar[i]);
}

/** Aralık filtresi + downsampling'i birlikte uygular (görünüm için). */
export function trendGorunum(
  tamSeri: PortfoyTrendNoktasi[],
  aralik: TrendAralik,
  bugun: Date,
): PortfoyTrendNoktasi[] {
  const filtreli = filtreAralik(tamSeri, aralik, bugun);
  return downsampleTrend(filtreli, ARALIK_MAX[aralik]);
}

/** Kullanıcının portföy trend tam serisini Supabase'den okuyup hesaplar. */
export async function getPortfoyTrend(
  userId: string,
): Promise<PortfoyTrendNoktasi[]> {
  const supabase = createClient();
  const [aracRes, fiyatRes, islemRes] = await Promise.all([
    supabase.from("yatirim_araclari").select("id, tip").eq("user_id", userId),
    supabase
      .from("yatirim_arac_fiyat_gecmisi")
      .select("arac_id, kayit_tarihi, fiyat"),
    supabase
      .from("yatirim_islemleri")
      .select("arac_id, tarih, tip, adet")
      .eq("user_id", userId),
  ]);
  if (aracRes.error) throw aracRes.error;
  if (fiyatRes.error) throw fiyatRes.error;
  if (islemRes.error) throw islemRes.error;
  return portfoyTrendHesapla(
    aracRes.data,
    fiyatRes.data as TrendFiyat[],
    islemRes.data as TrendIslem[],
  );
}
