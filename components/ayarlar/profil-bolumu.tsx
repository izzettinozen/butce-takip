"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useProfile, profileKey } from "@/hooks/use-profile";
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
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  fullName: z
    .string()
    .min(2, "Ad soyad en az 2 karakter olmalı")
    .max(100, "En fazla 100 karakter"),
  email: z
    .string()
    .min(1, "E-posta gerekli")
    .email("Geçerli bir e-posta adresi girin"),
});

type FormValues = z.infer<typeof formSchema>;

export function ProfilBolumu() {
  const { data: profil, isLoading } = useProfile();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { fullName: "", email: "" },
  });

  useEffect(() => {
    if (profil) reset({ fullName: profil.fullName, email: profil.email });
  }, [profil, reset]);

  async function onSubmit(values: FormValues) {
    if (!profil) return;
    const supabase = createClient();
    const mesajlar: string[] = [];
    try {
      if (values.fullName.trim() !== profil.fullName) {
        // UPSERT: satır yoksa oluşturur (handle_new_user trigger'ı atlamış
        // kullanıcılar için sessiz başarısızlığı önler).
        const { error } = await supabase
          .from("profiles")
          .upsert(
            {
              id: profil.id,
              email: profil.email,
              full_name: values.fullName.trim(),
            },
            { onConflict: "id" },
          )
          .select()
          .single();
        if (error) throw error;
        mesajlar.push("Ad soyad güncellendi");
      }
      if (values.email !== profil.email) {
        const { error } = await supabase.auth.updateUser({
          email: values.email,
        });
        if (error) throw error;
        mesajlar.push(
          "E-posta değişikliği için yeni adresinize doğrulama bağlantısı gönderildi",
        );
      }
      if (mesajlar.length === 0) {
        toast.info("Değişiklik yapılmadı");
      } else {
        queryClient.invalidateQueries({ queryKey: profileKey });
        toast.success("Profil güncellendi", {
          description: mesajlar.join(". "),
        });
      }
    } catch (error) {
      toast.error("Güncelleme başarısız", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>
          Ad soyad ve e-posta adresinizi yönetin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="fullName">Ad Soyad</Label>
              <Input
                id="fullName"
                placeholder="Adınız Soyadınız"
                aria-invalid={!!errors.fullName}
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-destructive text-sm">
                  {errors.fullName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-destructive text-sm">
                  {errors.email.message}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                E-postayı değiştirirseniz yeni adrese doğrulama bağlantısı
                gönderilir.
              </p>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Kaydet
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
