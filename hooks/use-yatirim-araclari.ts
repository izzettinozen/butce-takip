import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import { netMiktarHesapla } from "@/lib/yatirim";
import { portfoyKey } from "@/hooks/use-portfoy";
import type {
  TablesUpdate,
  YatirimArac,
  YatirimAracTip,
  YatirimIslemTip,
} from "@/types/database";

export const yatirimAraclariKey = ["yatirim_araclari"] as const;
export const yatirimAracOzetleriKey = ["yatirim_arac_ozetleri"] as const;

/** Bir araç için işlem özeti: net miktar + işlemi var mı. */
export interface AracOzet {
  netMiktar: number;
  hasIslem: boolean;
}

/** Kullanıcının yatırım araçlarını ada göre (DB sıralı) getirir. */
export function useYatirimAraclari() {
  return useQuery({
    queryKey: yatirimAraclariKey,
    queryFn: async (): Promise<YatirimArac[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("yatirim_araclari")
        .select("*")
        .order("ad", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Tüm işlemleri tek seferde çekip araç bazında özet (netMiktar + hasIslem)
 * üretir. Liste ekranında her satır için ayrı sorgu açmamak içindir.
 * Faz 16a'da henüz işlem girilemez → harita boş döner.
 */
export function useYatirimAracOzetleri() {
  return useQuery({
    queryKey: yatirimAracOzetleriKey,
    queryFn: async (): Promise<Record<string, AracOzet>> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("yatirim_islemleri")
        .select("arac_id, tip, adet");
      if (error) throw error;

      const gruplar = new Map<
        string,
        { tip: YatirimIslemTip; adet: number | null }[]
      >();
      for (const i of data) {
        if (!i.arac_id) continue; // çekme işlemleri araca bağlı değil
        const arr = gruplar.get(i.arac_id) ?? [];
        arr.push({ tip: i.tip, adet: i.adet });
        gruplar.set(i.arac_id, arr);
      }

      const ozet: Record<string, AracOzet> = {};
      for (const [aracId, islemler] of gruplar) {
        ozet[aracId] = {
          netMiktar: netMiktarHesapla(islemler),
          hasIslem: islemler.length > 0,
        };
      }
      return ozet;
    },
  });
}

/** Yeni yatırım aracı ekler. Trigger ilk fiyatı geçmişe yazar. */
export function useCreateYatirimArac() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ad,
      tip,
      birim,
      guncel_fiyat,
    }: {
      ad: string;
      tip: YatirimAracTip;
      birim: string | null;
      guncel_fiyat: number;
    }) => {
      const supabase = createClient();
      const user_id = await getUserId();
      const { error } = await supabase.from("yatirim_araclari").insert({
        user_id,
        ad: ad.trim(),
        tip,
        // tutar bazlı araçta birim daima NULL (CHECK constraint)
        birim: tip === "birim_bazli" ? (birim?.trim() || null) : null,
        guncel_fiyat,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yatirimAraclariKey });
      // Portföy özeti + trend araç fiyat/varlık değişiminden etkilenir
      queryClient.invalidateQueries({ queryKey: portfoyKey });
    },
  });
}

/**
 * Yatırım aracını günceller. Ad ve güncel fiyat her zaman; tip ve birim
 * yalnızca işlemi olmayan araçlarda gönderilir (çağıran tarafça kısıtlanır).
 */
export function useUpdateYatirimArac() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ad,
      guncel_fiyat,
      tip,
      birim,
    }: {
      id: string;
      ad: string;
      guncel_fiyat: number;
      tip?: YatirimAracTip;
      birim?: string | null;
    }) => {
      const supabase = createClient();
      const patch: TablesUpdate<"yatirim_araclari"> = {
        ad: ad.trim(),
        guncel_fiyat,
      };
      // tip/birim yalnızca kilitsiz (işlemsiz) araçta gelir
      if (tip) {
        patch.tip = tip;
        patch.birim = tip === "birim_bazli" ? (birim?.trim() || null) : null;
      }
      const { error } = await supabase
        .from("yatirim_araclari")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yatirimAraclariKey });
      // Portföy özeti + trend araç fiyat/varlık değişiminden etkilenir
      queryClient.invalidateQueries({ queryKey: portfoyKey });
    },
  });
}

/** Hızlı fiyat güncelleme (inline) — yalnızca guncel_fiyat. */
export function useUpdateYatirimAracFiyat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      guncel_fiyat,
    }: {
      id: string;
      guncel_fiyat: number;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("yatirim_araclari")
        .update({ guncel_fiyat })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yatirimAraclariKey });
      // Portföy özeti + trend araç fiyat/varlık değişiminden etkilenir
      queryClient.invalidateQueries({ queryKey: portfoyKey });
    },
  });
}

/** Aracı aktifleştirir / pasifleştirir. Bakiye kontrolü çağıran tarafça yapılır. */
export function useToggleYatirimAracAktif() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, aktif }: { id: string; aktif: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("yatirim_araclari")
        .update({ aktif })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yatirimAraclariKey });
      // Portföy özeti + trend araç fiyat/varlık değişiminden etkilenir
      queryClient.invalidateQueries({ queryKey: portfoyKey });
    },
  });
}

/**
 * Yatırım aracını siler. İşlemi varsa veritabanı FK kısıtı engeller
 * (çağıran taraf zaten önceden hasIslem kontrolüyle uyarır).
 * Fiyat geçmişi CASCADE ile birlikte silinir.
 */
export function useDeleteYatirimArac() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("yatirim_araclari")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: yatirimAraclariKey });
      // Portföy özeti + trend araç fiyat/varlık değişiminden etkilenir
      queryClient.invalidateQueries({ queryKey: portfoyKey });
    },
  });
}
