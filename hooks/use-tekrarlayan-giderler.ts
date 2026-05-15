import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import type { TekrarlayanGider } from "@/types/database";

export const tekrarlayanGiderlerKey = ["tekrarlayan_giderler"] as const;

/** Tekrarlayan gider + ilişkili adlar ve son oluşturulan dönem. */
export type TekrarlayanGiderWithRelations = TekrarlayanGider & {
  gider_turleri: { id: string; name: string } | null;
  gider_kalemleri: { id: string; name: string } | null;
  odeme_turleri: { id: string; name: string } | null;
  donemler: { yil: number; ay: number } | null;
};

/** Tekrarlayan gider ekleme/güncelleme form verisi. */
export interface TekrarlayanGiderInput {
  tutar: number;
  gider_turu_id: string;
  gider_kalemi_id: string;
  odeme_turu_id: string;
  aciklama: string | null;
  ayin_gunu: number;
  aktif: boolean;
}

/**
 * Tekrarlayan giderleri getirir. Sıralama: aktif olanlar üstte,
 * ardından ayın gününe göre artan.
 */
export function useTekrarlayanGiderler() {
  return useQuery({
    queryKey: tekrarlayanGiderlerKey,
    queryFn: async (): Promise<TekrarlayanGiderWithRelations[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tekrarlayan_giderler")
        .select(
          "*, gider_turleri(id, name), gider_kalemleri(id, name), odeme_turleri(id, name), donemler(yil, ay)",
        )
        .order("aktif", { ascending: false })
        .order("ayin_gunu", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/** Yeni tekrarlayan gider ekler. */
export function useCreateTekrarlayanGider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TekrarlayanGiderInput) => {
      const supabase = createClient();
      const user_id = await getUserId();
      const { error } = await supabase.from("tekrarlayan_giderler").insert({
        user_id,
        ...input,
        aciklama: input.aciklama?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tekrarlayanGiderlerKey });
    },
  });
}

/** Tekrarlayan gideri günceller. */
export function useUpdateTekrarlayanGider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: TekrarlayanGiderInput & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tekrarlayan_giderler")
        .update({ ...input, aciklama: input.aciklama?.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tekrarlayanGiderlerKey });
    },
  });
}

/** Tekrarlayan giderin aktif/pasif durumunu değiştirir. */
export function useToggleTekrarlayanGider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, aktif }: { id: string; aktif: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tekrarlayan_giderler")
        .update({ aktif })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tekrarlayanGiderlerKey });
    },
  });
}

/** Tekrarlayan gideri siler. */
export function useDeleteTekrarlayanGider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tekrarlayan_giderler")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tekrarlayanGiderlerKey });
    },
  });
}
