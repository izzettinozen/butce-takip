"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FlaskConical, Info, Loader2, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  useDeleteTekrarlayanGider,
  useTekrarlayanGiderler,
  useToggleTekrarlayanGider,
  type TekrarlayanGiderWithRelations,
} from "@/hooks/use-tekrarlayan-giderler";
import { useRecurringExpensesCheck } from "@/hooks/use-recurring-expenses-check";
import { useGiderTurleri } from "@/hooks/use-gider-turleri";
import { useGiderKalemleri } from "@/hooks/use-gider-kalemleri";
import { useOdemeTurleri } from "@/hooks/use-odeme-turleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { ayAdi, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { TekrarlayanGiderDialog } from "@/components/tekrarlayan-giderler/tekrarlayan-gider-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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

const TABLO_SUTUNLARI = [
  "Tutar",
  "Gider Türü",
  "Gider Kalemi",
  "Ödeme Türü",
  "Açıklama",
  "Ayın Günü",
  "Son Oluşturulan Dönem",
  "Aktif",
  "İşlemler",
];

type FiltreModu = "tumu" | "aktif" | "pasif";

export default function TekrarlayanGiderlerPage() {
  const [filtre, setFiltre] = useState<FiltreModu>("tumu");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TekrarlayanGiderWithRelations | null>(
    null,
  );
  const [deleting, setDeleting] =
    useState<TekrarlayanGiderWithRelations | null>(null);
  const [toggleId, setToggleId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useTekrarlayanGiderler();
  const { data: giderTurleri, isLoading: turLoading } = useGiderTurleri();
  const { data: giderKalemleri, isLoading: kalemLoading } =
    useGiderKalemleri();
  const { data: odemeTurleri, isLoading: odemeLoading } = useOdemeTurleri();

  const deleteMutation = useDeleteTekrarlayanGider();
  const toggleMutation = useToggleTekrarlayanGider();
  const { runCheck, isRunning } = useRecurringExpensesCheck();

  const onCikLoading =
    isLoading || turLoading || kalemLoading || odemeLoading;
  const masterDataEksik =
    (giderTurleri?.length ?? 0) === 0 ||
    (giderKalemleri?.length ?? 0) === 0 ||
    (odemeTurleri?.length ?? 0) === 0;

  const filtrelenmis = useMemo(() => {
    const liste = data ?? [];
    if (filtre === "aktif") return liste.filter((t) => t.aktif);
    if (filtre === "pasif") return liste.filter((t) => !t.aktif);
    return liste;
  }, [data, filtre]);

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(tg: TekrarlayanGiderWithRelations) {
    setEditing(tg);
    setDialogOpen(true);
  }

  async function handleToggle(tg: TekrarlayanGiderWithRelations) {
    setToggleId(tg.id);
    try {
      await toggleMutation.mutateAsync({ id: tg.id, aktif: !tg.aktif });
      toast.success(
        tg.aktif ? "Tekrarlayan gider pasife alındı" : "Tekrarlayan gider aktifleştirildi",
      );
    } catch (error) {
      toast.error("Durum değiştirilemedi", {
        description: getSupabaseErrorMessage(error),
      });
    } finally {
      setToggleId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Tekrarlayan gider silindi");
      setDeleting(null);
    } catch (error) {
      toast.error("Silinemedi", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  async function handleTestTrigger() {
    const sayi = await runCheck(true);
    if (sayi === 0) {
      toast.info("Eklenecek tekrarlayan gider yok", {
        description:
          "Vakti gelmiş ve bu ay henüz oluşturulmamış aktif tanım bulunamadı.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tekrarlayan Giderler"
        description="Her ay otomatik olarak eklenecek düzenli giderlerinizi tanımlayın."
      />

      {onCikLoading ? (
        <Card className="overflow-hidden py-0">
          <TableSkeleton columns={TABLO_SUTUNLARI} />
        </Card>
      ) : masterDataEksik ? (
        <Card>
          <EmptyState
            icon={Repeat}
            title="Önce tanımları tamamlayın"
            description="Tekrarlayan gider tanımlamak için en az bir gider türü, gider kalemi ve ödeme türü gerekir."
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
          {/* Bilgi kutusu */}
          <div className="bg-accent/50 flex items-start gap-3 rounded-xl border p-4">
            <Info className="text-primary mt-0.5 size-5 shrink-0" />
            <p className="text-muted-foreground text-sm">
              Aktif tekrarlayan giderler, her ayın belirtilen gününde otomatik
              olarak Giderler tablosuna eklenir. Kontrol, uygulamaya her
              girişinizde arka planda çalışır.
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select
              value={filtre}
              onValueChange={(v) => setFiltre(v as FiltreModu)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tumu">Tümü</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="pasif">Pasif</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTestTrigger}
                disabled={isRunning}
                className="text-muted-foreground"
              >
                {isRunning ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FlaskConical className="size-4" />
                )}
                Şimdi tetikle (test)
              </Button>
              <Button
                onClick={handleAdd}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Tekrarlayan Gider Ekle
              </Button>
            </div>
          </div>

          {/* İçerik */}
          <Card className="overflow-hidden py-0">
            {isError ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <p className="text-muted-foreground text-sm">
                  Tekrarlayan giderler yüklenirken bir hata oluştu.
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Tekrar dene
                </Button>
              </div>
            ) : (data?.length ?? 0) === 0 ? (
              <EmptyState
                icon={Repeat}
                title="Henüz tekrarlayan gider tanımlamadınız"
                description="Kira, abonelik gibi her ay tekrar eden giderlerinizi tanımlayın; otomatik eklensin."
                action={
                  <Button
                    onClick={handleAdd}
                    className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
                  >
                    <Plus className="size-4" />
                    Yeni Tekrarlayan Gider Ekle
                  </Button>
                }
              />
            ) : filtrelenmis.length === 0 ? (
              <EmptyState
                icon={Repeat}
                title="Bu filtreye uygun kayıt yok"
                description="Farklı bir filtre seçin."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead>Gider Türü</TableHead>
                      <TableHead>Gider Kalemi</TableHead>
                      <TableHead>Ödeme Türü</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead className="text-center">Ayın Günü</TableHead>
                      <TableHead>Son Oluşturulan Dönem</TableHead>
                      <TableHead className="text-center">Aktif</TableHead>
                      <TableHead className="w-24 text-right">
                        İşlemler
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrelenmis.map((tg) => (
                      <TableRow
                        key={tg.id}
                        className={cn(!tg.aktif && "opacity-55")}
                      >
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(tg.tutar)}
                        </TableCell>
                        <TableCell>{tg.gider_turleri?.name ?? "—"}</TableCell>
                        <TableCell>
                          {tg.gider_kalemleri?.name ?? "—"}
                        </TableCell>
                        <TableCell>{tg.odeme_turleri?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[14rem] truncate">
                          {tg.aciklama || "—"}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {tg.ayin_gunu}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tg.donemler
                            ? `${ayAdi(tg.donemler.ay)} ${tg.donemler.yil}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={tg.aktif}
                            disabled={toggleId === tg.id}
                            onCheckedChange={() => handleToggle(tg)}
                            aria-label={
                              tg.aktif ? "Pasife al" : "Aktifleştir"
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Düzenle"
                              onClick={() => handleEdit(tg)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Sil"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleting(tg)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}

      <TekrarlayanGiderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tekrarlayanGider={editing}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Tekrarlayan gideri sil"
        description={
          deleting
            ? `${deleting.gider_turleri?.name ?? "Tekrarlayan gider"} · ${deleting.gider_kalemleri?.name ?? ""} tanımı silinecek. Daha önce oluşturulmuş giderler etkilenmez. Bu işlem geri alınamaz.`
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
