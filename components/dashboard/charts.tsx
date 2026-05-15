"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  GRAFIK_PALETI,
  RENK_GELIR,
  RENK_GIDER,
} from "@/lib/dashboard";
import { formatCurrency } from "@/lib/format";

/* ---------------------------------------------------------------- *
 * Veri tipleri
 * ---------------------------------------------------------------- */

export interface TrendNoktasi {
  ay: string;
  gelir: number;
  gider: number;
}
export interface DagilimNoktasi {
  name: string;
  value: number;
}
export interface ButceNoktasi {
  turu: string;
  hedef: number;
  gercek: number;
}
export interface KalemNoktasi {
  kalem: string;
  tutar: number;
}
export interface BirikimNoktasi {
  ay: string;
  birikim: number;
}

/* ---------------------------------------------------------------- *
 * Ortak yardımcılar
 * ---------------------------------------------------------------- */

const kompaktFormat = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const eksenTick = { fill: "var(--muted-foreground)", fontSize: 12 };

interface TooltipGirdi {
  name?: string;
  value?: number;
  color?: string;
  payload?: Record<string, unknown>;
}
interface OrtakTooltipProps {
  active?: boolean;
  payload?: TooltipGirdi[];
  label?: string | number;
}

/** Para değerlerini gösteren ortak tooltip kutusu. */
function ParaTooltip({ active, payload, label }: OrtakTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover rounded-lg border px-3 py-2 text-sm shadow-md">
      {label !== undefined && label !== "" && (
        <p className="mb-1 font-medium">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-medium">
            {formatCurrency(p.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
}

/** Pasta dilimleri için yüzdeli tooltip. */
function PastaTooltip({
  active,
  payload,
  toplam,
}: OrtakTooltipProps & { toplam: number }) {
  if (!active || !payload?.length) return null;
  const girdi = payload[0];
  const deger = girdi.value ?? 0;
  const yuzde = toplam > 0 ? (deger / toplam) * 100 : 0;
  return (
    <div className="bg-popover rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{girdi.name}</p>
      <p className="text-muted-foreground">
        {formatCurrency(deger)} ·{" "}
        {`%${yuzde.toFixed(1).replace(".", ",")}`}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * 1. Aylık Gelir-Gider Trendi (çizgi)
 * ---------------------------------------------------------------- */

export function GelirGiderTrendChart({ data }: { data: TrendNoktasi[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="ay"
            tick={eksenTick}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={eksenTick}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => kompaktFormat.format(v)}
          />
          <Tooltip content={<ParaTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="gelir"
            name="Gelir"
            stroke={RENK_GELIR}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="gider"
            name="Gider"
            stroke={RENK_GIDER}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * 2. Gider Türü Dağılımı (donut)
 * ---------------------------------------------------------------- */

export function GiderTuruDonutChart({ data }: { data: DagilimNoktasi[] }) {
  const toplam = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={56}
            outerRadius={88}
            paddingAngle={2}
            stroke="var(--card)"
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={GRAFIK_PALETI[i % GRAFIK_PALETI.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<PastaTooltip toplam={toplam} />} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * 3. Nakit vs Kredi Kartı (pasta)
 * ---------------------------------------------------------------- */

export function OdemeTuruPieChart({ data }: { data: DagilimNoktasi[] }) {
  const toplam = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={88}
            paddingAngle={2}
            stroke="var(--card)"
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={GRAFIK_PALETI[i % GRAFIK_PALETI.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<PastaTooltip toplam={toplam} />} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * 4. Bütçe Hedefi vs Gerçekleşen (yatay bar)
 * ---------------------------------------------------------------- */

/** Gerçekleşen/hedef oranına göre bar rengi. */
function butceRenk(hedef: number, gercek: number): string {
  if (hedef <= 0) return "#6366f1";
  const oran = (gercek / hedef) * 100;
  if (oran > 100) return "#ef4444";
  if (oran >= 70) return "#f59e0b";
  return "#10b981";
}

/** Bütçe grafiği için hedef/gerçekleşen/yüzde gösteren tooltip. */
function ButceTooltip({ active, payload, label }: OrtakTooltipProps) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload ?? {};
  const hedef = Number(datum.hedef ?? 0);
  const gercek = Number(datum.gercek ?? 0);
  const yuzde = hedef > 0 ? Math.round((gercek / hedef) * 100) : 0;
  return (
    <div className="bg-popover rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <p className="text-muted-foreground">
        Hedef: <span className="text-foreground">{formatCurrency(hedef)}</span>
      </p>
      <p className="text-muted-foreground">
        Gerçekleşen:{" "}
        <span className="text-foreground">{formatCurrency(gercek)}</span>
      </p>
      <p className="text-muted-foreground">
        Kullanım:{" "}
        <span className="text-foreground font-medium">
          %{yuzde}
        </span>
      </p>
    </div>
  );
}

export function ButceBarChart({ data }: { data: ButceNoktasi[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="var(--border)"
          />
          <XAxis
            type="number"
            tick={eksenTick}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => kompaktFormat.format(v)}
          />
          <YAxis
            type="category"
            dataKey="turu"
            tick={eksenTick}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip content={<ButceTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Legend />
          <Bar
            dataKey="hedef"
            name="Hedef"
            fill="#94a3b8"
            radius={[0, 4, 4, 0]}
          />
          <Bar dataKey="gercek" name="Gerçekleşen" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={butceRenk(d.hedef, d.gercek)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * 5. En Çok Harcanan 5 Kalem (yatay bar)
 * ---------------------------------------------------------------- */

export function TopKalemlerBarChart({ data }: { data: KalemNoktasi[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="var(--border)"
          />
          <XAxis
            type="number"
            tick={eksenTick}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => kompaktFormat.format(v)}
          />
          <YAxis
            type="category"
            dataKey="kalem"
            tick={eksenTick}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip content={<ParaTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="tutar" name="Tutar" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={GRAFIK_PALETI[i % GRAFIK_PALETI.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * 6. Yıllık Birikim Trendi (alan, işarete göre renkli)
 * ---------------------------------------------------------------- */

function gradientOffset(data: BirikimNoktasi[]): number {
  const degerler = data.map((d) => d.birikim);
  const max = Math.max(...degerler);
  const min = Math.min(...degerler);
  if (max <= 0) return 0;
  if (min >= 0) return 1;
  return max / (max - min);
}

export function BirikimAreaChart({ data }: { data: BirikimNoktasi[] }) {
  const off = gradientOffset(data);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="birikimDolgu" x1="0" y1="0" x2="0" y2="1">
              <stop offset={off} stopColor={RENK_GELIR} stopOpacity={0.35} />
              <stop offset={off} stopColor={RENK_GIDER} stopOpacity={0.35} />
            </linearGradient>
            <linearGradient id="birikimCizgi" x1="0" y1="0" x2="0" y2="1">
              <stop offset={off} stopColor={RENK_GELIR} />
              <stop offset={off} stopColor={RENK_GIDER} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="ay"
            tick={eksenTick}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={eksenTick}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => kompaktFormat.format(v)}
          />
          <Tooltip content={<ParaTooltip />} />
          <Area
            type="monotone"
            dataKey="birikim"
            name="Kümülatif Birikim"
            stroke="url(#birikimCizgi)"
            strokeWidth={2.5}
            fill="url(#birikimDolgu)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
