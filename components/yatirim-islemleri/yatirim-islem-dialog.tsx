"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateYatirimIslem,
  useUpdateYatirimIslem,
  type YatirimIslemRow,
} from "@/hooks/use-yatirim-islemleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import {
  formatCurrency,
  numberToAmountInput,
  parseAdet,
  parseCurrency,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { YatirimArac, YatirimIslemTip } from "@/types/database";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIP_SECENEKLERI: { value: YatirimIslemTip; label: string }[] = [
  { value: "alis", label: "Alış" },
  { value: "satis", label: "Satış" },
  { value: "cekme", label: "Çekme" },
];

const formSchema = z
  .object({
    tarih: z.string().min(1, "Tarih gerekli"),
    tip: z.enum(["alis", "satis", "cekme"]),
    arac_id: z.string().optional(),
    tutarMode: z.enum(["hesapla", "direkt"]),
    birimFiyat: z.string().optional(),
    adet: z.string().optional(),
    tutar: z.string().optional(),
    aciklama: z.string().max(500, "En fazla 500 karakter").optional(),
  })
  .superRefine((val, ctx) => {
    const araclıTip = val.tip === "alis" || val.tip === "satis";
    if (araclıTip && !val.arac_id) {
      ctx.addIssue({
        code: "custom",
        path: ["arac_id"],
        message: "Araç seçin",
      });
    }
    if (araclıTip && val.tutarMode === "hesapla") {
      if (!val.birimFiyat || parseCurrency(val.birimFiyat) <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["birimFiyat"],
          message: "Birim fiyat girin",
        });
      }
      if (!val.adet || parseAdet(val.adet) <= 0) {
        ctx.addIssue({ code: "custom", path: ["adet"], message: "Adet girin" });
      }
    } else {
      // direkt tutar (alış/satış direkt) veya çekme
      if (!val.tutar || parseCurrency(val.tutar) <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["tutar"],
          message: "Sıfırdan büyük bir tutar girin",
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface YatirimIslemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null ise ekleme, dolu ise düzenleme modu. */
  islem: YatirimIslemRow | null;
  /** Tüm araçlar (dropdown aktifleri gösterir; düzenlenen pasif araç dahil edilir). */
  araclar: YatirimArac[];
}

/** Bugünün yerel tarihini yyyy-MM-dd döndürür. */
function bugun(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function YatirimIslemDialog({
  open,
  onOpenChange,
  islem,
  araclar,
}: YatirimIslemDialogProps) {
  const isEdit = islem !== null;
  const createMutation = useCreateYatirimIslem();
  const updateMutation = useUpdateYatirimIslem();
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tarih: bugun(),
      tip: "alis",
      arac_id: "",
      tutarMode: "hesapla",
      birimFiyat: "",
      adet: "",
      tutar: "",
      aciklama: "",
    },
  });

  const tip = watch("tip");
  const aracId = watch("arac_id");
  const tutarMode = watch("tutarMode");
  const birimFiyat = watch("birimFiyat");
  const adet = watch("adet");

  const araclıTip = tip === "alis" || tip === "satis";

  // Dropdown seçenekleri: aktif araçlar + (düzenlemede) seçili pasif araç.
  const aracSecenekleri = useMemo(() => {
    const aktifler = araclar.filter((a) => a.aktif);
    if (
      isEdit &&
      islem?.arac_id &&
      !aktifler.some((a) => a.id === islem.arac_id)
    ) {
      const pasif = araclar.find((a) => a.id === islem.arac_id);
      if (pasif) return [pasif, ...aktifler];
    }
    return aktifler;
  }, [araclar, isEdit, islem]);

  const seciliArac = aracSecenekleri.find((a) => a.id === aracId) ?? null;
  const tutarBazli = seciliArac?.tip === "tutar_bazli";
  // Tutar bazlı araçta "Birim Fiyat × Adet" anlamsız → her zaman direkt tutar.
  const hesaplaGorunur = araclıTip && !tutarBazli;
  const etkinMode: "hesapla" | "direkt" =
    hesaplaGorunur && tutarMode === "hesapla" ? "hesapla" : "direkt";

  // Tutar bazlı araç seçilince modu direkt'e sabitle.
  useEffect(() => {
    if (tutarBazli && tutarMode !== "direkt") setValue("tutarMode", "direkt");
  }, [tutarBazli, tutarMode, setValue]);

  // Hesaplanan tutar (Birim Fiyat × Adet).
  const hesaplananTutar = useMemo(() => {
    return parseCurrency(birimFiyat ?? "") * parseAdet(adet ?? "");
  }, [birimFiyat, adet]);

  // Diyalog açıldığında formu doldur / sıfırla.
  useEffect(() => {
    if (!open) return;
    if (islem) {
      const hesapMod =
        islem.birim_fiyat != null && islem.adet != null ? "hesapla" : "direkt";
      reset({
        tarih: islem.tarih,
        tip: islem.tip,
        arac_id: islem.arac_id ?? "",
        tutarMode: hesapMod,
        birimFiyat:
          islem.birim_fiyat != null
            ? numberToAmountInput(islem.birim_fiyat)
            : "",
        adet: islem.adet != null ? String(islem.adet) : "",
        tutar: numberToAmountInput(islem.tutar),
        aciklama: islem.aciklama ?? "",
      });
    } else {
      reset({
        tarih: bugun(),
        tip: "alis",
        arac_id: "",
        tutarMode: "hesapla",
        birimFiyat: "",
        adet: "",
        tutar: "",
        aciklama: "",
      });
    }
  }, [open, islem, reset]);

  async function onSubmit(values: FormValues) {
    const aciklama = values.aciklama?.trim() || null;
    let input;
    if (values.tip === "cekme") {
      input = {
        tarih: values.tarih,
        tip: "cekme" as const,
        arac_id: null,
        birim_fiyat: null,
        adet: null,
        tutar: parseCurrency(values.tutar ?? ""),
        aciklama,
      };
    } else if (etkinMode === "hesapla") {
      const bf = parseCurrency(values.birimFiyat ?? "");
      const ad = parseAdet(values.adet ?? "");
      input = {
        tarih: values.tarih,
        tip: values.tip,
        arac_id: values.arac_id || null,
        birim_fiyat: bf,
        adet: ad,
        tutar: bf * ad,
        aciklama,
      };
    } else {
      input = {
        tarih: values.tarih,
        tip: values.tip,
        arac_id: values.arac_id || null,
        birim_fiyat: null,
        adet: null,
        tutar: parseCurrency(values.tutar ?? ""),
        aciklama,
      };
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: islem.id, ...input });
        toast.success("İşlem güncellendi");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("İşlem eklendi");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Yatırım İşlemi Düzenle" : "Yeni Yatırım İşlemi"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "İşlemin bilgilerini güncelleyin."
              : "Alış, satış veya çekme işlemi kaydedin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Tarih */}
          <div className="space-y-2">
            <Label htmlFor="tarih">Tarih</Label>
            <Input
              id="tarih"
              type="date"
              aria-invalid={!!errors.tarih}
              {...register("tarih")}
            />
            {errors.tarih && (
              <p className="text-destructive text-sm">{errors.tarih.message}</p>
            )}
          </div>

          {/* İşlem Tipi — segmented */}
          <div className="space-y-2">
            <Label>İşlem Tipi</Label>
            <Controller
              control={control}
              name="tip"
              render={({ field }) => (
                <div className="bg-muted/50 grid grid-cols-3 gap-1 rounded-lg border p-1">
                  {TIP_SECENEKLERI.map((s) => {
                    const secili = field.value === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => field.onChange(s.value)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                          secili
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {/* Araç — yalnızca alış/satış */}
          {araclıTip && (
            <div className="space-y-2">
              <Label htmlFor="arac_id">Araç</Label>
              <Controller
                control={control}
                name="arac_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="arac_id"
                      className="w-full"
                      aria-invalid={!!errors.arac_id}
                    >
                      <SelectValue placeholder="Araç seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {aracSecenekleri.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-sm">
                          Aktif araç yok
                        </div>
                      ) : (
                        aracSecenekleri.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.ad}
                            {!a.aktif ? " (pasif)" : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.arac_id && (
                <p className="text-destructive text-sm">
                  {errors.arac_id.message}
                </p>
              )}
            </div>
          )}

          {/* Tutar girişi — alış/satış */}
          {araclıTip && (
            <div className="space-y-3">
              {/* Tutar girişi modu — yalnızca birim bazlı araçta seçilebilir */}
              {hesaplaGorunur && (
                <Controller
                  control={control}
                  name="tutarMode"
                  render={({ field }) => (
                    <div className="bg-muted/50 grid grid-cols-2 gap-1 rounded-lg border p-1">
                      {[
                        { value: "hesapla", label: "Birim Fiyat × Adet" },
                        { value: "direkt", label: "Direkt Tutar" },
                      ].map((m) => {
                        const secili = field.value === m.value;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => field.onChange(m.value)}
                            className={cn(
                              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                              secili
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              )}

              {etkinMode === "hesapla" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="birimFiyat">Birim Fiyat</Label>
                      <Controller
                        control={control}
                        name="birimFiyat"
                        render={({ field }) => (
                          <CurrencyInput
                            id="birimFiyat"
                            placeholder="0,00"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            aria-invalid={!!errors.birimFiyat}
                          />
                        )}
                      />
                      {errors.birimFiyat && (
                        <p className="text-destructive text-sm">
                          {errors.birimFiyat.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adet">Adet</Label>
                      <Input
                        id="adet"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0"
                        aria-invalid={!!errors.adet}
                        {...register("adet")}
                      />
                      {errors.adet && (
                        <p className="text-destructive text-sm">
                          {errors.adet.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted/40 flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Tutar</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(hesaplananTutar)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="tutar">Tutar</Label>
                  <Controller
                    control={control}
                    name="tutar"
                    render={({ field }) => (
                      <CurrencyInput
                        id="tutar"
                        placeholder="0,00"
                        value={field.value ?? ""}
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
              )}
            </div>
          )}

          {/* Çekme — sadece tutar */}
          {tip === "cekme" && (
            <div className="space-y-2">
              <Label htmlFor="tutar-cekme">Tutar</Label>
              <Controller
                control={control}
                name="tutar"
                render={({ field }) => (
                  <CurrencyInput
                    id="tutar-cekme"
                    placeholder="0,00"
                    value={field.value ?? ""}
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
          )}

          {/* Açıklama */}
          <div className="space-y-2">
            <Label htmlFor="aciklama">Açıklama (opsiyonel)</Label>
            <Textarea
              id="aciklama"
              rows={2}
              placeholder="Not ekleyin"
              {...register("aciklama")}
            />
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
