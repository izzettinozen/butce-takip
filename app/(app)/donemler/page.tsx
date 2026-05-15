"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  countDonemUsage,
  useDeleteDonem,
  useDonemler,
  type DonemOzet,
  type DonemUsage,
} from "@/hooks/use-donemler";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { ayAdi, formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { DonemDialog } from "@/components/donemler/donem-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const COLUMNS = [
  "Dönem",
  "Toplam Gelir",
  "Toplam Gider",
  "Net",
  "Durum",
  "İşlemler",
];

type DeleteState =
  | { phase: "idle" }
  | { phase: "checking"; donem: DonemOzet }
  | { phase: "confirm"; donem: DonemOzet; tekrarlayan: number }
  | { phase: "blocked"; donem: DonemOzet; usage: DonemUsage };

/** Net duruma göre etiket ve renk sınıfı. */
function durumBilgisi(net: number): { label: string; className: string } {
  if (net > 0) {
    return {
      label: "Artıda",
      className: "border-transparent bg-success/15 text-success",
    };
  }
  if (net < 0) {
    return {
      label: "Açık",
      className: "border-transparent bg-destructive/15 text-destructive",
    };
  }
  return { label: "Başabaş", className: "" };
}

/** Engelleyici bağlı kayıtları okunabilir metne çevirir. */
function blokajMesaji(usage: DonemUsage): string {
  const parcalar: string[] = [];
  if (usage.giderler > 0) parcalar.push(`${usage.giderler} gider`);
  if (usage.gelirler > 0) parcalar.push(`${usage.gelirler} gelir`);
  if (usage.butceHedefleri > 0)
    parcalar.push(`${usage.butceHedefleri} bütçe hedefi`);
  return parcalar.join(", ");
}

export default function DonemlerPage() {
  const { data, isLoading, isError, refetch } = useDonemler();
  const deleteMutation = useDeleteDonem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteState>({ phase: "idle" });
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );

  // Mevcut yıllar (azalan).
  const yillar = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((d) => d.yil))].sort((a, b) => b - a);
  }, [data]);

  // Seçili yıl listede yoksa en güncel yıla düş (state senkronu yerine türetme).
  const effectiveYear =
    yillar.length > 0 && !yillar.includes(selectedYear)
      ? yillar[0]
      : selectedYear;

  const filtrelenmis = useMemo(
    () => (data ?? []).filter((d) => d.yil === effectiveYear),
    [data, effectiveYear],
  );

  async function handleDeleteClick(donem: DonemOzet) {
    setDeleteState({ phase: "checking", donem });
    try {
      const usage = await countDonemUsage(donem.id);
      const blocking =
        usage.giderler + usage.gelirler + usage.butceHedefleri;
      setDeleteState(
        blocking > 0
          ? { phase: "blocked", donem, usage }
          : { phase: "confirm", donem, tekrarlayan: usage.tekrarlayan },
      );
    } catch (error) {
      toast.error("Kontrol başarısız", {
        description: getSupabaseErrorMessage(error),
      });
      setDeleteState({ phase: "idle" });
    }
  }

  async function handleConfirmDelete() {
    if (deleteState.phase !== "confirm") return;
    try {
      await deleteMutation.mutateAsync(deleteState.donem.id);
      toast.success("Dönem silindi");
      setDeleteState({ phase: "idle" });
    } catch (error) {
      toast.error("Silinemedi", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  const activeDonem =
    deleteState.phase !== "idle" ? deleteState.donem : null;

  const confirmDescription = (() => {
    if (deleteState.phase !== "confirm") return "";
    const base = `${ayAdi(deleteState.donem.ay)} ${deleteState.donem.yil} dönemi silinecek. Bu işlem geri alınamaz.`;
    if (deleteState.tekrarlayan > 0) {
      return `${base} Ayrıca ${deleteState.tekrarlayan} tekrarlayan giderin "son oluşturulan dönem" bilgisi sıfırlanacak.`;
    }
    return base;
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dönemler"
        description="Gelir ve giderlerinizin gruplandığı ay/yıl dönemleri."
      >
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
        >
          <Plus className="size-4" />
          Yeni Dönem
        </Button>
      </PageHeader>

      {/* Yıl filtresi */}
      {yillar.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Yıl:</span>
          <Select
            value={String(effectiveYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yillar.map((yil) => (
                <SelectItem key={yil} value={String(yil)}>
                  {yil}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card className="overflow-hidden py-0">
        {isLoading ? (
          <TableSkeleton columns={COLUMNS} />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Dönemler yüklenirken bir hata oluştu.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Tekrar dene
            </Button>
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="Henüz dönem yok"
            description="Yeni bir dönem ekleyerek gelir ve giderlerinizi gruplamaya başlayın."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Dönem
              </Button>
            }
          />
        ) : filtrelenmis.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title={`${effectiveYear} yılına ait dönem yok`}
            description="Başka bir yıl seçin ya da bu yıl için yeni bir dönem ekleyin."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dönem</TableHead>
                <TableHead className="text-right">Toplam Gelir</TableHead>
                <TableHead className="text-right">Toplam Gider</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-16 text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrelenmis.map((donem) => {
                const durum = durumBilgisi(donem.net);
                const checking =
                  deleteState.phase === "checking" &&
                  deleteState.donem.id === donem.id;
                return (
                  <TableRow key={donem.id}>
                    <TableCell className="font-medium">
                      {ayAdi(donem.ay)} {donem.yil}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(donem.toplamGelir)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(donem.toplamGider)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        donem.net > 0 && "text-success",
                        donem.net < 0 && "text-destructive",
                        donem.net === 0 && "text-muted-foreground",
                      )}
                    >
                      {formatCurrency(donem.net)}
                    </TableCell>
                    <TableCell>
                      {donem.net === 0 ? (
                        <Badge variant="secondary">{durum.label}</Badge>
                      ) : (
                        <Badge className={durum.className}>
                          {durum.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${ayAdi(donem.ay)} ${donem.yil} dönemini sil`}
                        className="text-destructive hover:text-destructive"
                        disabled={checking}
                        onClick={() => handleDeleteClick(donem)}
                      >
                        {checking ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <DonemDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Bağlı engelleyici kayıt yoksa: silme onayı */}
      <ConfirmDialog
        open={deleteState.phase === "confirm"}
        onOpenChange={(open) => !open && setDeleteState({ phase: "idle" })}
        title="Dönemi sil"
        description={confirmDescription}
        confirmText="Sil"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Bağlı engelleyici kayıt varsa: silme engellendi uyarısı */}
      <AlertDialog
        open={deleteState.phase === "blocked"}
        onOpenChange={(open) => !open && setDeleteState({ phase: "idle" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dönem silinemez</AlertDialogTitle>
            <AlertDialogDescription>
              {activeDonem
                ? `${ayAdi(activeDonem.ay)} ${activeDonem.yil} dönemine bağlı `
                : ""}
              {deleteState.phase === "blocked"
                ? blokajMesaji(deleteState.usage)
                : ""}
              {" kaydı bulunuyor. Bu dönemi silebilmek için önce ilgili "}
              {"kayıtları silmeniz gerekir."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteState({ phase: "idle" })}>
              Anladım
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
