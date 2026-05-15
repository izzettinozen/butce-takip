"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { tumVeriyiIndir } from "@/lib/veri-yedek";
import { getSupabaseErrorMessage } from "@/lib/errors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function VeriBolumu() {
  const [indiriliyor, setIndiriliyor] = useState(false);

  async function handleIndir() {
    setIndiriliyor(true);
    try {
      await tumVeriyiIndir();
      toast.success("Yedek dosyası indirildi");
    } catch (error) {
      toast.error("Dışa aktarma başarısız", {
        description: getSupabaseErrorMessage(error),
      });
    } finally {
      setIndiriliyor(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verilerimi İndir</CardTitle>
        <CardDescription>
          Tüm gelir, gider, hedef ve tanımlarınızı tek bir Excel dosyası
          olarak indirin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-muted-foreground text-sm">
          Dosya 5 sayfa içerir: Giderler, Gelirler, Bütçe Hedefleri,
          Tekrarlayan Giderler ve Master Veriler.
        </div>
        <Button
          onClick={handleIndir}
          disabled={indiriliyor}
          className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
        >
          {indiriliyor ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Tüm Verilerimi Excel Olarak İndir
        </Button>
      </CardContent>
    </Card>
  );
}
