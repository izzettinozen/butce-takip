"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseErrorMessage } from "@/lib/errors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formSchema = z
  .object({
    mevcut: z.string().min(1, "Mevcut şifre gerekli"),
    yeni: z.string().min(6, "Yeni şifre en az 6 karakter olmalı"),
    yeniTekrar: z.string().min(1, "Şifre tekrarı gerekli"),
  })
  .refine((d) => d.yeni === d.yeniTekrar, {
    message: "Yeni şifreler eşleşmiyor",
    path: ["yeniTekrar"],
  });

type FormValues = z.infer<typeof formSchema>;

export function SifreBolumu() {
  const { data: profil } = useProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { mevcut: "", yeni: "", yeniTekrar: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!profil) return;
    const supabase = createClient();
    try {
      // Mevcut şifreyi yeniden giriş yaparak doğrula.
      const { error: girisHata } = await supabase.auth.signInWithPassword({
        email: profil.email,
        password: values.mevcut,
      });
      if (girisHata) {
        toast.error("Mevcut şifre hatalı");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: values.yeni,
      });
      if (error) throw error;

      toast.success("Şifreniz güncellendi");
      reset({ mevcut: "", yeni: "", yeniTekrar: "" });
    } catch (error) {
      toast.error("Şifre değiştirilemedi", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Şifre Değiştir</CardTitle>
        <CardDescription>
          Güvenliğiniz için güçlü bir şifre kullanın.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="mevcut">Mevcut Şifre</Label>
            <Input
              id="mevcut"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.mevcut}
              {...register("mevcut")}
            />
            {errors.mevcut && (
              <p className="text-destructive text-sm">
                {errors.mevcut.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="yeni">Yeni Şifre</Label>
            <Input
              id="yeni"
              type="password"
              autoComplete="new-password"
              placeholder="En az 6 karakter"
              aria-invalid={!!errors.yeni}
              {...register("yeni")}
            />
            {errors.yeni && (
              <p className="text-destructive text-sm">{errors.yeni.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="yeniTekrar">Yeni Şifre (Tekrar)</Label>
            <Input
              id="yeniTekrar"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.yeniTekrar}
              {...register("yeniTekrar")}
            />
            {errors.yeniTekrar && (
              <p className="text-destructive text-sm">
                {errors.yeniTekrar.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Şifreyi Güncelle
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
