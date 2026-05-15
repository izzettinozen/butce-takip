import { format } from "date-fns";
import { tr } from "date-fns/locale";

/**
 * Tutarı Türkçe TL formatında biçimlendirir. Örn: 43.000,50 ₺
 */
export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? Number(value) : value ?? 0;
  if (Number.isNaN(num)) return "0,00 ₺";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Tutarı kısa TL formatında biçimlendirir (ondalıksız). Örn: 1.500 ₺
 * Geniş tablolarda (matris) yer kazanmak için kullanılır.
 */
export function formatCurrencyShort(
  value: number | string | null | undefined,
): string {
  const num = typeof value === "string" ? Number(value) : (value ?? 0);
  if (Number.isNaN(num)) return "0 ₺";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Sayıyı Türkçe formatında biçimlendirir (binlik nokta, ondalık virgül).
 */
export function formatNumber(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? Number(value) : value ?? 0;
  if (Number.isNaN(num)) return "0";
  return new Intl.NumberFormat("tr-TR").format(num);
}

/**
 * Yüzde değerini Türkçe formatında biçimlendirir. Örn: %12,5
 */
export function formatPercent(value: number | null | undefined): string {
  const num = value ?? 0;
  if (Number.isNaN(num)) return "%0";
  return `%${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(num)}`;
}

/**
 * Tarihi Türkçe locale ile biçimlendirir. Varsayılan: "dd MMM yyyy HH:mm"
 */
export function formatDate(
  value: string | Date | null | undefined,
  pattern = "dd MMM yyyy HH:mm",
): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, pattern, { locale: tr });
}

/** Türkçe ay adları (1 = Ocak). */
export const AY_ADLARI = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

/** Ay numarasından (1-12) Türkçe ay adı döndürür. */
export function ayAdi(ay: number): string {
  return AY_ADLARI[ay - 1] ?? "";
}

/**
 * Sayıyı para giriş alanı için TR formatına çevirir.
 * Örn: 1500.5 -> "1.500,50"
 */
export function numberToAmountInput(value: number): string {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Türkçe formatlı para metnini (örn: "43.000,50") sayıya çevirir.
 */
export function parseCurrency(value: string): number {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = Number(normalized);
  return Number.isNaN(num) ? 0 : num;
}
