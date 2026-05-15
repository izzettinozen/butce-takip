"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateGelirTuru,
  useUpdateGelirTuru,
} from "@/hooks/use-gelir-turleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import type { GelirTuru } from "@/types/database";
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
    .min(1, "Gelir türü adı gerekli")
    .max(100, "En fazla 100 karakter olabilir"),
});

type FormValues = z.infer<typeof formSchema>;

interface GelirTuruDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null ise ekleme, dolu ise düzenleme modu. */
  gelirTuru: GelirTuru | null;
}

export function GelirTuruDialog({
  open,
  onOpenChange,
  gelirTuru,
}: GelirTuruDialogProps) {
  const isEdit = gelirTuru !== null;
  const createMutation = useCreateGelirTuru();
  const updateMutation = useUpdateGelirTuru();
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

  useEffect(() => {
    if (open) reset({ name: gelirTuru?.name ?? "" });
  }, [open, gelirTuru, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: gelirTuru.id, name: values.name });
        toast.success("Gelir türü güncellendi");
      } else {
        await createMutation.mutateAsync(values.name);
        toast.success("Gelir türü eklendi");
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
            {isEdit ? "Gelir Türü Düzenle" : "Yeni Gelir Türü"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Gelir türünün adını güncelleyin."
              : "Gelirleri sınıflandırmak için yeni bir kategori ekleyin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Gelir Türü Adı</Label>
            <Input
              id="name"
              autoFocus
              placeholder="Örn. Maaş - Eş 1, Kira Geliri, Ek İş"
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
