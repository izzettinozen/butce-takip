"use client";

import {
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

import { GRAFIK_PALETI } from "@/lib/dashboard";
import {
  AGG_LABELS,
  hesaplamaParasal,
  type AggId,
  type PivotNode,
} from "@/lib/rapor";
import { formatCurrency, formatNumber } from "@/lib/format";

export type GrafikTuru = "bar" | "line" | "pie";

const kompaktFormat = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const eksenTick = { fill: "var(--muted-foreground)", fontSize: 12 };

interface TooltipGirdi {
  name?: string;
  value?: number;
}
interface IpucuProps {
  active?: boolean;
  payload?: TooltipGirdi[];
  label?: string | number;
  agg?: AggId;
}

/** Grafik tooltip kutusu (modül seviyesinde tanımlı). */
function RaporIpucu({ active, payload, label, agg = "toplam" }: IpucuProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const deger = p.value ?? 0;
  const metin = hesaplamaParasal(agg)
    ? formatCurrency(deger)
    : formatNumber(deger);
  return (
    <div className="bg-popover rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label ?? p.name}</p>
      <p className="text-muted-foreground">
        {AGG_LABELS[agg]}:{" "}
        <span className="text-foreground font-medium">{metin}</span>
      </p>
    </div>
  );
}

interface RaporGrafikProps {
  /** Birinci seviye pivot düğümleri. */
  nodes: PivotNode[];
  tur: GrafikTuru;
  agg: AggId;
}

export function RaporGrafik({ nodes, tur, agg }: RaporGrafikProps) {
  const data = nodes.map((n) => ({ name: n.label, value: n.deger }));

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {tur === "bar" ? (
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
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
              dataKey="name"
              tick={eksenTick}
              tickLine={false}
              axisLine={false}
              width={130}
            />
            <Tooltip
              content={<RaporIpucu agg={agg} />}
              cursor={{ fill: "var(--muted)" }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={GRAFIK_PALETI[i % GRAFIK_PALETI.length]}
                />
              ))}
            </Bar>
          </BarChart>
        ) : tur === "line" ? (
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="name"
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
            <Tooltip content={<RaporIpucu agg={agg} />} />
            <Line
              type="monotone"
              dataKey="value"
              name={AGG_LABELS[agg]}
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </LineChart>
        ) : (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={130}
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
            <Tooltip content={<RaporIpucu agg={agg} />} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
