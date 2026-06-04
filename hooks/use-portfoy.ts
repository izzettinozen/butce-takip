import { useQuery } from "@tanstack/react-query";

import { getUserId } from "@/lib/auth";
import { getPortfoyOzet } from "@/lib/portfoy";
import { getPortfoyTrend } from "@/lib/portfoy-trend";

/** Portföy sorgularının ortak ön eki — mutasyonlarda toptan invalidate için. */
export const portfoyKey = ["portfoy"] as const;

/** Portföy özeti (KPI'lar + araç bazında detay tablo + pasta verisi). */
export function usePortfoyOzet() {
  return useQuery({
    queryKey: [...portfoyKey, "ozet"],
    queryFn: async () => {
      const userId = await getUserId();
      return getPortfoyOzet(userId);
    },
  });
}

/** Portföy trend tam serisi (aralık filtresi/downsampling görünümde uygulanır). */
export function usePortfoyTrend() {
  return useQuery({
    queryKey: [...portfoyKey, "trend"],
    queryFn: async () => {
      const userId = await getUserId();
      return getPortfoyTrend(userId);
    },
  });
}
