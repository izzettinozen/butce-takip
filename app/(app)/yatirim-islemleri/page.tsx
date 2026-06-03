"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Coins, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useYatirimAraclari } from "@/hooks/use-yatirim-araclari";
import {
  useDeleteYatirimIslem,
  useYatirimIslemleri,
  type YatirimIslemRow,
} from "@/hooks/use-yatirim-islemleri";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { formatAdet, formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { YatirimIslemTip } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { YatirimIslemDialog } from "@/components/yatirim-islemleri/yatirim-islem-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const TIP_ETIKET: Record<YatirimIslemTip, string> = {
  alis: "Alış",
  satis: "Satış",
  cekme: "Çekme",
};

/** Tip badge'i — Alış yeşil, Satış kırmızı, Çekme gri. */
function TipBadge({ tip }: { tip: YatirimIslemTip }) {
  const renk = {
    alis: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    satis: "bg-destructive/15 text-destructive",
    cekme: "bg-muted text-muted-foreground",
  }[tip];
  return (
    <Badge className={cn("border-transparent font-medium", renk)}>
      {TIP_ETIKET[tip]}
    </Badge>
  );
}

export default function YatirimIslemleriPage() {
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<YatirimIslemRow | null>(null);
  const [deleting, setDeleting] = useState<YatirimIslemRow | null>(null);

  // Filtreler
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [tipFiltre, setTipFiltre] = useState<YatirimIslemTip | "hepsi">("hepsi");
  const [aracFiltre, setAracFiltre] = useState<string>("hepsi");

  const { data: araclar } = useYatirimAraclari();
  const {
    data: islemler,
    isLoading,
    isError,
    refetch,
  } = useYatirimIslemleri();
  const deleteMutation = useDeleteYatirimIslem();

  const toplamArac = araclar?.length ?? 0;
  const toplamIslem = islemler?.length ?? 0;
  const aktifAraclar = useMemo(
    () => (araclar ?? []).filter((a) => a.aktif),
    [araclar],
  );

  // İstemci tarafı filtreleme (kümülatif, anında).
  const filtreli = useMemo(() => {
    return (islemler ?? []).filter((i) => {
      if (baslangic && i.tarih < baslangic) return false;
      if (bitis && i.tarih > bitis) return false;
      if (tipFiltre !== "hepsi" && i.tip !== tipFiltre) return false;
      if (aracFiltre !== "hepsi" && i.arac_id !== aracFiltre) return false;
      return true;
    });
  }, [islemler, baslangic, bitis, tipFiltre, aracFiltre]);

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(islem: YatirimIslemRow) {
    setEditing(islem);
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("İşlem silindi");
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
        title="Yatırım İşlemleri"
        description="Alış, satış ve çekme işlemlerinizin kümülatif listesi."
      >
        {toplamArac > 0 && (
          <Button
            onClick={handleAdd}
            className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
          >
            <Plus className="size-4" />
            Yeni Yatırım İşlemi
          </Button>
        )}
      </PageHeader>

      {/* Filtreler — yalnızca işlem varken */}
      {toplamArac > 0 && toplamIslem > 0 && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="f-baslangic" className="text-xs">
                Başlangıç
              </Label>
              <Input
                id="f-baslangic"
                type="date"
                value={baslangic}
                onChange={(e) => setBaslangic(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-bitis" className="text-xs">
                Bitiş
              </Label>
              <Input
                id="f-bitis"
                type="date"
                value={bitis}
                onChange={(e) => setBitis(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">İşlem Tipi</Label>
              <Select
                value={tipFiltre}
                onValueChange={(v) =>
                  setTipFiltre(v as YatirimIslemTip | "hepsi")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hepsi">Hepsi</SelectItem>
                  <SelectItem value="alis">Alış</SelectItem>
                  <SelectItem value="satis">Satış</SelectItem>
                  <SelectItem value="cekme">Çekme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Araç</Label>
              <Select value={aracFiltre} onValueChange={setAracFiltre}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hepsi">Hepsi</SelectItem>
                  {aktifAraclar.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.ad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden py-0">
        {isLoading ? (
          <TableSkeleton
            columns={["Tarih", "Tip", "Araç", "Miktar", "Fiyat", "Tutar", "", ""]}
          />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Yatırım işlemleri yüklenirken bir hata oluştu.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Tekrar dene
            </Button>
          </div>
        ) : toplamArac === 0 ? (
          <EmptyState
            icon={Coins}
            title="Önce bir yatırım aracı oluşturmalısınız"
            description="İşlem girebilmek için altın, döviz, kripto gibi en az bir yatırım aracı tanımlamanız gerekir."
            action={
              <Button
                onClick={() => router.push("/yatirim-araclari")}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Coins className="size-4" />
                Yatırım Aracı Ekle
              </Button>
            }
          />
        ) : toplamIslem === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Henüz işlem kaydı yok"
            description="İlk alış, satış veya çekme işleminizi ekleyerek yatırım takibinize başlayın."
            action={
              <Button
                onClick={handleAdd}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Yatırım İşlemi
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0">Tarih</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Araç</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead className="text-right">Birim Fiyat</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtreli.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground py-10 text-center text-sm"
                    >
                      Filtrelere uygun işlem bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtreli.map((islem) => {
                    const miktarVar =
                      islem.adet != null && islem.aracTip === "birim_bazli";
                    return (
                      <TableRow key={islem.id}>
                        <TableCell className="bg-card sticky left-0 font-medium whitespace-nowrap">
                          {formatDate(islem.tarih, "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <TipBadge tip={islem.tip} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {islem.tip === "cekme" ? "—" : (islem.aracAd ?? "—")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {miktarVar
                            ? `${formatAdet(islem.adet)}${
                                islem.aracBirim ? ` ${islem.aracBirim}` : ""
                              }`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {islem.birim_fiyat != null
                            ? formatCurrency(islem.birim_fiyat)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(islem.tutar)}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-40 truncate">
                          {islem.aciklama || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="İşlemi düzenle"
                              onClick={() => handleEdit(islem)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="İşlemi sil"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleting(islem)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <YatirimIslemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        islem={editing}
        araclar={araclar ?? []}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="İşlemi sil"
        description="Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
