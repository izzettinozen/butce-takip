"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SECENEKLER = [
  { value: "light", label: "Açık", icon: Sun },
  { value: "dark", label: "Koyu", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
] as const;

export function GorunumBolumu() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Tema değeri yalnızca istemcide bilinir; hydration uyumu için
  // mount bayrağı bir sonraki kareye ertelenerek ayarlanır.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Görünüm</CardTitle>
        <CardDescription>
          Uygulamanın açık ya da koyu temasını seçin. Tercih cihazınızda
          saklanır.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {SECENEKLER.map((s) => {
            const aktif = mounted && theme === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setTheme(s.value)}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                  aktif
                    ? "border-primary bg-accent"
                    : "hover:bg-muted",
                )}
              >
                {aktif && (
                  <span className="bg-gradient-primary absolute right-2 top-2 flex size-5 items-center justify-center rounded-full text-white">
                    <Check className="size-3" />
                  </span>
                )}
                <s.icon className="size-6" />
                <span className="text-sm font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
