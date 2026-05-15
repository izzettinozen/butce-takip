"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateGelir,
  useUpdateGelir,
  type GelirWithRelations,
} from "@/hooks/use-gelirler";
import { useGelirTurleri } from "@/hooks/use-gelir-turleri";
import { useDonemler } from "@/hooks/use-donemler";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { ayAdi, numberToAmountInput, parseCurrency } from "@/lib/format";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  tutar: z
    .string()
    .min(1, "Tutar gerekli")
    .refine((v) => parseCurrency(v) > 0, "Sıfırdan büyük bir tutar girin"),
  gelir_turu_id: z.string().min(1, "Gelir türü seçin"),
  donem_id: z.string().min(1, "Dönem seçin"),
});

type FormValues = z.infer<typeof formSchema>;

interface GelirDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null ise ekleme, dolu ise düzenleme modu. */
  gelir: GelirWithRelations | null;
  /** Ekleme modunda varsayılan dönem (sayfada seçili dönem). */
  defaultDonemId?: string;
}

export function GelirDialog({
  open,
  onOpenChange,
  gelir,
  defaultDonemId,
}: GelirDialogProps) {
  const isEdit = gelir !== null;
  const createMutation = useCreateGelir();
  const updateMutation = useUpdateGelir();
  const pending = createMutation.isPending || updateMutation.isPending;

  const { data: gelirTurleri = [] } = useGelirTurleri();
  const { data: donemler = [] } = useDonemler();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { tutar: "", gelir_turu_id: "", donem_id: "" },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      tutar: gelir ? numberToAmountInput(gelir.tutar) : "",
      gelir_turu_id: gelir?.gelir_turu_id ?? "",
      donem_id: gelir?.donem_id ?? defaultDonemId ?? "",
    });
  }, [open, gelir, defaultDonemId, reset]);

  async function onSubmit(values: FormValues) {
    const input = {
      tutar: parseCurrency(values.tutar),
      gelir_turu_id: values.gelir_turu_id,
      donem_id: values.donem_id,
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: gelir.id, ...input });
        toast.success("Gelir güncellendi");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("Gelir eklendi");
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
          <DialogTitle>{isEdit ? "Gelir Düzenle" : "Yeni Gelir"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Gelir kaydının bilgilerini güncelleyin."
              : "Yeni bir gelir kaydı ekleyin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Tutar */}
          <div className="space-y-2">
            <Label htmlFor="tutar">Tutar</Label>
            <Controller
              control={control}
              name="tutar"
              render={({ field }) => (
                <CurrencyInput
                  id="tutar"
                  autoFocus
                  placeholder="0,00"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={!!errors.tutar}
                />
              )}
            />
            {errors.tutar && (
              <p className="text-destructive text-sm">{errors.tutar.message}</p>
            )}
          </div>

          {/* Gelir Türü */}
          <div className="space-y-2">
            <Label htmlFor="gelir_turu_id">Gelir Türü</Label>
            <Controller
              control={control}
              name="gelir_turu_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="gelir_turu_id"
                    className="w-full"
                    aria-invalid={!!errors.gelir_turu_id}
                  >
                    <SelectValue placeholder="Gelir türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {gelirTurleri.map((tur) => (
                      <SelectItem key={tur.id} value={tur.id}>
                        {tur.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gelir_turu_id && (
              <p className="text-destructive text-sm">
                {errors.gelir_turu_id.message}
              </p>
            )}
          </div>

          {/* Dönem */}
          <div className="space-y-2">
            <Label htmlFor="donem_id">Dönem</Label>
            <Controller
              control={control}
              name="donem_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="donem_id"
                    className="w-full"
                    aria-invalid={!!errors.donem_id}
                  >
                    <SelectValue placeholder="Dönem seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {donemler.map((donem) => (
                      <SelectItem key={donem.id} value={donem.id}>
                        {ayAdi(donem.ay)} {donem.yil}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.donem_id && (
              <p className="text-destructive text-sm">
                {errors.donem_id.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Vazgeç
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
