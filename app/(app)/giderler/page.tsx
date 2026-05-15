"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Plus, Receipt, Search } from "lucide-react";
import { toast } from "sonner";

import { useDonemler } from "@/hooks/use-donemler";
import { useGiderTurleri } from "@/hooks/use-gider-turleri";
import { useGiderKalemleri } from "@/hooks/use-gider-kalemleri";
import { useOdemeTurleri } from "@/hooks/use-odeme-turleri";
import {
  useDeleteGider,
  useGiderler,
  type GiderWithRelations,
} from "@/hooks/use-giderler";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { AY_ADLARI } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { GiderDialog } from "@/components/giderler/gider-dialog";
import {
  GiderlerTable,
  type GroupingKey,
} from "@/components/giderler/giderler-table";
import { ImportWizard } from "@/components/import/import-wizard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TABLO_SUTUNLARI = [
  "#",
  "Gider Türü",
  "Gider Kalemi",
  "Tutar",
  "Ödeme Türü",
  "Açıklama",
  "Eklenme Tarihi",
  "İşlemler",
];

export default function GiderlerPage() {
  const [currentYear] = useState(() => new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().getMonth() + 1,
  );
  const [grouping, setGrouping] = useState<GroupingKey>("none");
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<GiderWithRelations | null>(null);
  const [deleting, setDeleting] = useState<GiderWithRelations | null>(null);

  const { data: donemler, isLoading: donemlerLoading } = useDonemler();
  const { data: giderTurleri, isLoading: turLoading } = useGiderTurleri();
  const { data: giderKalemleri, isLoading: kalemLoading } =
    useGiderKalemleri();
  const { data: odemeTurleri, isLoading: odemeLoading } = useOdemeTurleri();

  const onCikLoading =
    donemlerLoading || turLoading || kalemLoading || odemeLoading;

  const masterDataEksik =
    (giderTurleri?.length ?? 0) === 0 ||
    (giderKalemleri?.length ?? 0) === 0 ||
    (odemeTurleri?.length ?? 0) === 0;

  // Mevcut yıllar (azalan).
  const yillar = useMemo(() => {
    const set = new Set((donemler ?? []).map((d) => d.yil));
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [donemler, currentYear]);

  const effectiveYear = yillar.includes(selectedYear)
    ? selectedYear
    : yillar[0];

  // Seçili yıl/ay için dönem kaydı.
  const selectedDonem = useMemo(
    () =>
      (donemler ?? []).find(
        (d) => d.yil === effectiveYear && d.ay === selectedMonth,
      ),
    [donemler, effectiveYear, selectedMonth],
  );

  const { data: giderler, isLoading: giderlerLoading } = useGiderler(
    selectedDonem?.id,
  );

  const deleteMutation = useDeleteGider();

  // Açıklamaya göre arama filtresi.
  const filtrelenmisGiderler = useMemo(() => {
    const liste = giderler ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return liste;
    return liste.filter((g) => (g.aciklama ?? "").toLowerCase().includes(q));
  }, [giderler, search]);

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(gider: GiderWithRelations) {
    setEditing(gider);
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Gider silindi");
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
        title="Giderler"
        description="Dönem bazında gider kayıtlarınızı yönetin, gruplayın ve arayın."
      />

      {onCikLoading ? (
        <Card className="overflow-hidden py-0">
          <TableSkeleton columns={TABLO_SUTUNLARI} />
        </Card>
      ) : masterDataEksik ? (
        <Card>
          <EmptyState
            icon={Receipt}
            title="Önce tanımları tamamlayın"
            description="Gider ekleyebilmek için en az bir gider türü, gider kalemi ve ödeme türü tanımlamanız gerekir."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {(giderTurleri?.length ?? 0) === 0 && (
                  <Button asChild variant="outline">
                    <Link href="/gider-turleri">Gider Türleri</Link>
                  </Button>
                )}
                {(giderKalemleri?.length ?? 0) === 0 && (
                  <Button asChild variant="outline">
                    <Link href="/gider-kalemleri">Gider Kalemleri</Link>
                  </Button>
                )}
                {(odemeTurleri?.length ?? 0) === 0 && (
                  <Button asChild variant="outline">
                    <Link href="/odeme-turleri">Ödeme Türleri</Link>
                  </Button>
                )}
              </div>
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
                onValueChange={(v) => setGrouping(v as GroupingKey)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Gruplama yok</SelectItem>
                  <SelectItem value="gider_turu">Gider Türü</SelectItem>
                  <SelectItem value="gider_kalemi">Gider Kalemi</SelectItem>
                  <SelectItem value="odeme_turu">Ödeme Türü</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Açıklamada ara…"
                  className="w-52 pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="size-4" />
                Excel&apos;den İçe Aktar
              </Button>

              <Button
                onClick={handleAdd}
                disabled={!selectedDonem}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Gider Ekle
              </Button>
            </div>
          </div>

          {/* İçerik */}
          <Card className="overflow-hidden py-0">
            {!selectedDonem ? (
              <EmptyState
                icon={Receipt}
                title="Bu dönem henüz oluşturulmamış"
                description={`${AY_ADLARI[selectedMonth - 1]} ${effectiveYear} için bir dönem bulunmuyor. Dönemler sayfasından ekleyebilirsiniz.`}
                action={
                  <Button asChild variant="outline">
                    <Link href="/donemler">Dönemler&apos;e Git</Link>
                  </Button>
                }
              />
            ) : giderlerLoading ? (
              <TableSkeleton columns={TABLO_SUTUNLARI} />
            ) : (giderler?.length ?? 0) === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Bu dönemde gider yok"
                description={`${AY_ADLARI[selectedMonth - 1]} ${effectiveYear} dönemine ilk gider kaydını ekleyin.`}
                action={
                  <Button
                    onClick={handleAdd}
                    className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
                  >
                    <Plus className="size-4" />
                    Yeni Gider Ekle
                  </Button>
                }
              />
            ) : (
              <GiderlerTable
                data={filtrelenmisGiderler}
                grouping={grouping}
                onEdit={handleEdit}
                onDelete={setDeleting}
              />
            )}
          </Card>
        </>
      )}

      <GiderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        gider={editing}
        defaultDonemId={selectedDonem?.id}
      />

      <ImportWizard
        kaynak="giderler"
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Gideri sil"
        description={
          deleting
            ? `${deleting.gider_turleri?.name ?? "Gider"} · ${deleting.gider_kalemleri?.name ?? ""} kaydı silinecek. Bu işlem geri alınamaz.`
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
