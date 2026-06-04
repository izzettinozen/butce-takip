/**
 * Yatırım Portföyü özet hesaplaması (Faz 16c).
 *
 * İki katman: saf hesaplama (portfoyOzetHesapla) + async DB sarmalayıcı
 * (getPortfoyOzet). Tüm değerler kümülatiftir (tüm zaman).
 */

import { createClient } from "@/lib/supabase/client";
import { guncelDegerHesapla, netMiktarHesapla } from "@/lib/yatirim";
import type {
  YatirimArac,
  YatirimAracTip,
  YatirimIslem,
  YatirimIslemTip,
} from "@/types/database";

/** Detaylı tablo / pasta için araç bazında özet satırı. */
export interface PortfoyAracSatiri {
  id: string;
  ad: string;
  tip: YatirimAracTip;
  aktif: boolean;
  /** Birim bazlı net miktar (tutar bazlı için 0). */
  netMiktar: number;
  /** Bu araca yapılan net yatırım: alış − satış (çekme dahil değil). */
  toplamMaliyet: number;
  guncelDeger: number;
  karZararTL: number;
  /** Toplam maliyet > 0 değilse null. */
  karZararYuzde: number | null;
}

export interface PortfoyOzet {
  /** Net Yatırım = tüm alış − tüm satış − tüm çekme. */
  toplamYatirilan: number;
  /** Tüm araçların güncel değerleri toplamı. */
  mevcutDeger: number;
  karZararTL: number;
  /** Toplam yatırılan > 0 değilse null. */
  karZararYuzde: number | null;
  araclar: PortfoyAracSatiri[];
  /** Herhangi bir birim bazlı araçta net miktar negatif mi (tutarsızlık). */
  negatifMiktarVar: boolean;
}

type IslemOzet = Pick<YatirimIslem, "tip" | "adet" | "tutar">;

/** Önceden çekilmiş araç ve işlem listesinden portföy özetini hesaplar. */
export function portfoyOzetHesapla(
  araclar: YatirimArac[],
  islemler: Pick<YatirimIslem, "arac_id" | "tip" | "adet" | "tutar">[],
): PortfoyOzet {
  // İşlemleri araca göre grupla; araçsız (çekme) global toplamlara girer.
  const aracGrup = new Map<string, IslemOzet[]>();
  let alisAll = 0;
  let satisAll = 0;
  let cekmeAll = 0;
  for (const i of islemler) {
    const tutar = Number(i.tutar);
    if (i.tip === "alis") alisAll += tutar;
    else if (i.tip === "satis") satisAll += tutar;
    else if (i.tip === "cekme") cekmeAll += tutar;
    if (i.arac_id) {
      const arr = aracGrup.get(i.arac_id) ?? [];
      arr.push({ tip: i.tip, adet: i.adet, tutar: i.tutar });
      aracGrup.set(i.arac_id, arr);
    }
  }

  const toplamYatirilan = alisAll - satisAll - cekmeAll;

  let negatifMiktarVar = false;
  const satirlar: PortfoyAracSatiri[] = araclar.map((a) => {
    const grup = aracGrup.get(a.id) ?? [];
    const netMiktar = netMiktarHesapla(grup);
    if (a.tip === "birim_bazli" && netMiktar < 0) negatifMiktarVar = true;

    let alis = 0;
    let satis = 0;
    for (const i of grup) {
      if (i.tip === "alis") alis += Number(i.tutar);
      else if (i.tip === "satis") satis += Number(i.tutar);
    }
    const toplamMaliyet = alis - satis;
    const guncelDeger = guncelDegerHesapla(a, netMiktar);
    const karZararTL = guncelDeger - toplamMaliyet;
    const karZararYuzde =
      toplamMaliyet > 0 ? (karZararTL / toplamMaliyet) * 100 : null;

    return {
      id: a.id,
      ad: a.ad,
      tip: a.tip,
      aktif: a.aktif,
      netMiktar,
      toplamMaliyet,
      guncelDeger,
      karZararTL,
      karZararYuzde,
    };
  });

  // Güncel değere göre büyükten küçüğe.
  satirlar.sort((a, b) => b.guncelDeger - a.guncelDeger);

  const mevcutDeger = satirlar.reduce((s, r) => s + r.guncelDeger, 0);
  const karZararTL = mevcutDeger - toplamYatirilan;
  const karZararYuzde =
    toplamYatirilan > 0 ? (karZararTL / toplamYatirilan) * 100 : null;

  return {
    toplamYatirilan,
    mevcutDeger,
    karZararTL,
    karZararYuzde,
    araclar: satirlar,
    negatifMiktarVar,
  };
}

/** Kullanıcının portföy özetini Supabase'den okuyup hesaplar. */
export async function getPortfoyOzet(userId: string): Promise<PortfoyOzet> {
  const supabase = createClient();
  const [aracRes, islemRes] = await Promise.all([
    supabase.from("yatirim_araclari").select("*").eq("user_id", userId),
    supabase
      .from("yatirim_islemleri")
      .select("arac_id, tip, adet, tutar")
      .eq("user_id", userId),
  ]);
  if (aracRes.error) throw aracRes.error;
  if (islemRes.error) throw islemRes.error;
  return portfoyOzetHesapla(
    aracRes.data,
    islemRes.data as {
      arac_id: string | null;
      tip: YatirimIslemTip;
      adet: number | null;
      tutar: number;
    }[],
  );
}
