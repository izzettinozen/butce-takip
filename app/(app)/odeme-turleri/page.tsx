"use client";

import { useState } from "react";
import { CreditCard, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  countOdemeTuruUsage,
  useDeleteOdemeTuru,
  useOdemeTurleri,
  type OdemeTuruUsage,
} from "@/hooks/use-odeme-turleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import type { OdemeTuru } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { OdemeTuruDialog } from "@/components/odeme-turleri/odeme-turu-dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const COLUMNS = ["#", "Ödeme Türü", "Durum", "İşlemler"];

type DeleteState =
  | { phase: "idle" }
  | { phase: "checking"; odemeTuru: OdemeTuru }
  | { phase: "confirm"; odemeTuru: OdemeTuru }
  | { phase: "blocked"; odemeTuru: OdemeTuru; usage: OdemeTuruUsage };

/** Bağlı kayıt sayılarını okunabilir bir uyarı metnine çevirir. */
function usageMesaji(usage: OdemeTuruUsage): string {
  const parcalar: string[] = [];
  if (usage.giderler > 0) parcalar.push(`${usage.giderler} gider kaydı`);
  if (usage.tekrarlayan > 0)
    parcalar.push(`${usage.tekrarlayan} tekrarlayan gider`);
  return parcalar.join(" ve ");
}

export default function OdemeTurleriPage() {
  const { data, isLoading, isError, refetch } = useOdemeTurleri();
  const deleteMutation = useDeleteOdemeTuru();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OdemeTuru | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>({ phase: "idle" });

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(odemeTuru: OdemeTuru) {
    setEditing(odemeTuru);
    setDialogOpen(true);
  }

  /** Silme öncesi bağlı gider/tekrarlayan gider var mı kontrol eder. */
  async function handleDeleteClick(odemeTuru: OdemeTuru) {
    setDeleteState({ phase: "checking", odemeTuru });
    try {
      const usage = await countOdemeTuruUsage(odemeTuru.id);
      const toplam = usage.giderler + usage.tekrarlayan;
      setDeleteState(
        toplam > 0
          ? { phase: "blocked", odemeTuru, usage }
          : { phase: "confirm", odemeTuru },
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
      await deleteMutation.mutateAsync(deleteState.odemeTuru.id);
      toast.success("Ödeme türü silindi");
      setDeleteState({ phase: "idle" });
    } catch (error) {
      toast.error("Silinemedi", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  const activeOdemeTuru =
    deleteState.phase !== "idle" ? deleteState.odemeTuru : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ödeme Türleri"
        description="Giderlerde kullandığınız ödeme yöntemleri. Nakit ve Kredi Kartı varsayılan olarak gelir."
      >
        <Button
          onClick={handleAdd}
          className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
        >
          <Plus className="size-4" />
          Yeni Ödeme Türü
        </Button>
      </PageHeader>

      <Card className="overflow-hidden py-0">
        {isLoading ? (
          <TableSkeleton columns={COLUMNS} />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Ödeme türleri yüklenirken bir hata oluştu.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Tekrar dene
            </Button>
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Henüz ödeme türü yok"
            description="Yeni bir ödeme türü ekleyerek giderlerinizde kullanmaya başlayın."
            action={
              <Button
                onClick={handleAdd}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Ödeme Türü
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Ödeme Türü</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-24 text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((odemeTuru, index) => {
                const checking =
                  deleteState.phase === "checking" &&
                  deleteState.odemeTuru.id === odemeTuru.id;

                return (
                  <TableRow key={odemeTuru.id}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {odemeTuru.name}
                    </TableCell>
                    <TableCell>
                      {odemeTuru.is_default ? (
                        <Badge variant="secondary">Varsayılan</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {odemeTuru.is_default ? (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled
                                    aria-label={`${odemeTuru.name} düzenle`}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Varsayılan ödeme türleri düzenlenemez
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled
                                    aria-label={`${odemeTuru.name} sil`}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Varsayılan ödeme türleri silinemez
                              </TooltipContent>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`${odemeTuru.name} düzenle`}
                              onClick={() => handleEdit(odemeTuru)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`${odemeTuru.name} sil`}
                              className="text-destructive hover:text-destructive"
                              disabled={checking}
                              onClick={() => handleDeleteClick(odemeTuru)}
                            >
                              {checking ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <OdemeTuruDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        odemeTuru={editing}
      />

      {/* Bağlı kayıt yoksa: normal silme onayı */}
      <ConfirmDialog
        open={deleteState.phase === "confirm"}
        onOpenChange={(open) => !open && setDeleteState({ phase: "idle" })}
        title="Ödeme türünü sil"
        description={`"${activeOdemeTuru?.name}" silinecek. Bu işlem geri alınamaz.`}
        confirmText="Sil"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Bağlı kayıt varsa: silme engellendi uyarısı */}
      <AlertDialog
        open={deleteState.phase === "blocked"}
        onOpenChange={(open) => !open && setDeleteState({ phase: "idle" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ödeme türü silinemez</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${activeOdemeTuru?.name}" türüne bağlı `}
              {deleteState.phase === "blocked"
                ? usageMesaji(deleteState.usage)
                : ""}
              {" bulunuyor. Bu türü silebilmek için önce ilgili kayıtları "}
              {"silmeniz ya da başka bir ödeme türüne taşımanız gerekir."}
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
