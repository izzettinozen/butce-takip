"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCreateDonem } from "@/hooks/use-donemler";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { AY_ADLARI } from "@/lib/format";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  yil: z
    .string()
    .min(1, "Yıl gerekli")
    .refine((value) => {
      const n = Number(value);
      return Number.isInteger(n) && n >= 2000 && n <= 2100;
    }, "2000-2100 arası geçerli bir yıl girin"),
  ay: z.string().min(1, "Ay seçin"),
});

type FormValues = z.infer<typeof formSchema>;

interface DonemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DonemDialog({ open, onOpenChange }: DonemDialogProps) {
  const createMutation = useCreateDonem();
  const now = new Date();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { yil: "", ay: "" },
  });

  // Diyalog açıldığında varsayılan: içinde bulunulan yıl/ay.
  useEffect(() => {
    if (open) {
      reset({
        yil: String(now.getFullYear()),
        ay: String(now.getMonth() + 1),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    try {
      await createMutation.mutateAsync({
        yil: Number(values.yil),
        ay: Number(values.ay),
      });
      toast.success("Dönem eklendi");
      onOpenChange(false);
    } catch (error) {
      // UNIQUE(user_id, yil, ay) ihlali
      const code = (error as { code?: string })?.code;
      if (code === "23505") {
        toast.error("Bu dönem zaten var", {
          description: "Aynı yıl ve ay için ikinci bir dönem eklenemez.",
        });
        return;
      }
      toast.error("Dönem eklenemedi", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Dönem</DialogTitle>
          <DialogDescription>
            Gelir ve giderlerinizi gruplamak için yeni bir ay/yıl dönemi
            ekleyin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="yil">Yıl</Label>
            <Input
              id="yil"
              type="number"
              inputMode="numeric"
              placeholder="2026"
              aria-invalid={!!errors.yil}
              {...register("yil")}
            />
            {errors.yil && (
              <p className="text-destructive text-sm">{errors.yil.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ay">Ay</Label>
            <Controller
              control={control}
              name="ay"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="ay"
                    className="w-full"
                    aria-invalid={!!errors.ay}
                  >
                    <SelectValue placeholder="Ay seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {AY_ADLARI.map((adi, index) => (
                      <SelectItem key={adi} value={String(index + 1)}>
                        {adi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.ay && (
              <p className="text-destructive text-sm">{errors.ay.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
            >
              {createMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Ekle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
