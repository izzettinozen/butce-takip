/**
 * Yatırım portföyü yardımcı fonksiyonları (Faz 16).
 *
 * İki katman:
 *   1. Saf hesaplama fonksiyonları (netMiktarHesapla, guncelDegerHesapla) —
 *      önceden çekilmiş veri üzerinde senkron çalışır; liste ekranında
 *      her araç için N+1 sorgu açmadan toplu hesaplama yapar.
 *   2. Async DB yardımcıları (getNetMiktar, getGuncelDeger, hasIslemler) —
 *      tek bir araç için doğrudan Supabase'den okur; mutation guard'larında
 *      veya bağımsız kullanımda işe yarar. Aynı matematiği (1)'den çağırır.
 */

import { createClient } from "@/lib/supabase/client";
import type { YatirimArac, YatirimIslem } from "@/types/database";

/* ----------------------------------------------------------------
 * Saf hesaplama (senkron)
 * ---------------------------------------------------------------- */

/**
 * Bir aracın işlemlerinden net miktarı hesaplar:
 *   (toplam alış adet) − (toplam satış adet).
 * Yalnızca birim bazlı araçlar için anlamlıdır; çekme işlemleri ve
 * adet'i olmayan kayıtlar yok sayılır.
 */
export function netMiktarHesapla(
  islemler: Pick<YatirimIslem, "tip" | "adet">[],
): number {
  let net = 0;
  for (const i of islemler) {
    if (i.adet == null) continue;
    if (i.tip === "alis") net += Number(i.adet);
    else if (i.tip === "satis") net -= Number(i.adet);
  }
  return net;
}

/**
 * Aracın güncel değeri:
 *   - Birim bazlı: netMiktar × guncel_fiyat
 *   - Tutar bazlı: guncel_fiyat (doğrudan toplam değer)
 */
export function guncelDegerHesapla(
  arac: Pick<YatirimArac, "tip" | "guncel_fiyat">,
  netMiktar: number,
): number {
  if (arac.tip === "tutar_bazli") return Number(arac.guncel_fiyat);
  return netMiktar * Number(arac.guncel_fiyat);
}

/* ----------------------------------------------------------------
 * Async DB yardımcıları (tek araç)
 * ---------------------------------------------------------------- */

/**
 * Bir araç için net miktar (alış adet − satış adet). Birim bazlı araçlar
 * için sayı, tutar bazlı araçlar için null döner (miktar kavramı yoktur).
 */
export async function getNetMiktar(aracId: string): Promise<number | null> {
  const supabase = createClient();
  const { data: arac, error } = await supabase
    .from("yatirim_araclari")
    .select("tip")
    .eq("id", aracId)
    .single();
  if (error) throw error;
  if (arac.tip === "tutar_bazli") return null;

  const { data, error: islemErr } = await supabase
    .from("yatirim_islemleri")
    .select("tip, adet")
    .eq("arac_id", aracId);
  if (islemErr) throw islemErr;
  return netMiktarHesapla(data);
}

/**
 * Bir aracın güncel değeri:
 *   Birim bazlı: net_miktar × guncel_birim_fiyat
 *   Tutar bazlı: guncel_fiyat (doğrudan toplam değer)
 */
export async function getGuncelDeger(aracId: string): Promise<number> {
  const supabase = createClient();
  const { data: arac, error } = await supabase
    .from("yatirim_araclari")
    .select("tip, guncel_fiyat")
    .eq("id", aracId)
    .single();
  if (error) throw error;
  const net = arac.tip === "tutar_bazli" ? 0 : ((await getNetMiktar(aracId)) ?? 0);
  return guncelDegerHesapla(arac, net);
}

/**
 * Bu araca bağlı en az bir yatırım işlemi var mı?
 * Düzenleme kısıtları ve silme/pasifleştirme guard'ları için kullanılır.
 */
export async function hasIslemler(aracId: string): Promise<boolean> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("yatirim_islemleri")
    .select("id", { count: "exact", head: true })
    .eq("arac_id", aracId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
