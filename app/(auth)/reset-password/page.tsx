"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const resetSchema = z.object({
  email: z
    .string()
    .min(1, "E-posta adresi gerekli")
    .email("Geçerli bir e-posta adresi girin"),
});

type ResetValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ResetValues) {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      toast.error("İşlem başarısız", { description: error.message });
      return;
    }

    setSent(true);
    toast.success("E-posta gönderildi");
  }

  if (sent) {
    return (
      <AuthCard
        title="E-postanızı kontrol edin"
        description="Şifre sıfırlama bağlantısı gönderildi"
        footer={
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            Giriş ekranına dön
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
            <MailCheck className="size-7" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {getValues("email")}
            </span>{" "}
            adresine şifre sıfırlama bağlantısı gönderdik. Gelen kutunuzu (ve
            spam klasörünü) kontrol edin.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Şifrenizi mi unuttunuz?"
      description="E-posta adresinizi girin, sıfırlama bağlantısı gönderelim"
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Giriş ekranına dön
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ornek@eposta.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-primary hover:bg-gradient-primary-hover w-full text-white shadow-md shadow-indigo-500/30"
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Sıfırlama Bağlantısı Gönder
        </Button>
      </form>
    </AuthCard>
  );
}
