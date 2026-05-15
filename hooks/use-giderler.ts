import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import { donemlerKey } from "@/hooks/use-donemler";
import { dashboardKey } from "@/hooks/use-dashboard";
import type { Gider } from "@/types/database";

export const giderlerKey = ["giderler"] as const;

/** Gider + bağlı tür / kalem / ödeme türü adları. */
export type GiderWithRelations = Gider & {
  gider_turleri: { id: string; name: string } | null;
  gider_kalemleri: { id: string; name: string } | null;
  odeme_turleri: { id: string; name: string } | null;
};

/** Gider ekleme/güncelleme form verisi. */
export interface GiderInput {
  tutar: number;
  gider_turu_id: string;
  gider_kalemi_id: string;
  odeme_turu_id: string;
  aciklama: string | null;
  donem_id: string;
}

/** Bir yıla ait gider kaydı (matris hesabı için). */
export interface YillikGider {
  giderTuruId: string;
  yil: number;
  ay: number;
  tutar: number;
}

/** Bir yıla ait tüm giderleri (tür/ay matrisi için) getirir. */
export function useGiderlerYillik(yil: number) {
  return useQuery({
    queryKey: [...giderlerKey, "yillik", yil],
    queryFn: async (): Promise<YillikGider[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("giderler")
        .select("gider_turu_id, tutar, donemler(yil, ay)");
      if (error) throw error;
      return data
        .filter((g) => g.donemler?.yil === yil)
        .map((g) => ({
          giderTuruId: g.gider_turu_id,
          yil: g.donemler!.yil,
          ay: g.donemler!.ay,
          tutar: Number(g.tutar),
        }));
    },
  });
}

/** Seçili döneme ait giderleri ilişkili adlarıyla getirir. */
export function useGiderler(donemId: string | undefined) {
  return useQuery({
    queryKey: [...giderlerKey, donemId ?? null],
    enabled: !!donemId,
    queryFn: async (): Promise<GiderWithRelations[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("giderler")
        .select(
          "*, gider_turleri(id, name), gider_kalemleri(id, name), odeme_turleri(id, name)",
        )
        .eq("donem_id", donemId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Yeni gider ekler. */
export function useCreateGider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GiderInput) => {
      const supabase = createClient();
      const user_id = await getUserId();
      const { error } = await supabase.from("giderler").insert({
        user_id,
        ...input,
        aciklama: input.aciklama?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giderlerKey });
      queryClient.invalidateQueries({ queryKey: donemlerKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

/** Gideri günceller. */
export function useUpdateGider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: GiderInput & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("giderler")
        .update({ ...input, aciklama: input.aciklama?.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giderlerKey });
      queryClient.invalidateQueries({ queryKey: donemlerKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

/** Gideri siler. */
export function useDeleteGider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("giderler").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giderlerKey });
      queryClient.invalidateQueries({ queryKey: donemlerKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}
