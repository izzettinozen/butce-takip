"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateHedef,
  useUpdateHedef,
  type ButceHedefiSatir,
} from "@/hooks/use-butce-hedefleri";
import { useGiderTurleri } from "@/hooks/use-gider-turleri";
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
  gider_turu_id: z.string().min(1, "Gider türü seçin"),
  donem_id: z.string().min(1, "Dönem seçin"),
  hedef_tutar: z
    .string()
    .min(1, "Hedef tutar gerekli")
    .refine((v) => parseCurrency(v) > 0, "Sıfırdan büyük bir tutar girin"),
});

type FormValues = z.infer<typeof formSchema>;

interface ButceHedefiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null ise ekleme, dolu ise düzenleme modu. */
  hedef: ButceHedefiSatir | null;
  /** Ekleme modunda varsayılan dönem. */
  defaultDonemId?: string;
}

export function ButceHedefiDialog({
  open,
  onOpenChange,
  hedef,
  defaultDonemId,
}: ButceHedefiDialogProps) {
  const isEdit = hedef !== null;
  const createMutation = useCreateHedef();
  const updateMutation = useUpdateHedef();
  const pending = createMutation.isPending || updateMutation.isPending;

  const { data: giderTurleri = [] } = useGiderTurleri();
  const { data: donemler = [] } = useDonemler();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { gider_turu_id: "", donem_id: "", hedef_tutar: "" },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      gider_turu_id: hedef?.giderTuruId ?? "",
      donem_id: hedef?.donemId ?? defaultDonemId ?? "",
      hedef_tutar: hedef ? numberToAmountInput(hedef.hedefTutar) : "",
    });
  }, [open, hedef, defaultDonemId, reset]);

  async function onSubmit(values: FormValues) {
    const input = {
      gider_turu_id: values.gider_turu_id,
      donem_id: values.donem_id,
      hedef_tutar: parseCurrency(values.hedef_tutar),
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: hedef.id, ...input });
        toast.success("Bütçe hedefi güncellendi");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("Bütçe hedefi eklendi");
      }
      onOpenChange(false);
    } catch (error) {
      // UNIQUE(user_id, gider_turu_id, donem_id) ihlali
      if ((error as { code?: string })?.code === "23505") {
        toast.error("Hedef zaten var", {
          description:
            "Bu dönem için bu gider türüne zaten bir hedef tanımlı.",
        });
        return;
      }
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
            {isEdit ? "Bütçe Hedefi Düzenle" : "Yeni Bütçe Hedefi"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Bütçe hedefinin bilgilerini güncelleyin."
              : "Bir gider türü için dönemsel harcama hedefi belirleyin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Gider Türü */}
          <div className="space-y-2">
            <Label htmlFor="gider_turu_id">Gider Türü</Label>
            <Controller
              control={control}
              name="gider_turu_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="gider_turu_id"
                    className="w-full"
                    aria-invalid={!!errors.gider_turu_id}
                  >
                    <SelectValue placeholder="Gider türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {giderTurleri.map((tur) => (
                      <SelectItem key={tur.id} value={tur.id}>
                        {tur.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gider_turu_id && (
              <p className="text-destructive text-sm">
                {errors.gider_turu_id.message}
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

          {/* Hedef Tutar */}
          <div className="space-y-2">
            <Label htmlFor="hedef_tutar">Hedef Tutar</Label>
            <Controller
              control={control}
              name="hedef_tutar"
              render={({ field }) => (
                <CurrencyInput
                  id="hedef_tutar"
                  placeholder="0,00"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={!!errors.hedef_tutar}
                />
              )}
            />
            {errors.hedef_tutar && (
              <p className="text-destructive text-sm">
                {errors.hedef_tutar.message}
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
