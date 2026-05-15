"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateOdemeTuru,
  useUpdateOdemeTuru,
} from "@/hooks/use-odeme-turleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import type { OdemeTuru } from "@/types/database";
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
    .min(1, "Ödeme türü adı gerekli")
    .max(100, "En fazla 100 karakter olabilir"),
});

type FormValues = z.infer<typeof formSchema>;

interface OdemeTuruDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null ise ekleme, dolu ise düzenleme modu. */
  odemeTuru: OdemeTuru | null;
}

export function OdemeTuruDialog({
  open,
  onOpenChange,
  odemeTuru,
}: OdemeTuruDialogProps) {
  const isEdit = odemeTuru !== null;
  const createMutation = useCreateOdemeTuru();
  const updateMutation = useUpdateOdemeTuru();
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
    if (open) reset({ name: odemeTuru?.name ?? "" });
  }, [open, odemeTuru, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: odemeTuru.id, name: values.name });
        toast.success("Ödeme türü güncellendi");
      } else {
        await createMutation.mutateAsync(values.name);
        toast.success("Ödeme türü eklendi");
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
            {isEdit ? "Ödeme Türü Düzenle" : "Yeni Ödeme Türü"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ödeme türünün adını güncelleyin."
              : "Giderlerde kullanmak için yeni bir ödeme yöntemi ekleyin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Ödeme Türü Adı</Label>
            <Input
              id="name"
              autoFocus
              placeholder="Örn. Banka Havalesi, Otomatik Ödeme"
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
