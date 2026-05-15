"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import {
  useCreateTekrarlayanGider,
  useUpdateTekrarlayanGider,
  type TekrarlayanGiderWithRelations,
} from "@/hooks/use-tekrarlayan-giderler";
import { useGiderTurleri } from "@/hooks/use-gider-turleri";
import { useGiderKalemleri } from "@/hooks/use-gider-kalemleri";
import { useOdemeTurleri } from "@/hooks/use-odeme-turleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { numberToAmountInput, parseCurrency } from "@/lib/format";
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
import { Switch } from "@/components/ui/switch";
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
  ayin_gunu: z
    .string()
    .min(1, "Ayın günü gerekli")
    .refine((v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 28;
    }, "1-28 arası bir gün girin"),
  aktif: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface TekrarlayanGiderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null ise ekleme, dolu ise düzenleme modu. */
  tekrarlayanGider: TekrarlayanGiderWithRelations | null;
}

export function TekrarlayanGiderDialog({
  open,
  onOpenChange,
  tekrarlayanGider,
}: TekrarlayanGiderDialogProps) {
  const isEdit = tekrarlayanGider !== null;
  const createMutation = useCreateTekrarlayanGider();
  const updateMutation = useUpdateTekrarlayanGider();
  const pending = createMutation.isPending || updateMutation.isPending;

  const { data: giderTurleri = [], isLoading: turlerLoading } =
    useGiderTurleri();
  const { data: giderKalemleri = [] } = useGiderKalemleri();
  const { data: odemeTurleri = [] } = useOdemeTurleri();
  const noTurler = !turlerLoading && giderTurleri.length === 0;

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
      ayin_gunu: "",
      aktif: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      tutar: tekrarlayanGider
        ? numberToAmountInput(tekrarlayanGider.tutar)
        : "",
      gider_turu_id: tekrarlayanGider?.gider_turu_id ?? "",
      gider_kalemi_id: tekrarlayanGider?.gider_kalemi_id ?? "",
      odeme_turu_id: tekrarlayanGider?.odeme_turu_id ?? "",
      aciklama: tekrarlayanGider?.aciklama ?? "",
      ayin_gunu: tekrarlayanGider
        ? String(tekrarlayanGider.ayin_gunu)
        : "",
      aktif: tekrarlayanGider?.aktif ?? true,
    });
  }, [open, tekrarlayanGider, reset]);

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
      ayin_gunu: Number(values.ayin_gunu),
      aktif: values.aktif,
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: tekrarlayanGider.id, ...input });
        toast.success("Tekrarlayan gider güncellendi");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("Tekrarlayan gider eklendi");
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
          <DialogTitle>
            {isEdit ? "Tekrarlayan Gider Düzenle" : "Yeni Tekrarlayan Gider"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Tekrarlayan gider tanımını güncelleyin."
              : "Her ay otomatik eklenecek düzenli bir gider tanımlayın."}
          </DialogDescription>
        </DialogHeader>

        {noTurler ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Tekrarlayan gider tanımlamadan önce en az bir gider türü, gider
              kalemi ve ödeme türü oluşturmanız gerekir.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Kapat
              </Button>
              <Button
                asChild
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Link href="/gider-turleri">Gider Türlerine Git</Link>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
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
                <p className="text-destructive text-sm">
                  {errors.tutar.message}
                </p>
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

            {/* Gider Kalemi */}
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

            {/* Ayın Günü */}
            <div className="space-y-2">
              <Label htmlFor="ayin_gunu">Ayın Günü</Label>
              <Input
                id="ayin_gunu"
                type="number"
                inputMode="numeric"
                min={1}
                max={28}
                placeholder="1-28"
                aria-invalid={!!errors.ayin_gunu}
                {...register("ayin_gunu")}
              />
              {errors.ayin_gunu ? (
                <p className="text-destructive text-sm">
                  {errors.ayin_gunu.message}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Her ayın bu gününde otomatik gider olarak eklenecek.
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
                rows={2}
                placeholder="Bu tekrarlayan gider hakkında not…"
                aria-invalid={!!errors.aciklama}
                {...register("aciklama")}
              />
              {errors.aciklama && (
                <p className="text-destructive text-sm">
                  {errors.aciklama.message}
                </p>
              )}
            </div>

            {/* Aktif */}
            <Controller
              control={control}
              name="aktif"
              render={({ field }) => (
                <div className="bg-muted/40 flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="aktif">Aktif</Label>
                    <p className="text-muted-foreground text-xs">
                      Pasif tanımlar otomatik gider oluşturmaz.
                    </p>
                  </div>
                  <Switch
                    id="aktif"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

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
        )}
      </DialogContent>
    </Dialog>
  );
}
