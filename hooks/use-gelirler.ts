import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import { donemlerKey } from "@/hooks/use-donemler";
import { dashboardKey } from "@/hooks/use-dashboard";
import type { Gelir } from "@/types/database";

export const gelirlerKey = ["gelirler"] as const;

/** Gelir + bağlı gelir türü ve dönem bilgisi. */
export type GelirWithRelations = Gelir & {
  gelir_turleri: { id: string; name: string } | null;
  donemler: { id: string; yil: number; ay: number } | null;
};

/** Gelir ekleme/güncelleme form verisi. */
export interface GelirInput {
  tutar: number;
  gelir_turu_id: string;
  donem_id: string;
}

/**
 * Verilen dönemlere ait gelirleri ilişkili adlarıyla getirir.
 * Tek dönem (yıl/ay filtresi) veya bir yılın tüm dönemleri (ay gruplaması)
 * için kullanılabilir.
 */
export function useGelirler(donemIds: string[]) {
  const sortedIds = [...donemIds].sort();
  return useQuery({
    queryKey: [...gelirlerKey, sortedIds.join(",")],
    enabled: sortedIds.length > 0,
    queryFn: async (): Promise<GelirWithRelations[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("gelirler")
        .select("*, gelir_turleri(id, name), donemler(id, yil, ay)")
        .in("donem_id", sortedIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Yeni gelir ekler. */
export function useCreateGelir() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GelirInput) => {
      const supabase = createClient();
      const user_id = await getUserId();
      const { error } = await supabase
        .from("gelirler")
        .insert({ user_id, ...input });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gelirlerKey });
      queryClient.invalidateQueries({ queryKey: donemlerKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

/** Geliri günceller. */
export function useUpdateGelir() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: GelirInput & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("gelirler")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gelirlerKey });
      queryClient.invalidateQueries({ queryKey: donemlerKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

/** Geliri siler. */
export function useDeleteGelir() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("gelirler").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gelirlerKey });
      queryClient.invalidateQueries({ queryKey: donemlerKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}
