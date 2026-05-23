"use client";

import { useEffect } from "react";

/**
 * Service worker'ı yalnızca üretimde kaydeder.
 * Geliştirmede (npm run dev) SW devre dışıdır — HMR ve hata
 * ayıklamayı engellememek için.
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker kaydedilemedi:", err);
    });
  }, []);

  return null;
}
