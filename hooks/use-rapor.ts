import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { RaporKaynak, RaporSatiri } from "@/lib/rapor";

/**
 * Rapor için seçili kaynağın (giderler/gelirler) tüm satırlarını
 * normalleştirilmiş biçimde getirir. Filtreleme ve gruplama istemcide yapılır.
 */
export function useRapor(kaynak: RaporKaynak) {
  return useQuery({
    queryKey: ["rapor", kaynak],
    queryFn: async (): Promise<RaporSatiri[]> => {
      const supabase = createClient();

      if (kaynak === "giderler") {
        const { data, error } = await supabase
          .from("giderler")
          .select(
            "id, tutar, created_at, gider_turu_id, gider_kalemi_id, odeme_turu_id, gider_turleri(name), gider_kalemleri(name), odeme_turleri(name), donemler(yil, ay)",
          );
        if (error) throw error;
        return data.map((g) => ({
          id: g.id,
          tutar: Number(g.tutar),
          createdAt: g.created_at,
          yil: g.donemler?.yil ?? 0,
          ay: g.donemler?.ay ?? 0,
          giderTuruId: g.gider_turu_id,
          giderTuru: g.gider_turleri?.name ?? "",
          giderKalemiId: g.gider_kalemi_id,
          giderKalemi: g.gider_kalemleri?.name ?? "",
          odemeTuruId: g.odeme_turu_id,
          odemeTuru: g.odeme_turleri?.name ?? "",
          gelirTuruId: "",
          gelirTuru: "",
        }));
      }

      const { data, error } = await supabase
        .from("gelirler")
        .select(
          "id, tutar, created_at, gelir_turu_id, gelir_turleri(name), donemler(yil, ay)",
        );
      if (error) throw error;
      return data.map((g) => ({
        id: g.id,
        tutar: Number(g.tutar),
        createdAt: g.created_at,
        yil: g.donemler?.yil ?? 0,
        ay: g.donemler?.ay ?? 0,
        giderTuruId: "",
        giderTuru: "",
        giderKalemiId: "",
        giderKalemi: "",
        odemeTuruId: "",
        odemeTuru: "",
        gelirTuruId: g.gelir_turu_id,
        gelirTuru: g.gelir_turleri?.name ?? "",
      }));
    },
  });
}
