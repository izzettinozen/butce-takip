"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CopyPlus, Loader2, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useDonemler } from "@/hooks/use-donemler";
import { useGiderTurleri } from "@/hooks/use-gider-turleri";
import {
  useButceHedefleri,
  useCopyHedefler,
  useDeleteHedef,
  type ButceHedefiSatir,
} from "@/hooks/use-butce-hedefleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { ayAdi, AY_ADLARI, formatCurrency } from "@/lib/format";
import { sonrakiAy } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { ButceHedefiDialog } from "@/components/butce-hedefleri/butce-hedefi-dialog";
import { DurumBar } from "@/components/butce-hedefleri/durum-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TABLO_SUTUNLARI = [
  "Gider Türü",
  "Dönem",
  "Hedef",
  "Gerçekleşen",
  "Kalan",
  "Durum",
  "İşlemler",
];

export default function ButceHedefleriPage() {
  const [currentYear] = useState(() => new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().getMonth() + 1,
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ButceHedefiSatir | null>(null);
  const [deleting, setDeleting] = useState<ButceHedefiSatir | null>(null);

  const { data: donemler, isLoading: donemlerLoading } = useDonemler();
  const { data: giderTurleri, isLoading: turLoading } = useGiderTurleri();

  const onCikLoading = donemlerLoading || turLoading;
  const masterDataEksik = (giderTurleri?.length ?? 0) === 0;

  const yillar = useMemo(() => {
    const set = new Set((donemler ?? []).map((d) => d.yil));
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [donemler, currentYear]);

  const effectiveYear = yillar.includes(selectedYear)
    ? selectedYear
    : (yillar[0] ?? currentYear);

  const selectedDonem = useMemo(
    () =>
      (donemler ?? []).find(
        (d) => d.yil === effectiveYear && d.ay === selectedMonth,
      ),
    [donemler, effectiveYear, selectedMonth],
  );

  const { data: hedefler, isLoading: hedeflerLoading } = useButceHedefleri(
    selectedDonem?.id,
  );

  const deleteMutation = useDeleteHedef();
  const copyMutation = useCopyHedefler();

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(hedef: ButceHedefiSatir) {
    setEditing(hedef);
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Bütçe hedefi silindi");
      setDeleting(null);
    } catch (error) {
      toast.error("Silinemedi", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  /** Bu ayın hedeflerini sonraki aya kopyalar. */
  async function handleCopy() {
    if (!selectedDonem) return;
    const sonraki = sonrakiAy(effectiveYear, selectedMonth);
    const hedefDonem = (donemler ?? []).find(
      (d) => d.yil === sonraki.yil && d.ay === sonraki.ay,
    );

    if (!hedefDonem) {
      toast.error("Sonraki dönem bulunamadı", {
        description: `${ayAdi(sonraki.ay)} ${sonraki.yil} dönemini önce Dönemler sayfasından ekleyin.`,
      });
      return;
    }

    try {
      const sonuc = await copyMutation.mutateAsync({
        fromDonemId: selectedDonem.id,
        toDonemId: hedefDonem.id,
      });
      toast.success(
        `${sonuc.kopyalanan} hedef kopyalandı`,
        sonuc.atlanan > 0
          ? { description: `${sonuc.atlanan} hedef zaten vardı, atlandı.` }
          : undefined,
      );
    } catch (error) {
      toast.error("Kopyalama başarısız", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  const sonrakiBilgi = sonrakiAy(effectiveYear, selectedMonth);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bütçe Hedefleri"
        description="Gider türleri için dönemsel harcama hedefleri belirleyin ve takip edin."
      />

      {onCikLoading ? (
        <Card className="overflow-hidden py-0">
          <TableSkeleton columns={TABLO_SUTUNLARI} />
        </Card>
      ) : masterDataEksik ? (
        <Card>
          <EmptyState
            icon={Target}
            title="Önce gider türü tanımlayın"
            description="Bütçe hedefi belirleyebilmek için en az bir gider türü tanımlamanız gerekir."
            action={
              <Button asChild variant="outline">
                <Link href="/gider-turleri">Gider Türleri&apos;ne Git</Link>
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
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="outline"
                      onClick={handleCopy}
                      disabled={
                        !selectedDonem ||
                        (hedefler?.length ?? 0) === 0 ||
                        copyMutation.isPending
                      }
                    >
                      {copyMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CopyPlus className="size-4" />
                      )}
                      Sonraki Aya Kopyala
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Bu ayın hedeflerini {ayAdi(sonrakiBilgi.ay)}{" "}
                  {sonrakiBilgi.yil} dönemine kopyalar
                </TooltipContent>
              </Tooltip>

              <Button
                onClick={handleAdd}
                disabled={!selectedDonem}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Hedef Ekle
              </Button>
            </div>
          </div>

          {/* İçerik */}
          <Card className="overflow-hidden py-0">
            {!selectedDonem ? (
              <EmptyState
                icon={Target}
                title="Bu dönem henüz oluşturulmamış"
                description={`${AY_ADLARI[selectedMonth - 1]} ${effectiveYear} için bir dönem bulunmuyor. Dönemler sayfasından ekleyebilirsiniz.`}
                action={
                  <Button asChild variant="outline">
                    <Link href="/donemler">Dönemler&apos;e Git</Link>
                  </Button>
                }
              />
            ) : hedeflerLoading ? (
              <TableSkeleton columns={TABLO_SUTUNLARI} />
            ) : (hedefler?.length ?? 0) === 0 ? (
              <EmptyState
                icon={Target}
                title="Bu dönemde bütçe hedefi yok"
                description={`${AY_ADLARI[selectedMonth - 1]} ${effectiveYear} dönemi için ilk bütçe hedefinizi ekleyin.`}
                action={
                  <Button
                    onClick={handleAdd}
                    className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
                  >
                    <Plus className="size-4" />
                    Yeni Hedef Ekle
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gider Türü</TableHead>
                    <TableHead>Dönem</TableHead>
                    <TableHead className="text-right">Hedef</TableHead>
                    <TableHead className="text-right">Gerçekleşen</TableHead>
                    <TableHead className="text-right">Kalan</TableHead>
                    <TableHead className="w-48">Durum</TableHead>
                    <TableHead className="w-24 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hedefler!.map((hedef) => (
                    <TableRow key={hedef.id}>
                      <TableCell className="font-medium">
                        {hedef.giderTuruAdi}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ayAdi(selectedMonth)} {effectiveYear}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(hedef.hedefTutar)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(hedef.gerceklesen)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          hedef.kalan < 0
                            ? "text-destructive"
                            : "text-success",
                        )}
                      >
                        {formatCurrency(hedef.kalan)}
                      </TableCell>
                      <TableCell>
                        <DurumBar yuzde={hedef.yuzde} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${hedef.giderTuruAdi} hedefini düzenle`}
                            onClick={() => handleEdit(hedef)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${hedef.giderTuruAdi} hedefini sil`}
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(hedef)}
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
        </>
      )}

      <ButceHedefiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        hedef={editing}
        defaultDonemId={selectedDonem?.id}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Bütçe hedefini sil"
        description={
          deleting
            ? `"${deleting.giderTuruAdi}" gider türü için tanımlı bütçe hedefi silinecek. Bu işlem geri alınamaz.`
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
