"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useProfile, profileKey } from "@/hooks/use-profile";
import { bekleyenNakitKey } from "@/hooks/use-bekleyen-nakit";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseErrorMessage } from "@/lib/errors";
import type { DashboardInvestmentMode } from "@/lib/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SecenekTanim {
  value: DashboardInvestmentMode;
  baslik: string;
  aciklama: string;
  onerilen?: boolean;
}

const SECENEKLER: SecenekTanim[] = [
  {
    value: "savings",
    baslik: "Tasarruf olarak",
    aciklama:
      "Yatırım = birikim. Bekleyen nakit hesabı: Gelir − Saf Gider üzerinden hesaplanır. Ay sonu kalan bakiye de yatırım havuzunuzda sayılır.",
    onerilen: true,
  },
  {
    value: "expense",
    baslik: "Gider olarak",
    aciklama:
      "Yatırım = gider. Bekleyen nakit hesabı: Sadece 'Yatırım' işaretli gider türlerinden hesaplanır. Ay sonu kalan bakiye harcanabilir kabul edilir.",
  },
];

export function GorunumTercihiBolumu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profil, isLoading } = useProfile();

  // Kullanıcı henüz dokunmadıysa null; tıklayınca seçimi tutar.
  // Görünen seçim = kullanıcı seçimi ?? profildeki kayıtlı tercih.
  const [userSelection, setUserSelection] =
    useState<DashboardInvestmentMode | null>(null);
  const [kayit, setKayit] = useState(false);

  const secili = userSelection ?? profil?.dashboardInvestmentMode ?? "savings";
  const degisti =
    profil != null &&
    userSelection !== null &&
    userSelection !== profil.dashboardInvestmentMode;

  async function handleKaydet() {
    if (!profil || !degisti || userSelection === null) return;
    setKayit(true);
    const supabase = createClient();
    try {
      // UPSERT: profil satırı yoksa oluştur, varsa sadece tercihi günceller.
      // (Bazı kullanıcılarda handle_new_user trigger'ı atlamış olabilir →
      //  UPDATE'in 0 satır etkilemesini ve sessiz başarıyı önler.)
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: profil.id,
            email: profil.email,
            dashboard_investment_mode: userSelection,
          },
          { onConflict: "id" },
        )
        .select()
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: profileKey });
      // Bekleyen nakit hesaplaması moda bağlıdır → yeniden hesaplansın.
      queryClient.invalidateQueries({ queryKey: bekleyenNakitKey });
      setUserSelection(null); // profil tazeleninceye kadar görünen profile'dan gelsin
      toast.success("Görünüm tercihi kaydedildi", {
        description: "Bekleyen nakit hesaplaması güncellendi.",
        action: {
          label: "Dashboard'a git",
          onClick: () => router.push("/dashboard"),
        },
      });
    } catch (error) {
      toast.error("Kaydedilemedi", {
        description: getSupabaseErrorMessage(error),
      });
    } finally {
      setKayit(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Görünüm Tercihi</CardTitle>
        <CardDescription>Yatırımı nasıl görmek istersin?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-3" role="radiogroup">
              {SECENEKLER.map((s) => {
                const aktif = secili === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => setUserSelection(s.value)}
                    className={cn(
                      "relative w-full rounded-xl border p-4 text-left transition-colors",
                      aktif
                        ? "border-primary bg-accent"
                        : "hover:bg-muted",
                    )}
                  >
                    {aktif && (
                      <span className="bg-gradient-primary absolute right-3 top-3 flex size-5 items-center justify-center rounded-full text-white">
                        <Check className="size-3" />
                      </span>
                    )}
                    <div className="flex items-center gap-2 pr-7">
                      <p className="text-sm font-medium">{s.baslik}</p>
                      {s.onerilen && (
                        <Badge className="bg-accent text-accent-foreground border-transparent text-[10px]">
                          Önerilen
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {s.aciklama}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleKaydet}
                disabled={!degisti || kayit}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                {kayit && <Loader2 className="size-4 animate-spin" />}
                Kaydet
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
