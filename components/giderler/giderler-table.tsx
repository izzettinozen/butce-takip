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

import type { GiderWithRelations } from "@/hooks/use-giderler";
import { formatCurrency, formatDate } from "@/lib/format";
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
export type GroupingKey =
  | "none"
  | "gider_turu"
  | "gider_kalemi"
  | "odeme_turu";

const PAGE_SIZE = 50;

interface GiderlerTableProps {
  /** Sayfada arama ile filtrelenmiş gider listesi. */
  data: GiderWithRelations[];
  grouping: GroupingKey;
  onEdit: (gider: GiderWithRelations) => void;
  onDelete: (gider: GiderWithRelations) => void;
}

/** Bir giderin gruplama anahtarına göre grup adını döndürür. */
function groupNameOf(gider: GiderWithRelations, grouping: GroupingKey): string {
  switch (grouping) {
    case "gider_turu":
      return gider.gider_turleri?.name ?? "—";
    case "gider_kalemi":
      return gider.gider_kalemleri?.name ?? "—";
    case "odeme_turu":
      return gider.odeme_turleri?.name ?? "—";
    default:
      return "";
  }
}

export function GiderlerTable({
  data,
  grouping,
  onEdit,
  onDelete,
}: GiderlerTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  // Sütunlar yalnızca sıralama için tanımlı; hücreler elle render edilir.
  const columns = useMemo<ColumnDef<GiderWithRelations>[]>(
    () => [
      {
        id: "gider_turu",
        header: "Gider Türü",
        accessorFn: (r) => r.gider_turleri?.name ?? "",
      },
      {
        id: "gider_kalemi",
        header: "Gider Kalemi",
        accessorFn: (r) => r.gider_kalemleri?.name ?? "",
      },
      {
        id: "tutar",
        header: "Tutar",
        accessorFn: (r) => Number(r.tutar),
      },
      {
        id: "odeme_turu",
        header: "Ödeme Türü",
        accessorFn: (r) => r.odeme_turleri?.name ?? "",
      },
      {
        id: "aciklama",
        header: "Açıklama",
        accessorFn: (r) => r.aciklama ?? "",
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

  // Genel toplam — tüm (aranmış) veriler üzerinden.
  const genelToplam = useMemo(
    () => data.reduce((sum, g) => sum + Number(g.tutar), 0),
    [data],
  );

  // Gruplu modda: sıralı satırları grup adına göre grupla (sıra korunur).
  const gruplar = useMemo(() => {
    if (!isGrouped) return [];
    const map = new Map<string, GiderWithRelations[]>();
    for (const row of table.getSortedRowModel().rows) {
      const ad = groupNameOf(row.original, grouping);
      const liste = map.get(ad);
      if (liste) liste.push(row.original);
      else map.set(ad, [row.original]);
    }
    return [...map.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGrouped, grouping, table.getSortedRowModel().rows]);

  const flatRows = table.getRowModel().rows;
  const pageCount = table.getPageCount();
  const { pageIndex } = table.getState().pagination;

  /** Tek bir gider satırını render eder. */
  function renderRow(gider: GiderWithRelations, sira: number) {
    return (
      <TableRow key={gider.id}>
        <TableCell className="text-muted-foreground">{sira}</TableCell>
        <TableCell className="font-medium">
          {gider.gider_turleri?.name ?? "—"}
        </TableCell>
        <TableCell>{gider.gider_kalemleri?.name ?? "—"}</TableCell>
        <TableCell className="text-right tabular-nums">
          {formatCurrency(gider.tutar)}
        </TableCell>
        <TableCell>{gider.odeme_turleri?.name ?? "—"}</TableCell>
        <TableCell className="text-muted-foreground max-w-[16rem] truncate">
          {gider.aciklama || "—"}
        </TableCell>
        <TableCell className="text-muted-foreground whitespace-nowrap">
          {formatDate(gider.created_at)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Gideri düzenle"
              onClick={() => onEdit(gider)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Gideri sil"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(gider)}
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
                colSpan={8}
                className="text-muted-foreground py-10 text-center"
              >
                Aramanızla eşleşen gider bulunamadı.
              </TableCell>
            </TableRow>
          ) : isGrouped ? (
            // Gruplu görünüm: her grup için satırlar + ara toplam.
            (() => {
              let sira = 0;
              return gruplar.map(([grupAdi, satirlar]) => {
                const araToplam = satirlar.reduce(
                  (s, g) => s + Number(g.tutar),
                  0,
                );
                return (
                  <RowGroup key={grupAdi}>
                    {satirlar.map((gider) => renderRow(gider, ++sira))}
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      <TableCell colSpan={3} className="font-medium">
                        Ara Toplam · {grupAdi}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(araToplam)}
                      </TableCell>
                      <TableCell colSpan={4} />
                    </TableRow>
                  </RowGroup>
                );
              });
            })()
          ) : (
            // Düz görünüm: sayfalanmış satırlar.
            flatRows.map((row, i) =>
              renderRow(row.original, pageIndex * PAGE_SIZE + i + 1),
            )
          )}
        </TableBody>

        {data.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-semibold">
                Toplam
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums">
                {formatCurrency(genelToplam)}
              </TableCell>
              <TableCell colSpan={4} />
            </TableRow>
          </TableFooter>
        )}
      </Table>

      {/* Sayfalama — yalnızca düz görünümde ve birden fazla sayfa varsa */}
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

/** Grup satırlarını mantıksal olarak saran fragment. */
function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
