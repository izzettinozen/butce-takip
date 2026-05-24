import { addMonths, subMonths } from "date-fns";

/** Türkçe kısa ay adları (grafik eksenleri için). */
export const KISA_AYLAR = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
] as const;

/** Grafiklerde kullanılan mavi-mor ağırlıklı renk paleti. */
export const GRAFIK_PALETI = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#818cf8",
  "#c084fc",
  "#7c3aed",
  "#a78bfa",
  "#6d28d9",
  "#c4b5fd",
  "#4f46e5",
] as const;

export const RENK_GELIR = "#10b981";
export const RENK_GIDER = "#ef4444";

/**
 * Bir gider türünün tasarruf/yatırım sayılıp sayılmayacağını belirler.
 * Veritabanındaki `is_investment` boolean kolonuna bakar.
 * Birden fazla yatırım türü olabilir (Altın, BES, Acil Fon vb.).
 */
export function isInvestmentTuru(giderTuru: {
  is_investment: boolean;
}): boolean {
  return giderTuru.is_investment === true;
}

/** Verilen yıl/ay'ın bir önceki ayını döndürür (date-fns ile). */
export function oncekiAy(yil: number, ay: number): { yil: number; ay: number } {
  const d = subMonths(new Date(yil, ay - 1, 1), 1);
  return { yil: d.getFullYear(), ay: d.getMonth() + 1 };
}

/** Verilen yıl/ay'ın bir sonraki ayını döndürür (date-fns ile). */
export function sonrakiAy(yil: number, ay: number): { yil: number; ay: number } {
  const d = addMonths(new Date(yil, ay - 1, 1), 1);
  return { yil: d.getFullYear(), ay: d.getMonth() + 1 };
}

/**
 * Verilen yıl/ay ile biten son 12 ayı (eskiden yeniye) döndürür.
 */
export function son12AyAralik(
  yil: number,
  ay: number,
): { yil: number; ay: number }[] {
  const base = new Date(yil, ay - 1, 1);
  const sonuc: { yil: number; ay: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(base, i);
    sonuc.push({ yil: d.getFullYear(), ay: d.getMonth() + 1 });
  }
  return sonuc;
}

/**
 * İki değer arasındaki yüzde değişimi. Önceki değer 0 ise (kıyas yapılamaz)
 * null döner.
 */
export function trendYuzdesi(
  guncel: number,
  onceki: number,
): number | null {
  if (onceki === 0) return null;
  return ((guncel - onceki) / Math.abs(onceki)) * 100;
}
