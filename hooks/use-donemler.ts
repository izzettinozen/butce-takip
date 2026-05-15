import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import type { Donem } from "@/types/database";

export const donemlerKey = ["donemler"] as const;

/** Dönem + o döneme ait gelir/gider toplamları ve net durum. */
export type DonemOzet = Donem & {
  toplamGelir: number;
  toplamGider: number;
  net: number;
};

/**
 * Dönemleri, her birinin gelir/gider toplamlarıyla birlikte getirir.
 * Tüm gelir ve giderler iki sorguda çekilip dönem bazında toplanır.
 * Sıralama: yıl ve ay azalan (en yeni en üstte).
 */
export function useDonemler() {
  return useQuery({
    queryKey: donemlerKey,
    queryFn: async (): Promise<DonemOzet[]> => {
      const supabase = createClient();

      const [donemlerRes, giderlerRes, gelirlerRes] = await Promise.all([
        supabase
          .from("donemler")
          .select("*")
          .order("yil", { ascending: false })
          .order("ay", { ascending: false }),
        supabase.from("giderler").select("donem_id, tutar"),
        supabase.from("gelirler").select("donem_id, tutar"),
      ]);

      if (donemlerRes.error) throw donemlerRes.error;
      if (giderlerRes.error) throw giderlerRes.error;
      if (gelirlerRes.error) throw gelirlerRes.error;

      const giderMap = new Map<string, number>();
      for (const g of giderlerRes.data) {
        giderMap.set(
          g.donem_id,
          (giderMap.get(g.donem_id) ?? 0) + Number(g.tutar),
        );
      }

      const gelirMap = new Map<string, number>();
      for (const g of gelirlerRes.data) {
        gelirMap.set(
          g.donem_id,
          (gelirMap.get(g.donem_id) ?? 0) + Number(g.tutar),
        );
      }

      return donemlerRes.data.map((donem) => {
        const toplamGelir = gelirMap.get(donem.id) ?? 0;
        const toplamGider = giderMap.get(donem.id) ?? 0;
        return {
          ...donem,
          toplamGelir,
          toplamGider,
          net: toplamGelir - toplamGider,
        };
      });
    },
  });
}

/** Bir döneme bağlı kayıt sayıları. */
export interface DonemUsage {
  giderler: number;
  gelirler: number;
  butceHedefleri: number;
  /** SET NULL ile bağlıdır — silmeyi engellemez, yalnızca bilgilendirme. */
  tekrarlayan: number;
}

/**
 * Döneme bağlı kayıtları sayar. giderler/gelirler/butce_hedefleri NO ACTION
 * (silmeyi engeller); tekrarlayan_giderler SET NULL (engellemez).
 */
export async function countDonemUsage(donemId: string): Promise<DonemUsage> {
  const supabase = createClient();

  const [giderlerRes, gelirlerRes, butceRes, tekrarlayanRes] =
    await Promise.all([
      supabase
        .from("giderler")
        .select("id", { count: "exact", head: true })
        .eq("donem_id", donemId),
      supabase
        .from("gelirler")
        .select("id", { count: "exact", head: true })
        .eq("donem_id", donemId),
      supabase
        .from("butce_hedefleri")
        .select("id", { count: "exact", head: true })
        .eq("donem_id", donemId),
      supabase
        .from("tekrarlayan_giderler")
        .select("id", { count: "exact", head: true })
        .eq("son_olusturulan_donem_id", donemId),
    ]);

  if (giderlerRes.error) throw giderlerRes.error;
  if (gelirlerRes.error) throw gelirlerRes.error;
  if (butceRes.error) throw butceRes.error;
  if (tekrarlayanRes.error) throw tekrarlayanRes.error;

  return {
    giderler: giderlerRes.count ?? 0,
    gelirler: gelirlerRes.count ?? 0,
    butceHedefleri: butceRes.count ?? 0,
    tekrarlayan: tekrarlayanRes.count ?? 0,
  };
}

/** Yeni dönem ekler. UNIQUE(user_id, yil, ay) ihlali çağıran tarafça yakalanır. */
export function useCreateDonem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ yil, ay }: { yil: number; ay: number }) => {
      const supabase = createClient();
      const user_id = await getUserId();
      const { error } = await supabase
        .from("donemler")
        .insert({ user_id, yil, ay });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donemlerKey });
    },
  });
}

/** Dönemi siler. */
export function useDeleteDonem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("donemler").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donemlerKey });
    },
  });
}
