import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import { yatirimAracOzetleriKey } from "@/hooks/use-yatirim-araclari";
import { bekleyenNakitKey } from "@/hooks/use-bekleyen-nakit";
import type {
  YatirimAracTip,
  YatirimIslem,
  YatirimIslemTip,
} from "@/types/database";

export const yatirimIslemleriKey = ["yatirim_islemleri"] as const;

/** Liste satırı — işlem + bağlı aracın adı/tipi/birimi (join). */
export interface YatirimIslemRow extends YatirimIslem {
  aracAd: string | null;
  aracTip: YatirimAracTip | null;
  aracBirim: string | null;
}

/** Yeni/güncelleme işlemi için form sonrası temizlenmiş veri. */
export interface YatirimIslemInput {
  tarih: string;
  tip: YatirimIslemTip;
  arac_id: string | null;
  birim_fiyat: number | null;
  adet: number | null;
  tutar: number;
  aciklama: string | null;
}

/**
 * Tüm yatırım işlemlerini araç bilgisiyle birlikte, tarih DESC sıralı getirir.
 * Kümülatif — dönem filtresi yok. Filtreleme istemcide yapılır.
 */
export function useYatirimIslemleri() {
  return useQuery({
    queryKey: yatirimIslemleriKey,
    queryFn: async (): Promise<YatirimIslemRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("yatirim_islemleri")
        .select("*, yatirim_araclari(ad, tip, birim)")
        .order("tarih", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((i) => ({
        ...i,
        aracAd: i.yatirim_araclari?.ad ?? null,
        aracTip: i.yatirim_araclari?.tip ?? null,
        aracBirim: i.yatirim_araclari?.birim ?? null,
      }));
    },
  });
}

/** İşlem mutasyonu sonrası tazelenecek tüm sorgu anahtarları. */
function invalidateIslemQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: yatirimIslemleriKey });
  // Araçların güncel toplam değeri + pasifleştirme/silme guard'ları
  queryClient.invalidateQueries({ queryKey: yatirimAracOzetleriKey });
  // Bekleyen nakit alış/satış/çekme'den etkilenir
  queryClient.invalidateQueries({ queryKey: bekleyenNakitKey });
}

/** Yeni yatırım işlemi ekler. */
export function useCreateYatirimIslem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: YatirimIslemInput) => {
      const supabase = createClient();
      const user_id = await getUserId();
      const { error } = await supabase
        .from("yatirim_islemleri")
        .insert({ user_id, ...input });
      if (error) throw error;
    },
    onSuccess: () => invalidateIslemQueries(queryClient),
  });
}

/** Yatırım işlemini günceller. */
export function useUpdateYatirimIslem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: YatirimIslemInput & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("yatirim_islemleri")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateIslemQueries(queryClient),
  });
}

/** Yatırım işlemini siler (basit DELETE). */
export function useDeleteYatirimIslem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("yatirim_islemleri")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateIslemQueries(queryClient),
  });
}
