"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { parseCsv, serializeCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function CsvEditor({
  className,
  disabled,
  onChange,
  value,
}: {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly onChange: (csv: string) => void;
  readonly value: string;
}) {
  const rows = normalizeGrid(parseCsv(value));

  const updateCell = (rowIndex: number, columnIndex: number, next: string) => {
    const grid = rows.map((row) => [...row]);
    grid[rowIndex][columnIndex] = next;
    onChange(serializeCsv(grid));
  };

  const addRow = () => {
    const width = rows[0]?.length ?? 1;
    onChange(serializeCsv([...rows, Array.from({ length: width }, () => "")]));
  };

  const addColumn = () => {
    onChange(serializeCsv(rows.map((row) => [...row, ""])));
  };

  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) return;
    onChange(serializeCsv(rows.filter((_, index) => index !== rowIndex)));
  };

  const removeColumn = (columnIndex: number) => {
    if ((rows[0]?.length ?? 0) <= 1) return;
    onChange(serializeCsv(rows.map((row) => row.filter((_, index) => index !== columnIndex))));
  };

  return (
    <div className={cn("overflow-auto rounded-xl border bg-card", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Button disabled={disabled} size="sm" type="button" variant="ghost" onClick={addRow}>
          <PlusIcon />
          Row
        </Button>
        <Button disabled={disabled} size="sm" type="button" variant="ghost" onClick={addColumn}>
          <PlusIcon />
          Column
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {rows[0]?.map((_, columnIndex) => (
              <TableHead className="min-w-36" key={`head-${columnIndex}`}>
                <div className="flex items-center justify-between gap-2">
                  <span>Column {columnIndex + 1}</span>
                  {rows[0] && rows[0].length > 1 ? (
                    <Button
                      aria-label={`Remove column ${columnIndex + 1}`}
                      disabled={disabled}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                      onClick={() => removeColumn(columnIndex)}
                    >
                      <Trash2Icon />
                    </Button>
                  ) : null}
                </div>
              </TableHead>
            ))}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {row.map((cell, columnIndex) => (
                <TableCell className="whitespace-normal p-1" key={`${rowIndex}-${columnIndex}`}>
                  <Input
                    aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
                    className="h-8 border-transparent bg-transparent shadow-none dark:bg-transparent"
                    disabled={disabled}
                    value={cell}
                    onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                  />
                </TableCell>
              ))}
              <TableCell className="p-1">
                {rows.length > 1 ? (
                  <Button
                    aria-label={`Remove row ${rowIndex + 1}`}
                    disabled={disabled}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                    onClick={() => removeRow(rowIndex)}
                  >
                    <Trash2Icon />
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function normalizeGrid(rows: string[][]): string[][] {
  if (rows.length === 0) return [[""]];
  const width = Math.max(1, ...rows.map((row) => row.length));
  return rows.map((row) => {
    const next = [...row];
    while (next.length < width) next.push("");
    return next;
  });
}
