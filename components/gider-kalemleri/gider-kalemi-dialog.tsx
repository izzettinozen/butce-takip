"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import {
  useCreateGiderKalemi,
  useUpdateGiderKalemi,
  type GiderKalemiWithTuru,
} from "@/hooks/use-gider-kalemleri";
import { useGiderTurleri } from "@/hooks/use-gider-turleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
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
  name: z
    .string()
    .min(1, "Gider kalemi adı gerekli")
    .max(100, "En fazla 100 karakter olabilir"),
  gider_turu_id: z.string().min(1, "Bağlı gider türünü seçin"),
});

type FormValues = z.infer<typeof formSchema>;

interface GiderKalemiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null ise ekleme, dolu ise düzenleme modu. */
  giderKalemi: GiderKalemiWithTuru | null;
}

export function GiderKalemiDialog({
  open,
  onOpenChange,
  giderKalemi,
}: GiderKalemiDialogProps) {
  const isEdit = giderKalemi !== null;
  const createMutation = useCreateGiderKalemi();
  const updateMutation = useUpdateGiderKalemi();
  const pending = createMutation.isPending || updateMutation.isPending;

  const { data: giderTurleri = [], isLoading: turlerLoading } =
    useGiderTurleri();
  const noTurler = !turlerLoading && giderTurleri.length === 0;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", gider_turu_id: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: giderKalemi?.name ?? "",
        gider_turu_id: giderKalemi?.gider_turu_id ?? "",
      });
    }
  }, [open, giderKalemi, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: giderKalemi.id, ...values });
        toast.success("Gider kalemi güncellendi");
      } else {
        await createMutation.mutateAsync(values);
        toast.success("Gider kalemi eklendi");
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
            {isEdit ? "Gider Kalemi Düzenle" : "Yeni Gider Kalemi"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Gider kaleminin adını veya bağlı olduğu türü güncelleyin."
              : "Bir gider türüne bağlı yeni bir alt kalem ekleyin."}
          </DialogDescription>
        </DialogHeader>

        {noTurler ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Henüz hiç gider türünüz yok. Gider kalemi eklemeden önce en az bir
              gider türü oluşturmanız gerekir.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
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
            <div className="space-y-2">
              <Label htmlFor="name">Gider Kalemi Adı</Label>
              <Input
                id="name"
                autoFocus
                placeholder="Örn. Kira, Market, Benzin"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gider_turu_id">Bağlı Gider Türü</Label>
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
