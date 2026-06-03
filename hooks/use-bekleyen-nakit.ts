import { useQuery } from "@tanstack/react-query";

import { getBekleyenNakit } from "@/lib/bekleyen-nakit";
import { useProfile } from "@/hooks/use-profile";

export const bekleyenNakitKey = ["bekleyen_nakit"] as const;

/**
 * Oturumdaki kullanıcının bekleyen nakitini profil moduna göre hesaplar.
 * Mod sorgu anahtarına dahildir → mod değişince (profil tazelenince)
 * otomatik yeniden hesaplanır.
 */
export function useBekleyenNakit() {
  const { data: profil } = useProfile();
  const mode = profil?.dashboardInvestmentMode ?? "savings";
  return useQuery({
    queryKey: [...bekleyenNakitKey, mode],
    enabled: !!profil,
    queryFn: () => getBekleyenNakit(profil!.id, mode),
  });
}
