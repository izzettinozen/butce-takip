"use client";

import {
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

import { GRAFIK_PALETI } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/format";

const kompaktFormat = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const eksenTick = { fill: "var(--muted-foreground)", fontSize: 12 };

interface TooltipGirdi {
  name?: string;
  value?: number;
  color?: string;
}
interface OrtakTooltipProps {
  active?: boolean;
  payload?: TooltipGirdi[];
  label?: string | number;
}

export interface PastaDilim {
  name: string;
  value: number;
}

/** Özel renkler: bekleyen nakit ve "Diğer" dilimleri ayrışsın. */
function dilimRengi(name: string, i: number): string {
  if (name === "Bekleyen Nakit") return "#94a3b8";
  if (name === "Diğer") return "#cbd5e1";
  return GRAFIK_PALETI[i % GRAFIK_PALETI.length];
}

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
        {formatCurrency(deger)} · {`%${yuzde.toFixed(1).replace(".", ",")}`}
      </p>
    </div>
  );
}

/** Araç dağılımı pasta grafiği (güncel değere göre). */
export function PortfoyPastaChart({ data }: { data: PastaDilim[] }) {
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
            {data.map((d, i) => (
              <Cell key={i} fill={dilimRengi(d.name, i)} />
            ))}
          </Pie>
          <Tooltip content={<PastaTooltip toplam={toplam} />} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendTooltip({ active, payload, label }: OrtakTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <p className="flex items-center gap-2">
        <span className="text-muted-foreground">Portföy Değeri</span>
        <span className="ml-auto font-medium">
          {formatCurrency(payload[0].value ?? 0)}
        </span>
      </p>
    </div>
  );
}

export interface TrendGorunumNoktasi {
  label: string;
  deger: number;
}

/** Portföy değeri trendi (çizgi). */
export function PortfoyTrendChart({ data }: { data: TrendGorunumNoktasi[] }) {
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
            dataKey="label"
            tick={eksenTick}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={eksenTick}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => kompaktFormat.format(v)}
          />
          <Tooltip content={<TrendTooltip />} />
          <Line
            type="monotone"
            dataKey="deger"
            name="Portföy Değeri"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
