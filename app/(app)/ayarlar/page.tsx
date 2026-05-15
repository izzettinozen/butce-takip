"use client";

import { useState } from "react";
import { Database, Lock, Palette, Trash2, User } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ProfilBolumu } from "@/components/ayarlar/profil-bolumu";
import { SifreBolumu } from "@/components/ayarlar/sifre-bolumu";
import { GorunumBolumu } from "@/components/ayarlar/gorunum-bolumu";
import { VeriBolumu } from "@/components/ayarlar/veri-bolumu";
import { HesapBolumu } from "@/components/ayarlar/hesap-bolumu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const BOLUMLER = [
  { id: "profil", label: "Profil", icon: User },
  { id: "sifre", label: "Şifre Değiştir", icon: Lock },
  { id: "gorunum", label: "Görünüm", icon: Palette },
  { id: "veri", label: "Verilerimi İndir", icon: Database },
  { id: "hesap", label: "Hesabı Sil", icon: Trash2 },
] as const;

type BolumId = (typeof BOLUMLER)[number]["id"];

export default function AyarlarPage() {
  const [bolum, setBolum] = useState<BolumId>("profil");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ayarlar"
        description="Profil, güvenlik, görünüm ve veri yönetimi ayarları."
      />

      {/* Mobil bölüm seçici */}
      <div className="lg:hidden">
        <Select value={bolum} onValueChange={(v) => setBolum(v as BolumId)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOLUMLER.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Masaüstü bölüm menüsü */}
        <nav className="hidden lg:block">
          <ul className="space-y-1">
            {BOLUMLER.map((b) => {
              const aktif = bolum === b.id;
              const tehlikeli = b.id === "hesap";
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setBolum(b.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      aktif && tehlikeli &&
                        "bg-destructive/10 text-destructive",
                      aktif && !tehlikeli &&
                        "bg-gradient-primary text-white shadow-sm shadow-indigo-500/30",
                      !aktif && tehlikeli &&
                        "text-destructive hover:bg-destructive/5",
                      !aktif && !tehlikeli && "hover:bg-muted",
                    )}
                  >
                    <b.icon className="size-4 shrink-0" />
                    {b.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* İçerik */}
        <div>
          {bolum === "profil" && <ProfilBolumu />}
          {bolum === "sifre" && <SifreBolumu />}
          {bolum === "gorunum" && <GorunumBolumu />}
          {bolum === "veri" && <VeriBolumu />}
          {bolum === "hesap" && <HesapBolumu />}
        </div>
      </div>
    </div>
  );
}
