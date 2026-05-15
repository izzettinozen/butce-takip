import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import type { GelirTuru } from "@/types/database";

export const gelirTurleriKey = ["gelir_turleri"] as const;

/** Kullanıcının gelir türlerini ada göre sıralı getirir. */
export function useGelirTurleri() {
  return useQuery({
    queryKey: gelirTurleriKey,
    queryFn: async (): Promise<GelirTuru[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("gelir_turleri")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Bir gelir türüne bağlı gelir kaydı sayısını döndürür.
 * gelirler.gelir_turu_id NO ACTION (RESTRICT) olduğundan, sayı > 0 ise
 * tür silinemez — silme öncesi uyarı için kullanılır.
 */
export async function countGelirlerForTuru(
  gelirTuruId: string,
): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("gelirler")
    .select("id", { count: "exact", head: true })
    .eq("gelir_turu_id", gelirTuruId);
  if (error) throw error;
  return count ?? 0;
}

/** Yeni gelir türü ekler. */
export function useCreateGelirTuru() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient();
      const user_id = await getUserId();
      const { error } = await supabase
        .from("gelir_turleri")
        .insert({ user_id, name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gelirTurleriKey });
    },
  });
}

/** Gelir türünü günceller. */
export function useUpdateGelirTuru() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("gelir_turleri")
        .update({ name: name.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gelirTurleriKey });
    },
  });
}

/** Gelir türünü siler. */
export function useDeleteGelirTuru() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("gelir_turleri")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gelirTurleriKey });
    },
  });
}
