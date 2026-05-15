import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

/** 404 — sayfa bulunamadı. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-gradient-primary flex size-16 items-center justify-center rounded-2xl text-white shadow-md shadow-indigo-500/30">
        <Compass className="size-8" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Sayfa bulunamadı
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
        </p>
      </div>
      <Button
        asChild
        className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
      >
        <Link href="/dashboard">Dashboard&apos;a dön</Link>
      </Button>
    </div>
  );
}
