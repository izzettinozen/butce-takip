"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { useDonemler } from "@/hooks/use-donemler";
import { useGelirTurleri } from "@/hooks/use-gelir-turleri";
import {
  useDeleteGelir,
  useGelirler,
  type GelirWithRelations,
} from "@/hooks/use-gelirler";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { AY_ADLARI, ayAdi } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { GelirDialog } from "@/components/gelirler/gelir-dialog";
import {
  GelirlerTable,
  type GelirGroupingKey,
} from "@/components/gelirler/gelirler-table";
import { ImportWizard } from "@/components/import/import-wizard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TABLO_SUTUNLARI = [
  "#",
  "Tutar",
  "Gelir Türü",
  "Dönem",
  "Eklenme Tarihi",
  "İşlemler",
];

export default function GelirlerPage() {
  const [currentYear] = useState(() => new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().getMonth() + 1,
  );
  const [grouping, setGrouping] = useState<GelirGroupingKey>("none");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<GelirWithRelations | null>(null);
  const [deleting, setDeleting] = useState<GelirWithRelations | null>(null);

  const { data: donemler, isLoading: donemlerLoading } = useDonemler();
  const { data: gelirTurleri, isLoading: turLoading } = useGelirTurleri();

  const onCikLoading = donemlerLoading || turLoading;
  const masterDataEksik = (gelirTurleri?.length ?? 0) === 0;

  const ayGruplama = grouping === "ay";

  // Mevcut yıllar (azalan).
  const yillar = useMemo(() => {
    const set = new Set((donemler ?? []).map((d) => d.yil));
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [donemler, currentYear]);

  const effectiveYear = yillar.includes(selectedYear)
    ? selectedYear
    : yillar[0];

  // Seçili yıl/ay için dönem.
  const selectedDonem = useMemo(
    () =>
      (donemler ?? []).find(
        (d) => d.yil === effectiveYear && d.ay === selectedMonth,
      ),
    [donemler, effectiveYear, selectedMonth],
  );

  // Seçili yılın tüm dönemleri (ay gruplaması için).
  const yilDonemleri = useMemo(
    () => (donemler ?? []).filter((d) => d.yil === effectiveYear),
    [donemler, effectiveYear],
  );

  // Aktif dönem id'leri: ay gruplamasında tüm yıl, aksi halde tek dönem.
  const aktifDonemIds = useMemo(
    () =>
      ayGruplama
        ? yilDonemleri.map((d) => d.id)
        : selectedDonem
          ? [selectedDonem.id]
          : [],
    [ayGruplama, yilDonemleri, selectedDonem],
  );

  const { data: gelirler, isLoading: gelirlerLoading } =
    useGelirler(aktifDonemIds);

  const deleteMutation = useDeleteGelir();

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(gelir: GelirWithRelations) {
    setEditing(gelir);
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Gelir silindi");
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
        title="Gelirler"
        description="Dönem bazında gelir kayıtlarınızı yönetin ve gruplayın."
      />

      {onCikLoading ? (
        <Card className="overflow-hidden py-0">
          <TableSkeleton columns={TABLO_SUTUNLARI} />
        </Card>
      ) : masterDataEksik ? (
        <Card>
          <EmptyState
            icon={TrendingUp}
            title="Önce gelir türü tanımlayın"
            description="Gelir ekleyebilmek için en az bir gelir türü tanımlamanız gerekir."
            action={
              <Button asChild variant="outline">
                <Link href="/gelir-turleri">Gelir Türleri&apos;ne Git</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(effectiveYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-28">
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

              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(Number(v))}
                disabled={ayGruplama}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AY_ADLARI.map((adi, index) => (
                    <SelectItem key={adi} value={String(index + 1)}>
                      {adi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={grouping}
                onValueChange={(v) => setGrouping(v as GelirGroupingKey)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Gruplama yok</SelectItem>
                  <SelectItem value="gelir_turu">Gelir Türü</SelectItem>
                  <SelectItem value="ay">Ay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="size-4" />
                Excel&apos;den İçe Aktar
              </Button>

              <Button
                onClick={handleAdd}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Gelir Ekle
              </Button>
            </div>
          </div>

          {/* İçerik */}
          <Card className="overflow-hidden py-0">
            {aktifDonemIds.length === 0 ? (
              ayGruplama ? (
                <EmptyState
                  icon={TrendingUp}
                  title={`${effectiveYear} yılında dönem yok`}
                  description="Bu yıl için Dönemler sayfasından dönem ekleyebilirsiniz."
                  action={
                    <Button asChild variant="outline">
                      <Link href="/donemler">Dönemler&apos;e Git</Link>
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="Bu dönem henüz oluşturulmamış"
                  description={`${AY_ADLARI[selectedMonth - 1]} ${effectiveYear} için bir dönem bulunmuyor. Dönemler sayfasından ekleyebilirsiniz.`}
                  action={
                    <Button asChild variant="outline">
                      <Link href="/donemler">Dönemler&apos;e Git</Link>
                    </Button>
                  }
                />
              )
            ) : gelirlerLoading ? (
              <TableSkeleton columns={TABLO_SUTUNLARI} />
            ) : (gelirler?.length ?? 0) === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title={ayGruplama ? "Bu yılda gelir yok" : "Bu dönemde gelir yok"}
                description={
                  ayGruplama
                    ? `${effectiveYear} yılına ilk gelir kaydını ekleyin.`
                    : `${AY_ADLARI[selectedMonth - 1]} ${effectiveYear} dönemine ilk gelir kaydını ekleyin.`
                }
                action={
                  <Button
                    onClick={handleAdd}
                    className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
                  >
                    <Plus className="size-4" />
                    Yeni Gelir Ekle
                  </Button>
                }
              />
            ) : (
              <GelirlerTable
                data={gelirler ?? []}
                grouping={grouping}
                onEdit={handleEdit}
                onDelete={setDeleting}
              />
            )}
          </Card>
        </>
      )}

      <GelirDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        gelir={editing}
        defaultDonemId={selectedDonem?.id}
      />

      <ImportWizard
        kaynak="gelirler"
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Geliri sil"
        description={
          deleting
            ? `${deleting.gelir_turleri?.name ?? "Gelir"}${
                deleting.donemler
                  ? ` · ${ayAdi(deleting.donemler.ay)} ${deleting.donemler.yil}`
                  : ""
              } kaydı silinecek. Bu işlem geri alınamaz.`
            : ""
        }
        confirmText="Sil"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
