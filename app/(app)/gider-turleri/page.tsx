"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  useDeleteGiderTuru,
  useGiderTurleri,
} from "@/hooks/use-gider-turleri";
import { useGiderlerYillik } from "@/hooks/use-giderler";
import { useHedeflerYillik } from "@/hooks/use-butce-hedefleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";
import { KISA_AYLAR } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import type { GiderTuru } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { GiderTuruDialog } from "@/components/gider-turleri/gider-turu-dialog";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AyHucresi {
  ay: number;
  gerceklesen: number;
  hedef: number | null;
  asildi: boolean;
}
interface MatrisSatiri {
  tur: GiderTuru;
  aylar: AyHucresi[];
  yillikToplam: number;
}

/** Sıralama durumu. Alan: "ad" | "yillik" | "ay-1" … "ay-12". */
interface SiraDurumu {
  alan: string;
  artan: boolean;
}

/** Sütun başlığına aktif/pasif sıralama oku. */
function siralaIkonu(id: string, sort: SiraDurumu) {
  if (sort.alan !== id) {
    return <ArrowUpDown className="size-3.5 opacity-40" />;
  }
  return sort.artan ? (
    <ArrowUp className="size-3.5" />
  ) : (
    <ArrowDown className="size-3.5" />
  );
}

export default function GiderTurleriPage() {
  const [currentYear] = useState(() => new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GiderTuru | null>(null);
  const [deleting, setDeleting] = useState<GiderTuru | null>(null);
  // Sıralama: varsayılan Gider Türü A-Z.
  const [sort, setSort] = useState<SiraDurumu>({
    alan: "ad",
    artan: true,
  });

  /** Sütun başlığına tıklayınca sırala (aynı sütun toggle, farklı → azalan). */
  function sirala(alan: string) {
    setSort((s) =>
      s.alan === alan ? { alan, artan: !s.artan } : { alan, artan: false },
    );
  }

  const {
    data: giderTurleri,
    isLoading: turLoading,
    isError,
    refetch,
  } = useGiderTurleri();
  const { data: giderlerYillik, isLoading: giderLoading } =
    useGiderlerYillik(selectedYear);
  const { data: hedeflerYillik, isLoading: hedefLoading } =
    useHedeflerYillik(selectedYear);

  const deleteMutation = useDeleteGiderTuru();
  const loading = turLoading || giderLoading || hedefLoading;

  // Mevcut yıl seçenekleri (içinde bulunulan yıl ± birkaç yıl).
  const yillar = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (let i = 1; i <= 3; i++) {
      set.add(currentYear - i);
      set.add(currentYear + i);
    }
    return [...set].sort((a, b) => b - a);
  }, [currentYear]);

  // Tür-ay matrisini hesapla.
  const matris = useMemo<MatrisSatiri[]>(() => {
    const turler = giderTurleri ?? [];
    const giderler = giderlerYillik ?? [];
    const hedefler = hedeflerYillik ?? [];

    const giderMap = new Map<string, number>();
    for (const g of giderler) {
      const k = `${g.giderTuruId}-${g.ay}`;
      giderMap.set(k, (giderMap.get(k) ?? 0) + g.tutar);
    }
    const hedefMap = new Map<string, number>();
    for (const h of hedefler) {
      hedefMap.set(`${h.giderTuruId}-${h.ay}`, h.hedefTutar);
    }

    return turler.map((tur) => {
      const aylar: AyHucresi[] = KISA_AYLAR.map((_, i) => {
        const ay = i + 1;
        const k = `${tur.id}-${ay}`;
        const gerceklesen = giderMap.get(k) ?? 0;
        const hedef = hedefMap.has(k) ? hedefMap.get(k)! : null;
        return {
          ay,
          gerceklesen,
          hedef,
          asildi: hedef !== null && gerceklesen > hedef,
        };
      });
      return {
        tur,
        aylar,
        yillikToplam: aylar.reduce((s, a) => s + a.gerceklesen, 0),
      };
    });
  }, [giderTurleri, giderlerYillik, hedeflerYillik]);

  // Sıralanmış matris (Toplam satırı sıralamaya dahil değil).
  const siralanmis = useMemo(() => {
    const kopya = [...matris];
    kopya.sort((a, b) => {
      let fark = 0;
      if (sort.alan === "ad") {
        fark = a.tur.name.localeCompare(b.tur.name, "tr-TR");
      } else if (sort.alan === "yillik") {
        fark = a.yillikToplam - b.yillikToplam;
      } else if (sort.alan.startsWith("ay-")) {
        const ay = Number(sort.alan.slice(3));
        const av = a.aylar[ay - 1]?.gerceklesen ?? 0;
        const bv = b.aylar[ay - 1]?.gerceklesen ?? 0;
        fark = av - bv;
      }
      return sort.artan ? fark : -fark;
    });
    return kopya;
  }, [matris, sort]);

  // Aylık genel toplamlar (footer).
  const ayToplamlari = useMemo(() => {
    const sonuc = new Array(12).fill(0);
    for (const satir of matris) {
      satir.aylar.forEach((a, i) => {
        sonuc[i] += a.gerceklesen;
      });
    }
    return sonuc as number[];
  }, [matris]);

  const genelToplam = ayToplamlari.reduce((s, v) => s + v, 0);

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(tur: GiderTuru) {
    setEditing(tur);
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Gider türü silindi");
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
        title="Gider Türleri"
        description="Gider türlerinizin aylık dağılımı. Bütçe hedefini aşan aylar kırmızıyla işaretlenir."
      >
        <div className="flex items-center gap-2">
          <Select
            value={String(selectedYear)}
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
            Yeni Gider Türü
          </Button>
        </div>
      </PageHeader>

      <Card className="overflow-hidden py-0">
        {loading ? (
          <TableSkeleton columns={["Gider Türü", "Oca", "Şub", "…", "Toplam"]} />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Gider türleri yüklenirken bir hata oluştu.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Tekrar dene
            </Button>
          </div>
        ) : matris.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="Henüz gider türü yok"
            description="İlk gider türünüzü ekleyerek giderlerinizi sınıflandırmaya başlayın."
            action={
              <Button
                onClick={handleAdd}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Gider Türü
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0">
                    <button
                      type="button"
                      onClick={() => sirala("ad")}
                      className="hover:text-foreground inline-flex w-full items-center gap-1.5"
                    >
                      Gider Türü
                      {siralaIkonu("ad", sort)}
                    </button>
                  </TableHead>
                  {KISA_AYLAR.map((ad, i) => {
                    const id = `ay-${i + 1}`;
                    return (
                      <TableHead key={ad} className="text-right">
                        <button
                          type="button"
                          onClick={() => sirala(id)}
                          className="hover:text-foreground inline-flex w-full flex-row-reverse items-center gap-1.5"
                        >
                          {ad}
                          {siralaIkonu(id, sort)}
                        </button>
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-right">
                    <button
                      type="button"
                      onClick={() => sirala("yillik")}
                      className="hover:text-foreground inline-flex w-full flex-row-reverse items-center gap-1.5"
                    >
                      Yıllık Toplam
                      {siralaIkonu("yillik", sort)}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siralanmis.map((satir) => (
                  <TableRow key={satir.tur.id}>
                    <TableCell className="bg-card sticky left-0 font-medium">
                      <span className="inline-flex items-center gap-2">
                        {satir.tur.name}
                        {satir.tur.is_investment && (
                          <Badge className="bg-accent text-accent-foreground border-transparent text-[10px] font-medium">
                            Tasarruf
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    {satir.aylar.map((hucre) => (
                      <MatrisHucre
                        key={hucre.ay}
                        hucre={hucre}
                        turAdi={satir.tur.name}
                      />
                    ))}
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrencyShort(satir.yillikToplam)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${satir.tur.name} düzenle`}
                          onClick={() => handleEdit(satir.tur)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${satir.tur.name} sil`}
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(satir.tur)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="bg-card sticky left-0 font-semibold">
                    Toplam
                  </TableCell>
                  {ayToplamlari.map((toplam, i) => (
                    <TableCell
                      key={i}
                      className="text-right font-medium tabular-nums"
                    >
                      {toplam > 0 ? formatCurrencyShort(toplam) : "—"}
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

      <GiderTuruDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        giderTuru={editing}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Gider türünü sil"
        description={`"${deleting?.name}" silinecek. Bu gider türüne bağlı gider kalemleri de silinir. Bu işlem geri alınamaz.`}
        confirmText="Sil"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

/** Matris hücresi: değer + (hedef varsa) tooltip + aşım durumunda kırmızı. */
function MatrisHucre({
  hucre,
  turAdi,
}: {
  hucre: AyHucresi;
  turAdi: string;
}) {
  const icerik = (
    <TableCell
      className={cn(
        "text-right tabular-nums",
        hucre.asildi && "bg-destructive/15 text-destructive font-semibold",
      )}
    >
      {hucre.gerceklesen > 0
        ? formatCurrencyShort(hucre.gerceklesen)
        : "—"}
    </TableCell>
  );

  // Hedef yoksa düz hücre.
  if (hucre.hedef === null) return icerik;

  const yuzde = Math.round((hucre.gerceklesen / hucre.hedef) * 100);
  return (
    <Tooltip>
      <TooltipTrigger asChild>{icerik}</TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{turAdi}</p>
        <p>Hedef: {formatCurrency(hucre.hedef)}</p>
        <p>
          Gerçekleşen: {formatCurrency(hucre.gerceklesen)} (%{yuzde})
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
