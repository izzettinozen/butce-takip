"use client";

import { useState } from "react";
import { ListTree, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  useDeleteGiderKalemi,
  useGiderKalemleri,
  type GiderKalemiWithTuru,
} from "@/hooks/use-gider-kalemleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { GiderKalemiDialog } from "@/components/gider-kalemleri/gider-kalemi-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLUMNS = [
  "#",
  "Gider Kalemi",
  "Bağlı Gider Türü",
  "Oluşturulma Tarihi",
  "İşlemler",
];

export default function GiderKalemleriPage() {
  const { data, isLoading, isError, refetch } = useGiderKalemleri();
  const deleteMutation = useDeleteGiderKalemi();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GiderKalemiWithTuru | null>(null);
  const [deleting, setDeleting] = useState<GiderKalemiWithTuru | null>(null);

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(giderKalemi: GiderKalemiWithTuru) {
    setEditing(giderKalemi);
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Gider kalemi silindi");
      setDeleting(null);
    } catch (error) {
      toast.error("Silinemedi", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gider Kalemleri"
        description="Gider türlerine bağlı alt kalemler — giderleri ayrıntılı sınıflandırır."
      >
        <Button
          onClick={handleAdd}
          className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
        >
          <Plus className="size-4" />
          Yeni Gider Kalemi
        </Button>
      </PageHeader>

      <Card className="overflow-hidden py-0">
        {isLoading ? (
          <TableSkeleton columns={COLUMNS} />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Gider kalemleri yüklenirken bir hata oluştu.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Tekrar dene
            </Button>
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={ListTree}
            title="Henüz gider kalemi yok"
            description="İlk gider kaleminizi ekleyerek giderlerinizi ayrıntılı sınıflandırmaya başlayın."
            action={
              <Button
                onClick={handleAdd}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Gider Kalemi
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Gider Kalemi</TableHead>
                <TableHead>Bağlı Gider Türü</TableHead>
                <TableHead>Oluşturulma Tarihi</TableHead>
                <TableHead className="w-24 text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((giderKalemi, index) => (
                <TableRow key={giderKalemi.id}>
                  <TableCell className="text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {giderKalemi.name}
                  </TableCell>
                  <TableCell>
                    {giderKalemi.gider_turleri ? (
                      <Badge variant="secondary">
                        {giderKalemi.gider_turleri.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(giderKalemi.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${giderKalemi.name} düzenle`}
                        onClick={() => handleEdit(giderKalemi)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${giderKalemi.name} sil`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(giderKalemi)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <GiderKalemiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        giderKalemi={editing}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Gider kalemini sil"
        description={`"${deleting?.name}" silinecek. Bu işlem geri alınamaz.`}
        confirmText="Sil"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
