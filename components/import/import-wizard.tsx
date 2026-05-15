"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  analizEt,
  dosyaOku,
  importEt,
  IMPORT_ALANLARI,
  otomatikEslestir,
  sablonIndir,
  type AnalizSonucu,
  type ImportKaynak,
  type ImportSonucu,
  type OkunanDosya,
} from "@/lib/excel-import";
import { getSupabaseErrorMessage } from "@/lib/errors";
import { ayAdi, formatCurrency } from "@/lib/format";
import { donemlerKey } from "@/hooks/use-donemler";
import { giderlerKey } from "@/hooks/use-giderler";
import { gelirlerKey } from "@/hooks/use-gelirler";
import { dashboardKey } from "@/hooks/use-dashboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

interface ImportWizardProps {
  kaynak: ImportKaynak;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ADIM_BASLIKLARI = ["Dosya Yükle", "Sütun Eşleme", "Önizleme", "İçe Aktar"];

export function ImportWizard({
  kaynak,
  open,
  onOpenChange,
}: ImportWizardProps) {
  const queryClient = useQueryClient();
  const dosyaInputRef = useRef<HTMLInputElement>(null);

  const [adim, setAdim] = useState(1);
  const [dosya, setDosya] = useState<OkunanDosya | null>(null);
  const [dosyaAdi, setDosyaAdi] = useState("");
  const [eslesme, setEslesme] = useState<Record<string, number>>({});
  const [analiz, setAnaliz] = useState<AnalizSonucu | null>(null);
  const [detayAcik, setDetayAcik] = useState(false);
  const [yukluyor, setYukluyor] = useState(false);
  const [importing, setImporting] = useState(false);
  const [ilerleme, setIlerleme] = useState({ yapilan: 0, toplam: 0 });
  const [sonuc, setSonuc] = useState<ImportSonucu | null>(null);

  const alanlar = IMPORT_ALANLARI[kaynak];
  const kaynakAdi = kaynak === "giderler" ? "Gider" : "Gelir";
  const kaynakAdiKucuk = kaynak === "giderler" ? "gider" : "gelir";

  function sifirla() {
    setAdim(1);
    setDosya(null);
    setDosyaAdi("");
    setEslesme({});
    setAnaliz(null);
    setDetayAcik(false);
    setYukluyor(false);
    setImporting(false);
    setIlerleme({ yapilan: 0, toplam: 0 });
    setSonuc(null);
  }

  function handleOpenChange(o: boolean) {
    if (importing) return;
    if (!o) sifirla();
    onOpenChange(o);
  }

  async function dosyaSec(file: File) {
    setYukluyor(true);
    try {
      const okunan = await dosyaOku(file);
      if (okunan.satirlar.length === 0) {
        toast.error("Dosyada veri satırı bulunamadı");
        return;
      }
      setDosya(okunan);
      setDosyaAdi(file.name);
      setEslesme(otomatikEslestir(okunan.basliklar, alanlar));
      setAdim(2);
    } catch (error) {
      toast.error("Dosya okunamadı", {
        description: getSupabaseErrorMessage(error),
      });
    } finally {
      setYukluyor(false);
    }
  }

  function handleEslemeIleri() {
    if (!dosya) return;
    setAnaliz(analizEt(kaynak, dosya.satirlar, eslesme));
    setDetayAcik(false);
    setAdim(3);
  }

  async function handleImport() {
    if (!analiz) return;
    const gecerli = analiz.satirlar.filter((s) => s.gecerli);
    setAdim(4);
    setImporting(true);
    setIlerleme({ yapilan: 0, toplam: gecerli.length });
    try {
      const r = await importEt(kaynak, gecerli, (y, t) =>
        setIlerleme({ yapilan: y, toplam: t }),
      );
      setSonuc(r);
      queryClient.invalidateQueries({
        queryKey: kaynak === "giderler" ? giderlerKey : gelirlerKey,
      });
      queryClient.invalidateQueries({ queryKey: donemlerKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });

      const detaylar: string[] = [];
      if (r.digerKalem > 0)
        detaylar.push(`${r.digerKalem} satır 'Diğer' kaleme atandı`);
      if (r.digerOdeme > 0)
        detaylar.push(`${r.digerOdeme} satır 'Diğer' ödeme türüne atandı`);
      if (r.atlanan > 0) detaylar.push(`${r.atlanan} satır atlandı`);

      toast.success(`${r.eklenen} ${kaynakAdiKucuk} içe aktarıldı`, {
        description: detaylar.length > 0 ? detaylar.join(" · ") : undefined,
      });
    } catch (error) {
      toast.error("İçe aktarma başarısız", {
        description: getSupabaseErrorMessage(error),
      });
      setAdim(3);
    } finally {
      setImporting(false);
    }
  }

  const zorunluEslendi = alanlar
    .filter((a) => a.zorunlu)
    .every((a) => (eslesme[a.key] ?? -1) >= 0);

  const hataliSatirlar =
    analiz?.satirlar.filter((s) => !s.gecerli) ?? [];
  const digerKalemSatirlar =
    analiz?.satirlar.filter((s) => s.digerKalem) ?? [];
  const digerOdemeSatirlar =
    analiz?.satirlar.filter((s) => s.digerOdeme) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Excel&apos;den İçe Aktar — {kaynakAdi}ler
          </DialogTitle>
          <DialogDescription>
            Adım {adim}/4 · {ADIM_BASLIKLARI[adim - 1]}
          </DialogDescription>
        </DialogHeader>

        {/* Adım göstergesi */}
        <div className="flex gap-1.5">
          {ADIM_BASLIKLARI.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < adim ? "bg-gradient-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        {/* ---- ADIM 1: Yükle ---- */}
        {adim === 1 && (
          <div className="space-y-4">
            <div className="bg-accent/40 flex items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <p className="text-sm font-medium">Şablon kullanın</p>
                <p className="text-muted-foreground text-sm">
                  Doğru sütun başlıklarıyla hazır bir dosya indirin.
                </p>
              </div>
              <Button variant="outline" onClick={() => sablonIndir(kaynak)}>
                <Download className="size-4" />
                Şablonu indir
              </Button>
            </div>

            <input
              ref={dosyaInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) dosyaSec(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => dosyaInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) dosyaSec(f);
              }}
              className="hover:border-primary hover:bg-accent/30 flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 transition-colors"
            >
              {yukluyor ? (
                <Loader2 className="text-primary size-8 animate-spin" />
              ) : (
                <div className="bg-gradient-primary flex size-12 items-center justify-center rounded-2xl text-white">
                  <Upload className="size-6" />
                </div>
              )}
              <div className="text-center">
                <p className="text-sm font-medium">
                  Dosyayı buraya sürükleyin ya da seçmek için tıklayın
                </p>
                <p className="text-muted-foreground text-xs">
                  .xlsx veya .csv
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ---- ADIM 2: Eşleme ---- */}
        {adim === 2 && dosya && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              <FileSpreadsheet className="mr-1 inline size-4" />
              {dosyaAdi} · {dosya.satirlar.length} satır. Her alan için
              dosyanızdaki sütunu seçin.
            </p>
            <div className="space-y-2.5">
              {alanlar.map((alan) => (
                <div
                  key={alan.key}
                  className="flex items-center justify-between gap-4"
                >
                  <Label className="flex items-center gap-1.5">
                    {alan.label}
                    {alan.zorunlu && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <Select
                    value={String(eslesme[alan.key] ?? -1)}
                    onValueChange={(v) =>
                      setEslesme((p) => ({ ...p, [alan.key]: Number(v) }))
                    }
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">— Seçilmedi —</SelectItem>
                      {dosya.basliklar.map((b, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {b || `Sütun ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              <span className="text-destructive">*</span> zorunlu alan. Gider
              Kalemi / Ödeme Türü boş bırakılırsa kayıtlar &quot;Diğer&quot;e
              atanır.
            </p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setAdim(1)}>
                <ArrowLeft className="size-4" />
                Geri
              </Button>
              <Button
                onClick={handleEslemeIleri}
                disabled={!zorunluEslendi}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white"
              >
                İleri
              </Button>
            </div>
          </div>
        )}

        {/* ---- ADIM 3: Önizleme ---- */}
        {adim === 3 && analiz && (
          <div className="space-y-4">
            {/* Özet */}
            <div className="space-y-1.5 text-sm">
              <p className="text-success font-medium">
                ✓ {analiz.gecerliSayi} satır geçerli
              </p>
              {analiz.digerKalemSayi > 0 && (
                <p className="text-warning">
                  • {analiz.digerKalemSayi} satır &quot;Diğer&quot; kaleme
                  atanacak (Gider Kalemi boş)
                </p>
              )}
              {analiz.digerOdemeSayi > 0 && (
                <p className="text-warning">
                  • {analiz.digerOdemeSayi} satır &quot;Diğer&quot; ödeme
                  türüne atanacak (Ödeme Türü boş)
                </p>
              )}
              {analiz.hataliSayi > 0 && (
                <p className="text-destructive">
                  ✗ {analiz.hataliSayi} satır geçersiz — atlanacak
                </p>
              )}
            </div>

            {/* Detay toggle */}
            {(analiz.hataliSayi > 0 ||
              analiz.digerKalemSayi > 0 ||
              analiz.digerOdemeSayi > 0) && (
              <div className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => setDetayAcik((v) => !v)}
                  className="hover:bg-muted/50 flex w-full items-center gap-1.5 px-3 py-2 text-sm font-medium"
                >
                  {detayAcik ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  Detayları {detayAcik ? "gizle" : "göster"}
                </button>
                {detayAcik && (
                  <div className="text-muted-foreground max-h-40 space-y-1.5 overflow-y-auto border-t px-3 py-2 text-sm">
                    {hataliSatirlar.map((s) => (
                      <p key={`h-${s.satirNo}`}>
                        <span className="text-destructive font-medium">
                          Satır {s.satirNo}:
                        </span>{" "}
                        {s.hatalar.join(", ")}
                      </p>
                    ))}
                    {digerKalemSatirlar.length > 0 && (
                      <p>
                        <span className="text-warning font-medium">
                          &quot;Diğer&quot; kalem:
                        </span>{" "}
                        Satır{" "}
                        {digerKalemSatirlar.map((s) => s.satirNo).join(", ")}
                      </p>
                    )}
                    {digerOdemeSatirlar.length > 0 && (
                      <p>
                        <span className="text-warning font-medium">
                          &quot;Diğer&quot; ödeme:
                        </span>{" "}
                        Satır{" "}
                        {digerOdemeSatirlar.map((s) => s.satirNo).join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Önizleme tablosu */}
            <div className="max-h-56 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutar</TableHead>
                    {kaynak === "giderler" ? (
                      <>
                        <TableHead>Gider Türü</TableHead>
                        <TableHead>Gider Kalemi</TableHead>
                        <TableHead>Ödeme Türü</TableHead>
                      </>
                    ) : (
                      <TableHead>Gelir Türü</TableHead>
                    )}
                    <TableHead>Dönem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analiz.satirlar
                    .filter((s) => s.gecerli)
                    .slice(0, 10)
                    .map((s) => (
                      <TableRow key={s.satirNo}>
                        <TableCell className="tabular-nums">
                          {formatCurrency(s.tutar)}
                        </TableCell>
                        {kaynak === "giderler" ? (
                          <>
                            <TableCell>{s.giderTuru}</TableCell>
                            <TableCell>
                              {s.digerKalem ? (
                                <span className="text-warning italic">
                                  Diğer
                                </span>
                              ) : (
                                s.giderKalemi
                              )}
                            </TableCell>
                            <TableCell>
                              {s.digerOdeme ? (
                                <span className="text-warning italic">
                                  Diğer
                                </span>
                              ) : (
                                s.odemeTuru
                              )}
                            </TableCell>
                          </>
                        ) : (
                          <TableCell>{s.gelirTuru}</TableCell>
                        )}
                        <TableCell>
                          {ayAdi(s.ay)} {s.yil}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setAdim(2)}>
                <ArrowLeft className="size-4" />
                Geri
              </Button>
              <Button
                onClick={handleImport}
                disabled={analiz.gecerliSayi === 0}
                className="bg-gradient-primary hover:bg-gradient-primary-hover text-white"
              >
                {analiz.gecerliSayi} Satırı İçe Aktar
              </Button>
            </div>
          </div>
        )}

        {/* ---- ADIM 4: İçe aktarma / sonuç ---- */}
        {adim === 4 && (
          <div className="space-y-5 py-4">
            {importing ? (
              <div className="space-y-3 text-center">
                <Loader2 className="text-primary mx-auto size-8 animate-spin" />
                <p className="text-sm font-medium">İçe aktarılıyor…</p>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-gradient-primary h-full rounded-full transition-all"
                    style={{
                      width: `${
                        ilerleme.toplam > 0
                          ? (ilerleme.yapilan / ilerleme.toplam) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {ilerleme.yapilan} / {ilerleme.toplam}
                </p>
              </div>
            ) : sonuc ? (
              <div className="space-y-3 text-center">
                <CheckCircle2 className="text-success mx-auto size-12" />
                <p className="text-lg font-semibold">
                  İçe aktarma tamamlandı
                </p>
                <div className="text-muted-foreground space-y-0.5 text-sm">
                  <p>
                    <span className="text-foreground font-medium">
                      {sonuc.eklenen} {kaynakAdiKucuk}
                    </span>{" "}
                    başarıyla içe aktarıldı.
                  </p>
                  {sonuc.digerKalem > 0 && (
                    <p>
                      {sonuc.digerKalem} satır &quot;Diğer&quot; kaleme
                      atandı.
                    </p>
                  )}
                  {sonuc.digerOdeme > 0 && (
                    <p>
                      {sonuc.digerOdeme} satır &quot;Diğer&quot; ödeme türüne
                      atandı.
                    </p>
                  )}
                  {sonuc.atlanan > 0 && (
                    <p>{sonuc.atlanan} satır atlandı.</p>
                  )}
                </div>
                <Button
                  onClick={() => handleOpenChange(false)}
                  className="bg-gradient-primary hover:bg-gradient-primary-hover text-white"
                >
                  Kapat
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
