import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export const dashboardKey = ["dashboard"] as const;

/** Dashboard hesaplamaları için sadeleştirilmiş gider kaydı. */
export interface DashGider {
  tutar: number;
  yil: number;
  ay: number;
  donemId: string;
  giderTuru: string;
  giderTuruId: string;
  /** Türün is_investment kolonu (isInvestmentTuru helper'ı bunu okur). */
  is_investment: boolean;
  giderKalemi: string;
  odemeTuru: string;
}

/** Dashboard hesaplamaları için sadeleştirilmiş gelir kaydı. */
export interface DashGelir {
  tutar: number;
  yil: number;
  ay: number;
}

/** Dashboard hesaplamaları için sadeleştirilmiş bütçe hedefi. */
export interface DashHedef {
  hedefTutar: number;
  giderTuruId: string;
  giderTuru: string;
  donemId: string;
}

export interface DashboardData {
  giderler: DashGider[];
  gelirler: DashGelir[];
  hedefler: DashHedef[];
}

/**
 * Dashboard için tüm gider, gelir ve bütçe hedefi verisini tek seferde çeker.
 * Tüm grafik ve KPI hesaplamaları bu veri üzerinden istemcide yapılır;
 * dönem değiştiğinde yeniden sorgu atılmaz.
 */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKey,
    queryFn: async (): Promise<DashboardData> => {
      const supabase = createClient();

      const [giderlerRes, gelirlerRes, hedeflerRes] = await Promise.all([
        supabase
          .from("giderler")
          .select(
            "tutar, donem_id, gider_turu_id, gider_turleri(name, is_investment), gider_kalemleri(name), odeme_turleri(name), donemler(yil, ay)",
          ),
        supabase
          .from("gelirler")
          .select("tutar, donemler(yil, ay)"),
        supabase
          .from("butce_hedefleri")
          .select("hedef_tutar, gider_turu_id, donem_id, gider_turleri(name)"),
      ]);

      if (giderlerRes.error) throw giderlerRes.error;
      if (gelirlerRes.error) throw gelirlerRes.error;
      if (hedeflerRes.error) throw hedeflerRes.error;

      const giderler: DashGider[] = giderlerRes.data.map((g) => ({
        tutar: Number(g.tutar),
        yil: g.donemler?.yil ?? 0,
        ay: g.donemler?.ay ?? 0,
        donemId: g.donem_id,
        giderTuru: g.gider_turleri?.name ?? "—",
        giderTuruId: g.gider_turu_id,
        is_investment: g.gider_turleri?.is_investment ?? false,
        giderKalemi: g.gider_kalemleri?.name ?? "—",
        odemeTuru: g.odeme_turleri?.name ?? "—",
      }));

      const gelirler: DashGelir[] = gelirlerRes.data.map((g) => ({
        tutar: Number(g.tutar),
        yil: g.donemler?.yil ?? 0,
        ay: g.donemler?.ay ?? 0,
      }));

      const hedefler: DashHedef[] = hedeflerRes.data.map((h) => ({
        hedefTutar: Number(h.hedef_tutar),
        giderTuruId: h.gider_turu_id,
        giderTuru: h.gider_turleri?.name ?? "—",
        donemId: h.donem_id,
      }));

      return { giderler, gelirler, hedefler };
    },
  });
}
