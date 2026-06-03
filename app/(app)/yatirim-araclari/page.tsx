"use client";

import { useMemo, useState } from "react";
import { Check, Coins, Pencil, PencilLine, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  useDeleteYatirimArac,
  useToggleYatirimAracAktif,
  useUpdateYatirimAracFiyat,
  useYatirimAraclari,
  useYatirimAracOzetleri,
} from "@/hooks/use-yatirim-araclari";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { formatCurrency, numberToAmountInput, parseCurrency } from "@/lib/format";
import { guncelDegerHesapla } from "@/lib/yatirim";
import { cn } from "@/lib/utils";
import type { YatirimArac } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { CurrencyInput } from "@/components/currency-input";
import { YatirimAracDialog } from "@/components/yatirim-araclari/yatirim-arac-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function YatirimAraclariPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<YatirimArac | null>(null);
  const [deleting, setDeleting] = useState<YatirimArac | null>(null);
  const [showPasif, setShowPasif] = useState(false);

  const {
    data: araclar,
    isLoading,
    isError,
    refetch,
  } = useYatirimAraclari();
  const { data: ozetler } = useYatirimAracOzetleri();

  const deleteMutation = useDeleteYatirimArac();

  // Görünen araçlar: pasifler gizli (toggle açıksa dahil), ada göre TR sıralı.
  const gosterilen = useMemo(() => {
    const liste = (araclar ?? []).filter((a) => showPasif || a.aktif);
    return [...liste].sort((a, b) => a.ad.localeCompare(b.ad, "tr-TR"));
  }, [araclar, showPasif]);

  const toplamArac = araclar?.length ?? 0;

  function handleAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(arac: YatirimArac) {
    setEditing(arac);
    setDialogOpen(true);
  }

  /** Sil butonu: işlemi varsa engelle (uyarı), yoksa onay diyaloğunu aç. */
  function handleDeleteRequest(arac: YatirimArac) {
    if (ozetler?.[arac.id]?.hasIslem) {
      toast.error("Silinemez", {
        description: "Bu araca bağlı işlemler var, önce pasifleştirin.",
      });
      return;
    }
    setDeleting(arac);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Yatırım aracı silindi");
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
        title="Yatırım Araçları"
        description="Yatırımlarınızı dağıttığınız araçları tanımlayın ve güncel fiyatlarını takip edin."
      >
        <Button
          onClick={handleAdd}
          className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
        >
          <Plus className="size-4" />
          Yeni Yatırım Aracı
        </Button>
      </PageHeader>

      {/* Pasifleri göster toggle — yalnızca araç varken */}
      {toplamArac > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Label htmlFor="show-pasif" className="text-muted-foreground text-sm">
            Pasifleri göster
          </Label>
          <Switch
            id="show-pasif"
            checked={showPasif}
            onCheckedChange={setShowPasif}
          />
        </div>
      )}

      <Card className="overflow-hidden py-0">
        {isLoading ? (
          <TableSkeleton
            columns={["Ad", "Tip", "Birim", "Birim Fiyat", "Değer", "Aktif", ""]}
          />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Yatırım araçları yüklenirken bir hata oluştu.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Tekrar dene
            </Button>
          </div>
        ) : toplamArac === 0 ? (
          <EmptyState
            icon={Coins}
            title="Henüz yatırım aracı eklemediniz"
            description="Altın, döviz, kripto, hisse gibi yatırım araçlarınızı ekleyerek başlayın."
            action={
              <Button
                onClick={handleAdd}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white shadow-sm shadow-indigo-500/30"
              >
                <Plus className="size-4" />
                Yeni Yatırım Aracı
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0">Ad</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead className="text-right">Güncel Birim Fiyat</TableHead>
                  <TableHead className="text-right">
                    Güncel Toplam Değer
                  </TableHead>
                  <TableHead className="text-center">Aktif</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gosterilen.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground py-10 text-center text-sm"
                    >
                      Aktif yatırım aracı yok. Pasifleri görmek için yukarıdaki
                      anahtarı açın.
                    </TableCell>
                  </TableRow>
                ) : (
                  gosterilen.map((arac) => (
                    <AracSatiri
                      key={arac.id}
                      arac={arac}
                      netMiktar={ozetler?.[arac.id]?.netMiktar ?? 0}
                      onEdit={handleEdit}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <YatirimAracDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        arac={editing}
        hasIslem={editing ? !!ozetler?.[editing.id]?.hasIslem : false}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Yatırım aracını sil"
        description={`"${deleting?.ad}" silinecek. Bu işlem geri alınamaz.`}
        confirmText="Sil"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

interface AracSatiriProps {
  arac: YatirimArac;
  netMiktar: number;
  onEdit: (arac: YatirimArac) => void;
  onDeleteRequest: (arac: YatirimArac) => void;
}

/** Tek araç satırı — inline fiyat güncelleme ve aktif/pasif geçişini yönetir. */
function AracSatiri({
  arac,
  netMiktar,
  onEdit,
  onDeleteRequest,
}: AracSatiriProps) {
  // null → düzenleme kapalı; string → maskelenmiş fiyat girişi açık.
  const [fiyatStr, setFiyatStr] = useState<string | null>(null);
  const fiyatMutation = useUpdateYatirimAracFiyat();
  const toggleMutation = useToggleYatirimAracAktif();

  const birimBazli = arac.tip === "birim_bazli";
  const guncelDeger = guncelDegerHesapla(arac, netMiktar);
  const duzenleniyor = fiyatStr !== null;

  function fiyatBasla() {
    setFiyatStr(numberToAmountInput(arac.guncel_fiyat));
  }

  async function fiyatKaydet() {
    const val = parseCurrency(fiyatStr ?? "");
    if (val <= 0) {
      toast.error("Geçersiz fiyat", {
        description: "Sıfırdan büyük bir değer girin.",
      });
      return;
    }
    try {
      await fiyatMutation.mutateAsync({ id: arac.id, guncel_fiyat: val });
      toast.success("Fiyat güncellendi");
      setFiyatStr(null);
    } catch (error) {
      toast.error("Güncellenemedi", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  /** Aktif/pasif geçişi. Pasifleştirirken bakiyesi olan aracı engelle. */
  async function toggleAktif(yeni: boolean) {
    if (!yeni && birimBazli && netMiktar > 0) {
      toast.error("Pasifleştirilemez", {
        description: "Bu araçta hâlâ bakiye var, önce satış veya çekme yapın.",
      });
      return;
    }
    try {
      await toggleMutation.mutateAsync({ id: arac.id, aktif: yeni });
      toast.success(yeni ? "Araç aktifleştirildi" : "Araç pasifleştirildi");
    } catch (error) {
      toast.error("Güncellenemedi", {
        description: getSupabaseErrorMessage(error),
      });
    }
  }

  // Düzenlenebilir fiyat hücresi (birim bazlı → birim fiyat, tutar bazlı → değer).
  const fiyatInput = (
    <div className="flex items-center justify-end">
      <CurrencyInput
        className="h-8 w-32"
        autoFocus
        placeholder="0,00"
        value={fiyatStr ?? ""}
        onChange={setFiyatStr}
        onKeyDown={(e) => {
          if (e.key === "Enter") fiyatKaydet();
          if (e.key === "Escape") setFiyatStr(null);
        }}
      />
    </div>
  );

  return (
    <TableRow className={cn(!arac.aktif && "opacity-55")}>
      <TableCell className="bg-card sticky left-0 font-medium">
        {arac.ad}
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className="text-[10px] font-medium whitespace-nowrap"
        >
          {birimBazli ? "Birim bazlı" : "Tutar bazlı"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {birimBazli ? arac.birim : "—"}
      </TableCell>

      {/* Güncel Birim Fiyat */}
      <TableCell className="text-right tabular-nums">
        {!birimBazli ? (
          "—"
        ) : duzenleniyor ? (
          fiyatInput
        ) : (
          formatCurrency(arac.guncel_fiyat)
        )}
      </TableCell>

      {/* Güncel Toplam Değer */}
      <TableCell className="text-right font-medium tabular-nums">
        {!birimBazli && duzenleniyor
          ? fiyatInput
          : formatCurrency(guncelDeger)}
      </TableCell>

      <TableCell className="text-center">
        <Switch
          checked={arac.aktif}
          disabled={toggleMutation.isPending || duzenleniyor}
          onCheckedChange={toggleAktif}
          aria-label={`${arac.ad} aktif durumu`}
        />
      </TableCell>

      <TableCell className="text-right">
        {duzenleniyor ? (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fiyatı kaydet"
              disabled={fiyatMutation.isPending}
              className="text-emerald-600 hover:text-emerald-600"
              onClick={fiyatKaydet}
            >
              <Check className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Vazgeç"
              disabled={fiyatMutation.isPending}
              onClick={() => setFiyatStr(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${arac.ad} fiyatını güncelle`}
              onClick={fiyatBasla}
            >
              <PencilLine className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${arac.ad} düzenle`}
              onClick={() => onEdit(arac)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${arac.ad} sil`}
              className="text-destructive hover:text-destructive"
              onClick={() => onDeleteRequest(arac)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
