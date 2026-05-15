"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/auth";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { giderlerKey } from "@/hooks/use-giderler";
import { donemlerKey } from "@/hooks/use-donemler";
import { dashboardKey } from "@/hooks/use-dashboard";
import { tekrarlayanGiderlerKey } from "@/hooks/use-tekrarlayan-giderler";

/** Aynı kontrolün tekrar çalışmaması için bekleme süresi (5 dakika). */
const THROTTLE_MS = 5 * 60 * 1000;

/**
 * Aktif tekrarlayan giderleri kontrol eder ve vakti gelmiş olanları
 * bu ayın giderlerine ekler. Eklenen gider sayısını döndürür.
 */
async function tekrarlayanlariKontrolEt(force: boolean): Promise<number> {
  const supabase = createClient();
  const userId = await getUserId();
  const throttleKey = `tekrarlayan-son-kontrol-${userId}`;

  // Throttle: son kontrolden 5 dk geçmediyse atla.
  if (!force) {
    const last = localStorage.getItem(throttleKey);
    if (last && Date.now() - Number(last) < THROTTLE_MS) return 0;
  }

  const bugun = new Date();
  const buGun = bugun.getDate();
  const buYil = bugun.getFullYear();
  const buAy = bugun.getMonth() + 1;

  // Aktif tekrarlayan giderler + son oluşturulan dönem bilgisi.
  const { data: kayitlar, error } = await supabase
    .from("tekrarlayan_giderler")
    .select("*, donemler(yil, ay)")
    .eq("aktif", true);
  if (error) throw error;

  // Vakti gelmiş VE bu ay henüz oluşturulmamış kayıtlar.
  const olusturulacak = kayitlar.filter((k) => {
    if (buGun < k.ayin_gunu) return false;
    const sonDonem = k.donemler;
    if (sonDonem && sonDonem.yil === buYil && sonDonem.ay === buAy) {
      return false; // bu ay zaten oluşturulmuş
    }
    return true;
  });

  if (olusturulacak.length === 0) {
    localStorage.setItem(throttleKey, String(Date.now()));
    return 0;
  }

  // Bu ayın dönemini bul; yoksa oluştur.
  let buDonemId: string;
  const { data: mevcutDonem, error: donemErr } = await supabase
    .from("donemler")
    .select("id")
    .eq("yil", buYil)
    .eq("ay", buAy)
    .maybeSingle();
  if (donemErr) throw donemErr;

  if (mevcutDonem) {
    buDonemId = mevcutDonem.id;
  } else {
    const { data: yeniDonem, error: yeniErr } = await supabase
      .from("donemler")
      .insert({ user_id: userId, yil: buYil, ay: buAy })
      .select("id")
      .single();
    if (yeniErr) throw yeniErr;
    buDonemId = yeniDonem.id;
  }

  // Giderleri topluca ekle.
  const { error: giderErr } = await supabase.from("giderler").insert(
    olusturulacak.map((k) => ({
      user_id: userId,
      tutar: k.tutar,
      gider_turu_id: k.gider_turu_id,
      gider_kalemi_id: k.gider_kalemi_id,
      odeme_turu_id: k.odeme_turu_id,
      aciklama: k.aciklama,
      donem_id: buDonemId,
    })),
  );
  if (giderErr) throw giderErr;

  // Her tekrarlayan giderin son oluşturulan dönemini güncelle.
  for (const k of olusturulacak) {
    await supabase
      .from("tekrarlayan_giderler")
      .update({ son_olusturulan_donem_id: buDonemId })
      .eq("id", k.id);
  }

  localStorage.setItem(throttleKey, String(Date.now()));
  return olusturulacak.length;
}

interface UseRecurringExpensesCheckOptions {
  /** Bileşen yüklendiğinde otomatik (throttle'lı) çalışsın mı? */
  autoRun?: boolean;
}

/**
 * Tekrarlayan giderlerin otomatik tetikleme kontrolünü yönetir.
 * `autoRun` true ise mount'ta bir kez (throttle'lı) çalışır.
 * `runCheck(true)` ile throttle atlanarak manuel tetiklenebilir.
 */
export function useRecurringExpensesCheck(
  options?: UseRecurringExpensesCheckOptions,
) {
  const autoRun = options?.autoRun ?? false;
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const calismaRef = useRef(false);

  const runCheck = useCallback(
    async (force = false): Promise<number> => {
      if (calismaRef.current) return 0;
      calismaRef.current = true;
      setIsRunning(true);
      try {
        const sayi = await tekrarlayanlariKontrolEt(force);
        if (sayi > 0) {
          toast.success(`${sayi} tekrarlayan gider otomatik eklendi`);
          queryClient.invalidateQueries({ queryKey: giderlerKey });
          queryClient.invalidateQueries({ queryKey: donemlerKey });
          queryClient.invalidateQueries({ queryKey: dashboardKey });
          queryClient.invalidateQueries({ queryKey: tekrarlayanGiderlerKey });
        }
        return sayi;
      } catch (error) {
        if (force) {
          toast.error("Tetikleme başarısız", {
            description: getSupabaseErrorMessage(error),
          });
        } else {
          console.error("Tekrarlayan gider kontrolü başarısız:", error);
        }
        return 0;
      } finally {
        calismaRef.current = false;
        setIsRunning(false);
      }
    },
    [queryClient],
  );

  const autoRanRef = useRef(false);
  useEffect(() => {
    if (!autoRun || autoRanRef.current) return;
    autoRanRef.current = true;
    void runCheck(false);
  }, [autoRun, runCheck]);

  return { runCheck, isRunning };
}
