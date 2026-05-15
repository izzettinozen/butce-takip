"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** (app) bölümü için route segment hata sınırı. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Sayfa hatası:", error);
  }, [error]);

  return (
    <Card className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-2xl">
        <AlertTriangle className="size-7" />
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Bir şeyler ters gitti
        </h1>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi deneyebilirsiniz.
        </p>
      </div>
      <Button
        onClick={reset}
        className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
      >
        <RotateCcw className="size-4" />
        Yeniden dene
      </Button>
    </Card>
  );
}
