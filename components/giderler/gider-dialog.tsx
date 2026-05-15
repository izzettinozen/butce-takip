"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateGider,
  useUpdateGider,
  type GiderWithRelations,
} from "@/hooks/use-giderler";
import { useGiderTurleri } from "@/hooks/use-gider-turleri";
import { useGiderKalemleri } from "@/hooks/use-gider-kalemleri";
import { useOdemeTurleri } from "@/hooks/use-odeme-turleri";
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
import { Textarea } from "@/components/ui/textarea";
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
  gider_turu_id: z.string().min(1, "Gider türü seçin"),
  gider_kalemi_id: z.string().min(1, "Gider kalemi seçin"),
  odeme_turu_id: z.string().min(1, "Ödeme türü seçin"),
  aciklama: z.string().max(500, "En fazla 500 karakter olabilir").optional(),
  donem_id: z.string().min(1, "Dönem seçin"),
});

type FormValues = z.infer<typeof formSchema>;

interface GiderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null ise ekleme, dolu ise düzenleme modu. */
  gider: GiderWithRelations | null;
  /** Ekleme modunda varsayılan dönem (sayfada seçili dönem). */
  defaultDonemId?: string;
}

export function GiderDialog({
  open,
  onOpenChange,
  gider,
  defaultDonemId,
}: GiderDialogProps) {
  const isEdit = gider !== null;
  const createMutation = useCreateGider();
  const updateMutation = useUpdateGider();
  const pending = createMutation.isPending || updateMutation.isPending;

  const { data: giderTurleri = [] } = useGiderTurleri();
  const { data: giderKalemleri = [] } = useGiderKalemleri();
  const { data: odemeTurleri = [] } = useOdemeTurleri();
  const { data: donemler = [] } = useDonemler();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tutar: "",
      gider_turu_id: "",
      gider_kalemi_id: "",
      odeme_turu_id: "",
      aciklama: "",
      donem_id: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      tutar: gider ? numberToAmountInput(gider.tutar) : "",
      gider_turu_id: gider?.gider_turu_id ?? "",
      gider_kalemi_id: gider?.gider_kalemi_id ?? "",
      odeme_turu_id: gider?.odeme_turu_id ?? "",
      aciklama: gider?.aciklama ?? "",
      donem_id: gider?.donem_id ?? defaultDonemId ?? "",
    });
  }, [open, gider, defaultDonemId, reset]);

  // Seçili gider türüne bağlı kalemler.
  const selectedTuruId = watch("gider_turu_id");
  const filtrelenmisKalemler = giderKalemleri.filter(
    (k) => k.gider_turu_id === selectedTuruId,
  );

  async function onSubmit(values: FormValues) {
    const input = {
      tutar: parseCurrency(values.tutar),
      gider_turu_id: values.gider_turu_id,
      gider_kalemi_id: values.gider_kalemi_id,
      odeme_turu_id: values.odeme_turu_id,
      aciklama: values.aciklama?.trim() || null,
      donem_id: values.donem_id,
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: gider.id, ...input });
        toast.success("Gider güncellendi");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("Gider eklendi");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Gider Düzenle" : "Yeni Gider"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Gider kaydının bilgilerini güncelleyin."
              : "Yeni bir gider kaydı ekleyin."}
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

          {/* Gider Türü */}
          <div className="space-y-2">
            <Label htmlFor="gider_turu_id">Gider Türü</Label>
            <Controller
              control={control}
              name="gider_turu_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    // Tür değişince bağlı kalem seçimini sıfırla.
                    setValue("gider_kalemi_id", "");
                  }}
                >
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

          {/* Gider Kalemi (türe bağlı) */}
          <div className="space-y-2">
            <Label htmlFor="gider_kalemi_id">Gider Kalemi</Label>
            <Controller
              control={control}
              name="gider_kalemi_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!selectedTuruId}
                >
                  <SelectTrigger
                    id="gider_kalemi_id"
                    className="w-full"
                    aria-invalid={!!errors.gider_kalemi_id}
                  >
                    <SelectValue
                      placeholder={
                        selectedTuruId
                          ? "Gider kalemi seçin"
                          : "Önce gider türü seçin"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filtrelenmisKalemler.length === 0 ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        Bu türe ait kalem yok
                      </div>
                    ) : (
                      filtrelenmisKalemler.map((kalem) => (
                        <SelectItem key={kalem.id} value={kalem.id}>
                          {kalem.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gider_kalemi_id && (
              <p className="text-destructive text-sm">
                {errors.gider_kalemi_id.message}
              </p>
            )}
          </div>

          {/* Ödeme Türü */}
          <div className="space-y-2">
            <Label htmlFor="odeme_turu_id">Ödeme Türü</Label>
            <Controller
              control={control}
              name="odeme_turu_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="odeme_turu_id"
                    className="w-full"
                    aria-invalid={!!errors.odeme_turu_id}
                  >
                    <SelectValue placeholder="Ödeme türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {odemeTurleri.map((odeme) => (
                      <SelectItem key={odeme.id} value={odeme.id}>
                        {odeme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.odeme_turu_id && (
              <p className="text-destructive text-sm">
                {errors.odeme_turu_id.message}
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

          {/* Açıklama */}
          <div className="space-y-2">
            <Label htmlFor="aciklama">
              Açıklama{" "}
              <span className="text-muted-foreground font-normal">
                (opsiyonel)
              </span>
            </Label>
            <Textarea
              id="aciklama"
              rows={3}
              placeholder="Bu gider hakkında not…"
              aria-invalid={!!errors.aciklama}
              {...register("aciklama")}
            />
            {errors.aciklama && (
              <p className="text-destructive text-sm">
                {errors.aciklama.message}
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
