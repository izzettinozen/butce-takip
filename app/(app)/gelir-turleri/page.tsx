"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import {
  countGelirlerForTuru,
  useDeleteGelirTuru,
  useGelirTurleri,
} from "@/hooks/use-gelir-turleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { GelirTuru } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { GelirTuruDialog } from "@/components/gelir-turleri/gelir-turu-dialog";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLUMNS = ["#", "Gelir Türü", "Oluşturulma Tarihi", "İşlemler"];

/** Silme akışının durumu: bağlı kayıt kontrolü RESTRICT davranışı içindir. */
type DeleteState =
  | { phase: "idle" }
  | { phase: "checking"; gelirTuru: GelirTuru }
  | { phase: "confirm"; gelirTuru: GelirTuru }
  | { phase: "blocked"; gelirTuru: GelirTuru; count: number };

export default function GelirTurleriPage() {
  const { data, isLoading, isError, refetch } = useGelirTurleri();
  const deleteMutation = useDeleteGelirTuru();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GelirTuru | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>({ phase: "idle" });

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(gelirTuru: GelirTuru) {
    setEditing(gelirTuru);
    setDialogOpen(true);
  }

  /** Silme öncesi bağlı gelir kaydı var mı kontrol eder. */
  async function handleDeleteClick(gelirTuru: GelirTuru) {
    setDeleteState({ phase: "checking", gelirTuru });
    try {
      const count = await countGelirlerForTuru(gelirTuru.id);
      setDeleteState(
        count > 0
          ? { phase: "blocked", gelirTuru, count }
          : { phase: "confirm", gelirTuru },
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
      await deleteMutation.mutateAsync(deleteState.gelirTuru.id);
      toast.success("Gelir türü silindi");
      setDeleteState({ phase: "idle" });
    } catch (error) {
      toast.error("Silinemedi", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  const activeGelirTuru =
    deleteState.phase !== "idle" ? deleteState.gelirTuru : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gelir Türleri"
        description="Gelirlerinizi sınıflandırmak için kullandığınız kategoriler."
      >
        <Button
          onClick={handleAdd}
          className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
        >
          <Plus className="size-4" />
          Yeni Gelir Türü
        </Button>
      </PageHeader>

      <Card className="overflow-hidden py-0">
        {isLoading ? (
          <TableSkeleton columns={COLUMNS} />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Gelir türleri yüklenirken bir hata oluştu.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Tekrar dene
            </Button>
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Henüz gelir türü yok"
            description="İlk gelir türünüzü ekleyerek gelirlerinizi sınıflandırmaya başlayın."
            action={
              <Button
                onClick={handleAdd}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Gelir Türü
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Gelir Türü</TableHead>
                <TableHead>Oluşturulma Tarihi</TableHead>
                <TableHead className="w-24 text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((gelirTuru, index) => {
                const checking =
                  deleteState.phase === "checking" &&
                  deleteState.gelirTuru.id === gelirTuru.id;
                return (
                  <TableRow key={gelirTuru.id}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {gelirTuru.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(gelirTuru.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${gelirTuru.name} düzenle`}
                          onClick={() => handleEdit(gelirTuru)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${gelirTuru.name} sil`}
                          className="text-destructive hover:text-destructive"
                          disabled={checking}
                          onClick={() => handleDeleteClick(gelirTuru)}
                        >
                          {checking ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <GelirTuruDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        gelirTuru={editing}
      />

      {/* Bağlı gelir kaydı yoksa: normal silme onayı */}
      <ConfirmDialog
        open={deleteState.phase === "confirm"}
        onOpenChange={(open) => !open && setDeleteState({ phase: "idle" })}
        title="Gelir türünü sil"
        description={`"${activeGelirTuru?.name}" silinecek. Bu işlem geri alınamaz.`}
        confirmText="Sil"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Bağlı gelir kaydı varsa: silme engellendi uyarısı */}
      <AlertDialog
        open={deleteState.phase === "blocked"}
        onOpenChange={(open) => !open && setDeleteState({ phase: "idle" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gelir türü silinemez</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${activeGelirTuru?.name}" türüne bağlı `}
              {deleteState.phase === "blocked" ? deleteState.count : 0}
              {" gelir kaydı bulunuyor. Bu türü silebilmek için önce ilgili "}
              {"gelir kayıtlarını silmeniz ya da başka bir türe taşımanız gerekir."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setDeleteState({ phase: "idle" })}
            >
              Anladım
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
