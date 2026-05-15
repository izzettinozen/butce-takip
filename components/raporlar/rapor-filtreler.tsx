"use client";

import type { Dispatch, SetStateAction } from "react";
import { FilterX } from "lucide-react";

import { useGiderTurleri } from "@/hooks/use-gider-turleri";
import { useGiderKalemleri } from "@/hooks/use-gider-kalemleri";
import { useOdemeTurleri } from "@/hooks/use-odeme-turleri";
import { useGelirTurleri } from "@/hooks/use-gelir-turleri";
import {
  aktifFiltreSayisi,
  bosFiltre,
  type RaporFiltre,
  type RaporKaynak,
} from "@/lib/rapor";
import { AY_ADLARI } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Bir diziye değer ekler/çıkarır. */
function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value)
    ? arr.filter((v) => v !== value)
    : [...arr, value];
}

interface SecenekListesiProps<T extends string | number> {
  baslik: string;
  secenekler: { value: T; label: string }[];
  secili: T[];
  onToggle: (value: T) => void;
}

/** Çoklu seçim onay kutusu listesi. */
function SecenekListesi<T extends string | number>({
  baslik,
  secenekler,
  secili,
  onToggle,
}: SecenekListesiProps<T>) {
  if (secenekler.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{baslik}</p>
      <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
        {secenekler.map((s) => {
          const id = `f-${baslik}-${s.value}`;
          return (
            <div key={s.value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={secili.includes(s.value)}
                onCheckedChange={() => onToggle(s.value)}
              />
              <Label
                htmlFor={id}
                className="text-muted-foreground cursor-pointer text-sm font-normal"
              >
                {s.label}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RaporFiltrelerProps {
  kaynak: RaporKaynak;
  filtre: RaporFiltre;
  setFiltre: Dispatch<SetStateAction<RaporFiltre>>;
  mevcutYillar: number[];
}

/** Raporlar sayfasının sol filtre paneli içeriği. */
export function RaporFiltreler({
  kaynak,
  filtre,
  setFiltre,
  mevcutYillar,
}: RaporFiltrelerProps) {
  const { data: giderTurleri = [] } = useGiderTurleri();
  const { data: giderKalemleri = [] } = useGiderKalemleri();
  const { data: odemeTurleri = [] } = useOdemeTurleri();
  const { data: gelirTurleri = [] } = useGelirTurleri();

  const aktif = aktifFiltreSayisi(filtre);

  // Gider kalemleri seçili gider türlerine göre daralır.
  const kalemSecenekleri =
    filtre.giderTuruIds.length > 0
      ? giderKalemleri.filter((k) =>
          filtre.giderTuruIds.includes(k.gider_turu_id),
        )
      : giderKalemleri;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filtreler</h2>
        {aktif > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7 px-2"
            onClick={() => setFiltre(bosFiltre())}
          >
            <FilterX className="size-3.5" />
            Temizle
          </Button>
        )}
      </div>

      <SecenekListesi
        baslik="Yıl"
        secenekler={mevcutYillar.map((y) => ({ value: y, label: String(y) }))}
        secili={filtre.yillar}
        onToggle={(v) =>
          setFiltre((f) => ({ ...f, yillar: toggle(f.yillar, v) }))
        }
      />

      <SecenekListesi
        baslik="Ay"
        secenekler={AY_ADLARI.map((ad, i) => ({ value: i + 1, label: ad }))}
        secili={filtre.aylar}
        onToggle={(v) =>
          setFiltre((f) => ({ ...f, aylar: toggle(f.aylar, v) }))
        }
      />

      {kaynak === "giderler" ? (
        <>
          <SecenekListesi
            baslik="Gider Türü"
            secenekler={giderTurleri.map((t) => ({
              value: t.id,
              label: t.name,
            }))}
            secili={filtre.giderTuruIds}
            onToggle={(v) =>
              setFiltre((f) => ({
                ...f,
                giderTuruIds: toggle(f.giderTuruIds, v),
              }))
            }
          />
          <SecenekListesi
            baslik="Gider Kalemi"
            secenekler={kalemSecenekleri.map((k) => ({
              value: k.id,
              label: k.name,
            }))}
            secili={filtre.giderKalemiIds}
            onToggle={(v) =>
              setFiltre((f) => ({
                ...f,
                giderKalemiIds: toggle(f.giderKalemiIds, v),
              }))
            }
          />
          <SecenekListesi
            baslik="Ödeme Türü"
            secenekler={odemeTurleri.map((o) => ({
              value: o.id,
              label: o.name,
            }))}
            secili={filtre.odemeTuruIds}
            onToggle={(v) =>
              setFiltre((f) => ({
                ...f,
                odemeTuruIds: toggle(f.odemeTuruIds, v),
              }))
            }
          />
        </>
      ) : (
        <SecenekListesi
          baslik="Gelir Türü"
          secenekler={gelirTurleri.map((t) => ({
            value: t.id,
            label: t.name,
          }))}
          secili={filtre.gelirTuruIds}
          onToggle={(v) =>
            setFiltre((f) => ({
              ...f,
              gelirTuruIds: toggle(f.gelirTuruIds, v),
            }))
          }
        />
      )}

      {/* Min / Max tutar */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Tutar Aralığı</p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="En az"
            value={filtre.minTutar}
            onChange={(e) =>
              setFiltre((f) => ({ ...f, minTutar: e.target.value }))
            }
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="En çok"
            value={filtre.maxTutar}
            onChange={(e) =>
              setFiltre((f) => ({ ...f, maxTutar: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Tarih aralığı (eklenme tarihi) */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Eklenme Tarihi</p>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs font-normal">
              Başlangıç
            </Label>
            <Input
              type="date"
              value={filtre.baslangic}
              onChange={(e) =>
                setFiltre((f) => ({ ...f, baslangic: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs font-normal">
              Bitiş
            </Label>
            <Input
              type="date"
              value={filtre.bitis}
              onChange={(e) =>
                setFiltre((f) => ({ ...f, bitis: e.target.value }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
