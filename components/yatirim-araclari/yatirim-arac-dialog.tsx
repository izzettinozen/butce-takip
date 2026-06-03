"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateYatirimArac,
  useUpdateYatirimArac,
} from "@/hooks/use-yatirim-araclari";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { numberToAmountInput, parseCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { YatirimArac, YatirimAracTip } from "@/types/database";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formSchema = z
  .object({
    ad: z
      .string()
      .min(1, "Araç adı gerekli")
      .max(100, "En fazla 100 karakter olabilir"),
    tip: z.enum(["birim_bazli", "tutar_bazli"]),
    birim: z.string().max(50, "En fazla 50 karakter olabilir").optional(),
    fiyat: z
      .string()
      .refine((v) => parseCurrency(v) > 0, "Sıfırdan büyük bir değer girin"),
  })
  .superRefine((val, ctx) => {
    if (val.tip === "birim_bazli" && !val.birim?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["birim"],
        message: "Birim gerekli (örn. gram, USD, adet)",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface YatirimAracDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null ise ekleme, dolu ise düzenleme modu. */
  arac: YatirimArac | null;
  /** Düzenlenen aracın işlemi var mı? Varsa tip ve birim kilitlenir. */
  hasIslem?: boolean;
}

const TIP_SECENEKLERI: { value: YatirimAracTip; label: string }[] = [
  { value: "birim_bazli", label: "Birim bazlı" },
  { value: "tutar_bazli", label: "Tutar bazlı" },
];

export function YatirimAracDialog({
  open,
  onOpenChange,
  arac,
  hasIslem = false,
}: YatirimAracDialogProps) {
  const isEdit = arac !== null;
  // İşlemi olan araçta tip ve birim değiştirilemez (veri bütünlüğü).
  const kilitli = isEdit && hasIslem;

  const createMutation = useCreateYatirimArac();
  const updateMutation = useUpdateYatirimArac();
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ad: "",
      tip: "birim_bazli",
      birim: "",
      fiyat: "",
    },
  });

  const tip = watch("tip");

  // Diyalog açıldığında formu ilgili kayıtla doldur / sıfırla.
  useEffect(() => {
    if (open)
      reset({
        ad: arac?.ad ?? "",
        tip: arac?.tip ?? "birim_bazli",
        birim: arac?.birim ?? "",
        fiyat: arac ? numberToAmountInput(arac.guncel_fiyat) : "",
      });
  }, [open, arac, reset]);

  async function onSubmit(values: FormValues) {
    const guncel_fiyat = parseCurrency(values.fiyat);
    const birim =
      values.tip === "birim_bazli" ? values.birim?.trim() || null : null;
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: arac.id,
          ad: values.ad,
          guncel_fiyat,
          // tip/birim yalnızca kilitsiz araçta güncellenir
          ...(kilitli ? {} : { tip: values.tip, birim }),
        });
        toast.success("Yatırım aracı güncellendi");
      } else {
        await createMutation.mutateAsync({
          ad: values.ad,
          tip: values.tip,
          birim,
          guncel_fiyat,
        });
        toast.success("Yatırım aracı eklendi");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("İşlem başarısız", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Yatırım Aracı Düzenle" : "Yeni Yatırım Aracı"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Aracın bilgilerini güncelleyin."
              : "Altın, döviz, kripto veya hisse gibi bir yatırım aracı ekleyin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Ad */}
          <div className="space-y-2">
            <Label htmlFor="ad">Ad</Label>
            <Input
              id="ad"
              autoFocus
              placeholder="Örn. Altın, Bitcoin, AAPL"
              aria-invalid={!!errors.ad}
              {...register("ad")}
            />
            {errors.ad && (
              <p className="text-destructive text-sm">{errors.ad.message}</p>
            )}
          </div>

          {/* Tip — segmented seçim */}
          <div className="space-y-2">
            <Label>Tip</Label>
            <Controller
              control={control}
              name="tip"
              render={({ field }) => (
                <div className="bg-muted/50 grid grid-cols-2 gap-1 rounded-lg border p-1">
                  {TIP_SECENEKLERI.map((secenek) => {
                    const secili = field.value === secenek.value;
                    return (
                      <button
                        key={secenek.value}
                        type="button"
                        disabled={kilitli}
                        onClick={() => field.onChange(secenek.value)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                          secili
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                          kilitli && "cursor-not-allowed opacity-60",
                        )}
                      >
                        {secenek.label}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {kilitli && (
              <p className="text-muted-foreground text-xs">
                Bu araca bağlı işlemler olduğu için tip ve birim
                değiştirilemez.
              </p>
            )}
          </div>

          {/* Birim bazlı: Birim + Güncel Birim Fiyat */}
          {tip === "birim_bazli" && (
            <div className="space-y-2">
              <Label htmlFor="birim">Birim</Label>
              <Input
                id="birim"
                placeholder="Örn. gram, USD, adet"
                disabled={kilitli}
                aria-invalid={!!errors.birim}
                {...register("birim")}
              />
              {errors.birim && (
                <p className="text-destructive text-sm">
                  {errors.birim.message}
                </p>
              )}
            </div>
          )}

          {/* Fiyat — birim bazlıda "Güncel Birim Fiyat", tutar bazlıda "Güncel Toplam Değer" */}
          <div className="space-y-2">
            <Label htmlFor="fiyat">
              {tip === "birim_bazli"
                ? "Güncel Birim Fiyat"
                : "Güncel Toplam Değer"}
            </Label>
            <Controller
              control={control}
              name="fiyat"
              render={({ field }) => (
                <CurrencyInput
                  id="fiyat"
                  placeholder="0,00"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={!!errors.fiyat}
                />
              )}
            />
            {errors.fiyat && (
              <p className="text-destructive text-sm">{errors.fiyat.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Kaydet" : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
