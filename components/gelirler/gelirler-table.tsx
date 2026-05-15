"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";

import type { GelirWithRelations } from "@/hooks/use-gelirler";
import { ayAdi, formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Tablo gruplama anahtarı. */
export type GelirGroupingKey = "none" | "gelir_turu" | "ay";

const PAGE_SIZE = 50;

interface GelirlerTableProps {
  /** Sayfada filtrelenmiş gelir listesi. */
  data: GelirWithRelations[];
  grouping: GelirGroupingKey;
  onEdit: (gelir: GelirWithRelations) => void;
  onDelete: (gelir: GelirWithRelations) => void;
}

interface Grup {
  label: string;
  sortKey: string | number;
  rows: GelirWithRelations[];
}

/** Gelirleri gruplama anahtarına göre gruplar ve grupları sıralar. */
function buildGroups(
  rows: GelirWithRelations[],
  grouping: GelirGroupingKey,
): Grup[] {
  const map = new Map<string, Grup>();
  for (const gelir of rows) {
    let key: string;
    let label: string;
    let sortKey: string | number;

    if (grouping === "gelir_turu") {
      label = gelir.gelir_turleri?.name ?? "—";
      key = label;
      sortKey = label;
    } else {
      const yil = gelir.donemler?.yil ?? 0;
      const ay = gelir.donemler?.ay ?? 0;
      key = `${yil}-${ay}`;
      label = gelir.donemler ? `${ayAdi(ay)} ${yil}` : "—";
      sortKey = yil * 100 + ay;
    }

    const entry = map.get(key);
    if (entry) entry.rows.push(gelir);
    else map.set(key, { label, sortKey, rows: [gelir] });
  }

  return [...map.values()].sort((a, b) => {
    if (typeof a.sortKey === "number" && typeof b.sortKey === "number") {
      return a.sortKey - b.sortKey;
    }
    return String(a.sortKey).localeCompare(String(b.sortKey), "tr");
  });
}

export function GelirlerTable({
  data,
  grouping,
  onEdit,
  onDelete,
}: GelirlerTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const columns = useMemo<ColumnDef<GelirWithRelations>[]>(
    () => [
      {
        id: "tutar",
        header: "Tutar",
        accessorFn: (r) => Number(r.tutar),
      },
      {
        id: "gelir_turu",
        header: "Gelir Türü",
        accessorFn: (r) => r.gelir_turleri?.name ?? "",
      },
      {
        id: "donem",
        header: "Dönem",
        accessorFn: (r) => (r.donemler?.yil ?? 0) * 100 + (r.donemler?.ay ?? 0),
      },
      {
        id: "created_at",
        header: "Eklenme Tarihi",
        accessorFn: (r) => r.created_at,
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const isGrouped = grouping !== "none";

  const genelToplam = useMemo(
    () => data.reduce((sum, g) => sum + Number(g.tutar), 0),
    [data],
  );

  const gruplar = useMemo(() => {
    if (!isGrouped) return [];
    return buildGroups(
      table.getSortedRowModel().rows.map((r) => r.original),
      grouping,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGrouped, grouping, table.getSortedRowModel().rows]);

  const flatRows = table.getRowModel().rows;
  const pageCount = table.getPageCount();
  const { pageIndex } = table.getState().pagination;

  /** Tek bir gelir satırını render eder. */
  function renderRow(gelir: GelirWithRelations, sira: number) {
    return (
      <TableRow key={gelir.id}>
        <TableCell className="text-muted-foreground">{sira}</TableCell>
        <TableCell className="text-right font-medium tabular-nums">
          {formatCurrency(gelir.tutar)}
        </TableCell>
        <TableCell>{gelir.gelir_turleri?.name ?? "—"}</TableCell>
        <TableCell>
          {gelir.donemler
            ? `${ayAdi(gelir.donemler.ay)} ${gelir.donemler.yil}`
            : "—"}
        </TableCell>
        <TableCell className="text-muted-foreground whitespace-nowrap">
          {formatDate(gelir.created_at)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Geliri düzenle"
              onClick={() => onEdit(gelir)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Geliri sil"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(gelir)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            {table.getFlatHeaders().map((header) => {
              const sorted = header.column.getIsSorted();
              const isTutar = header.column.id === "tutar";
              return (
                <TableHead
                  key={header.id}
                  className={cn(isTutar && "text-right")}
                >
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      "inline-flex items-center gap-1.5 hover:text-foreground",
                      isTutar && "flex-row-reverse",
                    )}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {sorted === "asc" ? (
                      <ArrowUp className="size-3.5" />
                    ) : sorted === "desc" ? (
                      <ArrowDown className="size-3.5" />
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-40" />
                    )}
                  </button>
                </TableHead>
              );
            })}
            <TableHead className="w-24 text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-muted-foreground py-10 text-center"
              >
                Gösterilecek gelir kaydı bulunamadı.
              </TableCell>
            </TableRow>
          ) : isGrouped ? (
            (() => {
              let sira = 0;
              return gruplar.map((grup) => {
                const araToplam = grup.rows.reduce(
                  (s, g) => s + Number(g.tutar),
                  0,
                );
                return (
                  <GroupFragment key={grup.label}>
                    {grup.rows.map((gelir) => renderRow(gelir, ++sira))}
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      <TableCell />
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(araToplam)}
                      </TableCell>
                      <TableCell colSpan={4} className="font-medium">
                        Ara Toplam · {grup.label}
                      </TableCell>
                    </TableRow>
                  </GroupFragment>
                );
              });
            })()
          ) : (
            flatRows.map((row, i) =>
              renderRow(row.original, pageIndex * PAGE_SIZE + i + 1),
            )
          )}
        </TableBody>

        {data.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell />
              <TableCell className="text-right font-bold tabular-nums">
                {formatCurrency(genelToplam)}
              </TableCell>
              <TableCell colSpan={4} className="font-semibold">
                Genel Toplam
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>

      {!isGrouped && data.length > 0 && pageCount > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-muted-foreground text-sm">
            {data.length} kayıt · Sayfa {pageIndex + 1} / {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Sonraki
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Grup satırlarını saran fragment. */
function GroupFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
