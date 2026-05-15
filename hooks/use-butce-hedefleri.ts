import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import { dashboardKey } from "@/hooks/use-dashboard";

export const butceHedefleriKey = ["butce_hedefleri"] as const;

/** Hedef + o dönemdeki gerçekleşen harcama ve durum bilgisi. */
export interface ButceHedefiSatir {
  id: string;
  giderTuruId: string;
  giderTuruAdi: string;
  donemId: string;
  hedefTutar: number;
  gerceklesen: number;
  kalan: number;
  /** Gerçekleşen / Hedef yüzdesi (tam sayı; 100'ü aşabilir). */
  yuzde: number;
}

/** Bir yıla ait hedef kaydı (matris için ay/yıl ile). */
export interface YillikHedef {
  giderTuruId: string;
  yil: number;
  ay: number;
  hedefTutar: number;
}

/**
 * Seçili döneme ait bütçe hedeflerini, gerçekleşen harcamayla birlikte getirir.
 */
export function useButceHedefleri(donemId: string | undefined) {
  return useQuery({
    queryKey: [...butceHedefleriKey, donemId ?? null],
    enabled: !!donemId,
    queryFn: async (): Promise<ButceHedefiSatir[]> => {
      const supabase = createClient();
      const [hedeflerRes, giderlerRes] = await Promise.all([
        supabase
          .from("butce_hedefleri")
          .select("id, gider_turu_id, donem_id, hedef_tutar, gider_turleri(name)")
          .eq("donem_id", donemId!),
        supabase
          .from("giderler")
          .select("gider_turu_id, tutar")
          .eq("donem_id", donemId!),
      ]);
      if (hedeflerRes.error) throw hedeflerRes.error;
      if (giderlerRes.error) throw giderlerRes.error;

      const giderMap = new Map<string, number>();
      for (const g of giderlerRes.data) {
        giderMap.set(
          g.gider_turu_id,
          (giderMap.get(g.gider_turu_id) ?? 0) + Number(g.tutar),
        );
      }

      return hedeflerRes.data
        .map((h) => {
          const hedefTutar = Number(h.hedef_tutar);
          const gerceklesen = giderMap.get(h.gider_turu_id) ?? 0;
          return {
            id: h.id,
            giderTuruId: h.gider_turu_id,
            giderTuruAdi: h.gider_turleri?.name ?? "—",
            donemId: h.donem_id,
            hedefTutar,
            gerceklesen,
            kalan: hedefTutar - gerceklesen,
            yuzde:
              hedefTutar > 0
                ? Math.round((gerceklesen / hedefTutar) * 100)
                : 0,
          };
        })
        .sort((a, b) => a.giderTuruAdi.localeCompare(b.giderTuruAdi, "tr"));
    },
  });
}

/** Bir yıla ait tüm bütçe hedeflerini (matris için) getirir. */
export function useHedeflerYillik(yil: number) {
  return useQuery({
    queryKey: [...butceHedefleriKey, "yillik", yil],
    queryFn: async (): Promise<YillikHedef[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("butce_hedefleri")
        .select("gider_turu_id, hedef_tutar, donemler(yil, ay)");
      if (error) throw error;
      return data
        .filter((h) => h.donemler?.yil === yil)
        .map((h) => ({
          giderTuruId: h.gider_turu_id,
          yil: h.donemler!.yil,
          ay: h.donemler!.ay,
          hedefTutar: Number(h.hedef_tutar),
        }));
    },
  });
}

interface HedefInput {
  gider_turu_id: string;
  donem_id: string;
  hedef_tutar: number;
}

/** Yeni bütçe hedefi ekler. UNIQUE ihlali çağıran tarafça yakalanır. */
export function useCreateHedef() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: HedefInput) => {
      const supabase = createClient();
      const user_id = await getUserId();
      const { error } = await supabase
        .from("butce_hedefleri")
        .insert({ user_id, ...input });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: butceHedefleriKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

/** Bütçe hedefini günceller. */
export function useUpdateHedef() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: HedefInput & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("butce_hedefleri")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: butceHedefleriKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

/** Bütçe hedefini siler. */
export function useDeleteHedef() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("butce_hedefleri")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: butceHedefleriKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}

/**
 * Bir dönemin hedeflerini başka bir döneme kopyalar.
 * Hedef dönemde zaten hedefi olan gider türleri atlanır.
 */
export function useCopyHedefler() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fromDonemId,
      toDonemId,
    }: {
      fromDonemId: string;
      toDonemId: string;
    }): Promise<{ kopyalanan: number; atlanan: number }> => {
      const supabase = createClient();
      const user_id = await getUserId();

      const [kaynakRes, mevcutRes] = await Promise.all([
        supabase
          .from("butce_hedefleri")
          .select("gider_turu_id, hedef_tutar")
          .eq("donem_id", fromDonemId),
        supabase
          .from("butce_hedefleri")
          .select("gider_turu_id")
          .eq("donem_id", toDonemId),
      ]);
      if (kaynakRes.error) throw kaynakRes.error;
      if (mevcutRes.error) throw mevcutRes.error;

      const mevcut = new Set(mevcutRes.data.map((h) => h.gider_turu_id));
      const eklenecek = kaynakRes.data.filter(
        (h) => !mevcut.has(h.gider_turu_id),
      );

      if (eklenecek.length > 0) {
        const { error } = await supabase.from("butce_hedefleri").insert(
          eklenecek.map((h) => ({
            user_id,
            gider_turu_id: h.gider_turu_id,
            donem_id: toDonemId,
            hedef_tutar: h.hedef_tutar,
          })),
        );
        if (error) throw error;
      }

      return {
        kopyalanan: eklenecek.length,
        atlanan: kaynakRes.data.length - eklenecek.length,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: butceHedefleriKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}
