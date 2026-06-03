/**
 * Bekleyen Nakit hesaplaması (Faz 16b).
 *
 * Bekleyen Nakit = yatırım havuzuna ayrılan ama henüz bir araca
 * dağıtılmamış (alış yapılmamış) tutar. Moda göre havuz farklı tanımlanır:
 *
 *   Tasarruf modu: havuz = (Tüm Gelir) − (Saf Gider)
 *     Saf Gider = is_investment=false olan giderler.
 *   Gider modu:    havuz = (is_investment=true gider türleri toplamı)
 *
 *   Bekleyen Nakit = havuz − (Alış) + (Satış) − (Çekme)
 *
 * Tümü kümülatiftir (tüm zaman, dönem filtresi yok). Negatif değer
 * olduğu gibi döner; uyarı 16c Portföy sayfasında gösterilir.
 */

import { createClient } from "@/lib/supabase/client";
import type { DashboardInvestmentMode } from "@/lib/dashboard";

/** getBekleyenNakit'in saf çekirdeği — önceden toplanmış değerlerle çalışır. */
export interface BekleyenNakitGirdi {
  /** Tüm gelir toplamı. */
  gelirToplam: number;
  /** Saf gider toplamı (is_investment=false). */
  safGiderToplam: number;
  /** Yatırım gider türü toplamı (is_investment=true). */
  yatirimGiderToplam: number;
  /** Tüm alış işlemleri tutar toplamı. */
  alisToplam: number;
  /** Tüm satış işlemleri tutar toplamı. */
  satisToplam: number;
  /** Tüm çekme işlemleri tutar toplamı. */
  cekmeToplam: number;
}

/** Bekleyen nakiti moda göre hesaplar (saf fonksiyon). */
export function bekleyenNakitHesapla(
  g: BekleyenNakitGirdi,
  mode: DashboardInvestmentMode,
): number {
  const havuz =
    mode === "savings"
      ? g.gelirToplam - g.safGiderToplam
      : g.yatirimGiderToplam;
  return havuz - g.alisToplam + g.satisToplam - g.cekmeToplam;
}

/**
 * Kullanıcının bekleyen nakitini Supabase'den okuyup hesaplar.
 * Tüm gelir/gider/işlem verisi tek seferde çekilir (kümülatif).
 */
export async function getBekleyenNakit(
  userId: string,
  mode: DashboardInvestmentMode,
): Promise<number> {
  const supabase = createClient();

  const [gelirRes, giderRes, islemRes] = await Promise.all([
    supabase.from("gelirler").select("tutar").eq("user_id", userId),
    supabase
      .from("giderler")
      .select("tutar, gider_turleri(is_investment)")
      .eq("user_id", userId),
    supabase
      .from("yatirim_islemleri")
      .select("tip, tutar")
      .eq("user_id", userId),
  ]);

  if (gelirRes.error) throw gelirRes.error;
  if (giderRes.error) throw giderRes.error;
  if (islemRes.error) throw islemRes.error;

  const gelirToplam = gelirRes.data.reduce((s, g) => s + Number(g.tutar), 0);

  let safGiderToplam = 0;
  let yatirimGiderToplam = 0;
  for (const g of giderRes.data) {
    const tutar = Number(g.tutar);
    if (g.gider_turleri?.is_investment) yatirimGiderToplam += tutar;
    else safGiderToplam += tutar;
  }

  let alisToplam = 0;
  let satisToplam = 0;
  let cekmeToplam = 0;
  for (const i of islemRes.data) {
    const tutar = Number(i.tutar);
    if (i.tip === "alis") alisToplam += tutar;
    else if (i.tip === "satis") satisToplam += tutar;
    else if (i.tip === "cekme") cekmeToplam += tutar;
  }

  return bekleyenNakitHesapla(
    {
      gelirToplam,
      safGiderToplam,
      yatirimGiderToplam,
      alisToplam,
      satisToplam,
      cekmeToplam,
    },
    mode,
  );
}
