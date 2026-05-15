import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import type { GiderTuru } from "@/types/database";

export const giderTurleriKey = ["gider_turleri"] as const;

/** Kullanıcının gider türlerini ada göre sıralı getirir. */
export function useGiderTurleri() {
  return useQuery({
    queryKey: giderTurleriKey,
    queryFn: async (): Promise<GiderTuru[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("gider_turleri")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/** Yeni gider türü ekler. */
export function useCreateGiderTuru() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient();
      const user_id = await getUserId();
      const { error } = await supabase
        .from("gider_turleri")
        .insert({ user_id, name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giderTurleriKey });
    },
  });
}

/** Gider türünü günceller. */
export function useUpdateGiderTuru() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("gider_turleri")
        .update({ name: name.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giderTurleriKey });
    },
  });
}

/** Gider türünü siler. Bağlı gider kalemleri de silinir (CASCADE). */
export function useDeleteGiderTuru() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("gider_turleri")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giderTurleriKey });
    },
  });
}
