"use client";

import { useEffect } from "react";

/**
 * Kök layout dahil tüm uygulamayı kapsayan hata sınırı.
 * Kendi <html>/<body> etiketlerini içermek zorundadır.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Kritik hata:", error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ textAlign: "center", padding: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Bir şeyler ters gitti
          </h1>
          <p style={{ marginTop: "0.5rem", color: "#64748b" }}>
            Uygulama beklenmeyen bir hatayla karşılaştı.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              color: "#ffffff",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            }}
          >
            Yeniden dene
          </button>
        </div>
      </body>
    </html>
  );
}
