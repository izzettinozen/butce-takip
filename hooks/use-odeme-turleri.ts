import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import type { OdemeTuru } from "@/types/database";

export const odemeTurleriKey = ["odeme_turleri"] as const;

/** Kullanıcının ödeme türlerini getirir — varsayılanlar önce, sonra ada göre. */
export function useOdemeTurleri() {
  return useQuery({
    queryKey: odemeTurleriKey,
    queryFn: async (): Promise<OdemeTuru[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("odeme_turleri")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/** Bir ödeme türüne bağlı kayıt sayıları. */
export interface OdemeTuruUsage {
  giderler: number;
  tekrarlayan: number;
}

/**
 * Ödeme türüne bağlı gider ve tekrarlayan gider sayısını döndürür.
 * Her iki FK de NO ACTION (RESTRICT) — toplam > 0 ise tür silinemez.
 */
export async function countOdemeTuruUsage(
  odemeTuruId: string,
): Promise<OdemeTuruUsage> {
  const supabase = createClient();

  const [giderlerRes, tekrarlayanRes] = await Promise.all([
    supabase
      .from("giderler")
      .select("id", { count: "exact", head: true })
      .eq("odeme_turu_id", odemeTuruId),
    supabase
      .from("tekrarlayan_giderler")
      .select("id", { count: "exact", head: true })
      .eq("odeme_turu_id", odemeTuruId),
  ]);

  if (giderlerRes.error) throw giderlerRes.error;
  if (tekrarlayanRes.error) throw tekrarlayanRes.error;

  return {
    giderler: giderlerRes.count ?? 0,
    tekrarlayan: tekrarlayanRes.count ?? 0,
  };
}

/** Yeni ödeme türü ekler (is_default her zaman false). */
export function useCreateOdemeTuru() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient();
      const user_id = await getUserId();
      const { error } = await supabase
        .from("odeme_turleri")
        .insert({ user_id, name: name.trim(), is_default: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: odemeTurleriKey });
    },
  });
}

/** Ödeme türünü günceller. Varsayılan kayıtlar UI'da düzenlenemez. */
export function useUpdateOdemeTuru() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("odeme_turleri")
        .update({ name: name.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: odemeTurleriKey });
    },
  });
}

/** Ödeme türünü siler. Varsayılan kayıtlar UI'da silinemez. */
export function useDeleteOdemeTuru() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("odeme_turleri")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: odemeTurleriKey });
    },
  });
}
