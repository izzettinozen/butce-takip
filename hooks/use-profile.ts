import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export const profileKey = ["profile"] as const;

export interface ProfilBilgisi {
  id: string;
  email: string;
  fullName: string;
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
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      return {
        id: user.id,
        email: user.email ?? "",
        fullName: profil?.full_name ?? "",
      };
    },
  });
}
