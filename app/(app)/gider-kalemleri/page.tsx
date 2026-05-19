"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ListTree,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  useDeleteGiderKalemi,
  useGiderKalemleri,
  type GiderKalemiWithTuru,
} from "@/hooks/use-gider-kalemleri";
import { useGiderTurleri } from "@/hooks/use-gider-turleri";
import { useGiderlerYillik } from "@/hooks/use-giderler";
import { useDonemler } from "@/hooks/use-donemler";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { formatCurrencyShort } from "@/lib/format";
import { KISA_AYLAR } from "@/lib/dashboard";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { GiderKalemiDialog } from "@/components/gider-kalemleri/gider-kalemi-dialog";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface KalemSatiri {
  kalem: GiderKalemiWithTuru;
  aylar: number[]; // 12 değer
  yillikToplam: number;
}
interface TurGrubu {
  turId: string;
  turAdi: string;
  kalemler: KalemSatiri[];
  aylar: number[]; // grup alt toplamı (12)
  yillikToplam: number;
}

const TABLO_ISKELET = ["Kalem", "Tür", "Oca", "Şub", "…", "Toplam"];

export default function GiderKalemleriPage() {
  const [currentYear] = useState(() => new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [kapali, setKapali] = useState<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GiderKalemiWithTuru | null>(null);
  const [deleting, setDeleting] = useState<GiderKalemiWithTuru | null>(null);

  const { data: donemler } = useDonemler();
  const {
    data: giderTurleri,
    isLoading: turLoading,
    isError: turError,
    refetch,
  } = useGiderTurleri();
  const { data: giderKalemleri, isLoading: kalemLoading } =
    useGiderKalemleri();

  const yillar = useMemo(() => {
    const set = new Set<number>([currentYear]);
    (donemler ?? []).forEach((d) => set.add(d.yil));
    return [...set].sort((a, b) => b - a);
  }, [donemler, currentYear]);

  const effectiveYear = yillar.includes(selectedYear)
    ? selectedYear
    : (yillar[0] ?? currentYear);

  const { data: giderlerYillik, isLoading: giderLoading } =
    useGiderlerYillik(effectiveYear);

  const deleteMutation = useDeleteGiderKalemi();
  const loading = turLoading || kalemLoading || giderLoading;

  /* ---- Tür → kalem matrisini hesapla ---- */
  const matris = useMemo<TurGrubu[]>(() => {
    const turler = giderTurleri ?? []; // ada göre sıralı
    const kalemler = giderKalemleri ?? [];
    const giderler = giderlerYillik ?? [];

    // kalemId-ay -> toplam
    const giderMap = new Map<string, number>();
    for (const g of giderler) {
      const k = `${g.giderKalemiId}-${g.ay}`;
      giderMap.set(k, (giderMap.get(k) ?? 0) + g.tutar);
    }

    const gruplar: TurGrubu[] = [];
    for (const tur of turler) {
      const turKalemleri = kalemler.filter(
        (k) => k.gider_turu_id === tur.id,
      );
      if (turKalemleri.length === 0) continue; // boş tür gösterilmez

      const kalemSatirlari: KalemSatiri[] = turKalemleri.map((kalem) => {
        const aylar = Array.from(
          { length: 12 },
          (_, i) => giderMap.get(`${kalem.id}-${i + 1}`) ?? 0,
        );
        return {
          kalem,
          aylar,
          yillikToplam: aylar.reduce((s, v) => s + v, 0),
        };
      });

      const grupAylar = Array.from({ length: 12 }, (_, i) =>
        kalemSatirlari.reduce((s, ks) => s + ks.aylar[i], 0),
      );

      gruplar.push({
        turId: tur.id,
        turAdi: tur.name,
        kalemler: kalemSatirlari,
        aylar: grupAylar,
        yillikToplam: grupAylar.reduce((s, v) => s + v, 0),
      });
    }
    return gruplar;
  }, [giderTurleri, giderKalemleri, giderlerYillik]);

  /* ---- Aylık genel toplamlar ---- */
  const ayToplamlari = useMemo(() => {
    const sonuc = new Array(12).fill(0);
    for (const grup of matris) {
      grup.aylar.forEach((v, i) => {
        sonuc[i] += v;
      });
    }
    return sonuc as number[];
  }, [matris]);

  const genelToplam = ayToplamlari.reduce((s, v) => s + v, 0);

  function toggleGrup(turId: string) {
    setKapali((prev) => {
      const yeni = new Set(prev);
      if (yeni.has(turId)) yeni.delete(turId);
      else yeni.add(turId);
      return yeni;
    });
  }

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(kalem: GiderKalemiWithTuru) {
    setEditing(kalem);
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

  /** Bir hücreyi biçimlendirir (0 ise em-dash). */
  function hucre(deger: number) {
    return deger > 0 ? formatCurrencyShort(deger) : "—";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gider Kalemleri"
        description="Gider kalemlerinizin aylık dağılımı, türlere göre gruplandırılmış."
      >
        <div className="flex items-center gap-2">
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
          <Button
            onClick={handleAdd}
            className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
          >
            <Plus className="size-4" />
            Yeni Kalem
          </Button>
        </div>
      </PageHeader>

      <Card className="overflow-hidden py-0">
        {loading ? (
          <TableSkeleton columns={TABLO_ISKELET} />
        ) : turError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Gider kalemleri yüklenirken bir hata oluştu.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Tekrar dene
            </Button>
          </div>
        ) : matris.length === 0 ? (
          <EmptyState
            icon={ListTree}
            title="Henüz gider kalemi yok"
            description="İlk gider kaleminizi ekleyerek aylık dağılımı görmeye başlayın."
            action={
              <Button
                onClick={handleAdd}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Kalem
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0">
                    Kalem
                  </TableHead>
                  <TableHead>Tür</TableHead>
                  {KISA_AYLAR.map((ad) => (
                    <TableHead key={ad} className="text-right">
                      {ad}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Yıllık Toplam</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matris.map((grup) => {
                  const acik = !kapali.has(grup.turId);
                  return (
                    <GrupFragment key={grup.turId}>
                      {/* Tür başlığı + alt toplam satırı */}
                      <TableRow
                        className="bg-muted hover:bg-muted cursor-pointer"
                        onClick={() => toggleGrup(grup.turId)}
                      >
                        <TableCell className="bg-muted sticky left-0 font-semibold">
                          <div className="flex items-center gap-1.5">
                            {acik ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                            {grup.turAdi}
                          </div>
                        </TableCell>
                        <TableCell />
                        {grup.aylar.map((v, i) => (
                          <TableCell
                            key={i}
                            className="text-right font-medium tabular-nums"
                          >
                            {hucre(v)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrencyShort(grup.yillikToplam)}
                        </TableCell>
                        <TableCell />
                      </TableRow>

                      {/* Kalem satırları */}
                      {acik &&
                        grup.kalemler.map((satir) => (
                          <TableRow key={satir.kalem.id}>
                            <TableCell className="bg-card sticky left-0 pl-9 font-medium">
                              {satir.kalem.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {grup.turAdi}
                            </TableCell>
                            {satir.aylar.map((v, i) => (
                              <TableCell
                                key={i}
                                className="text-right tabular-nums"
                              >
                                {hucre(v)}
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatCurrencyShort(satir.yillikToplam)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`${satir.kalem.name} düzenle`}
                                  onClick={() => handleEdit(satir.kalem)}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`${satir.kalem.name} sil`}
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleting(satir.kalem)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </GrupFragment>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="bg-card sticky left-0 font-semibold">
                    Toplam
                  </TableCell>
                  <TableCell />
                  {ayToplamlari.map((toplam, i) => (
                    <TableCell
                      key={i}
                      className="text-right font-medium tabular-nums"
                    >
                      {hucre(toplam)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold tabular-nums">
                    {formatCurrencyShort(genelToplam)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
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

/** Grup satırlarını saran fragment. */
function GrupFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
