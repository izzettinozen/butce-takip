import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import type { GiderKalemi } from "@/types/database";

export const giderKalemleriKey = ["gider_kalemleri"] as const;

/** Gider kalemi + bağlı olduğu gider türünün adı. */
export type GiderKalemiWithTuru = GiderKalemi & {
  gider_turleri: { id: string; name: string } | null;
};

/** Kullanıcının gider kalemlerini, bağlı gider türüyle birlikte getirir. */
export function useGiderKalemleri() {
  return useQuery({
    queryKey: giderKalemleriKey,
    queryFn: async (): Promise<GiderKalemiWithTuru[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("gider_kalemleri")
        .select("*, gider_turleri(id, name)")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

interface GiderKalemiInput {
  name: string;
  gider_turu_id: string;
}

/** Yeni gider kalemi ekler. */
export function useCreateGiderKalemi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, gider_turu_id }: GiderKalemiInput) => {
      const supabase = createClient();
      const user_id = await getUserId();
      const { error } = await supabase
        .from("gider_kalemleri")
        .insert({ user_id, gider_turu_id, name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giderKalemleriKey });
    },
  });
}

/** Gider kalemini günceller (ad ve/veya bağlı gider türü). */
export function useUpdateGiderKalemi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      gider_turu_id,
    }: GiderKalemiInput & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("gider_kalemleri")
        .update({ name: name.trim(), gider_turu_id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giderKalemleriKey });
    },
  });
}

/** Gider kalemini siler. */
export function useDeleteGiderKalemi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("gider_kalemleri")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giderKalemleriKey });
    },
  });
}
