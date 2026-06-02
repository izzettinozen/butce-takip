import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { DashboardInvestmentMode } from "@/lib/dashboard";

export const profileKey = ["profile"] as const;

export interface ProfilBilgisi {
  id: string;
  email: string;
  fullName: string;
  /** Dashboard'da yatırımı nasıl yorumlamak istediğine dair tercih. */
  dashboardInvestmentMode: DashboardInvestmentMode;
}

/** Oturumdaki kullanıcının profil bilgisini getirir. */
export function useProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: async (): Promise<ProfilBilgisi> => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error("Oturum bulunamadı.");

      const { data: profil } = await supabase
        .from("profiles")
        .select("full_name, dashboard_investment_mode")
        .eq("id", user.id)
        .maybeSingle();

      return {
        id: user.id,
        email: user.email ?? "",
        fullName: profil?.full_name ?? "",
        dashboardInvestmentMode:
          profil?.dashboard_investment_mode ?? "savings",
      };
    },
  });
}
