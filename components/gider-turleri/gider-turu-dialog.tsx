"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateGiderTuru,
  useUpdateGiderTuru,
} from "@/hooks/use-gider-turleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import type { GiderTuru } from "@/types/database";
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

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Gider türü adı gerekli")
    .max(100, "En fazla 100 karakter olabilir"),
});

type FormValues = z.infer<typeof formSchema>;

interface GiderTuruDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null ise ekleme, dolu ise düzenleme modu. */
  giderTuru: GiderTuru | null;
}

export function GiderTuruDialog({
  open,
  onOpenChange,
  giderTuru,
}: GiderTuruDialogProps) {
  const isEdit = giderTuru !== null;
  const createMutation = useCreateGiderTuru();
  const updateMutation = useUpdateGiderTuru();
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  // Diyalog açıldığında formu ilgili kayıtla doldur / sıfırla.
  useEffect(() => {
    if (open) reset({ name: giderTuru?.name ?? "" });
  }, [open, giderTuru, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: giderTuru.id, name: values.name });
        toast.success("Gider türü güncellendi");
      } else {
        await createMutation.mutateAsync(values.name);
        toast.success("Gider türü eklendi");
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
            {isEdit ? "Gider Türü Düzenle" : "Yeni Gider Türü"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Gider türünün adını güncelleyin."
              : "Giderleri sınıflandırmak için yeni bir üst kategori ekleyin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Gider Türü Adı</Label>
            <Input
              id="name"
              autoFocus
              placeholder="Örn. Ev Giderleri, Araç, Market"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
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
