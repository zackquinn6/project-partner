import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Download, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { exportCsv, exportXlsx } from './exportSpreadsheet';
import type { SpreadsheetColumn, SpreadsheetRow } from './spreadsheetTypes';
import {
  isCellInRange,
  rangeToTsv,
  useSpreadsheetSelection,
} from './useSpreadsheetSelection';

export interface SpreadsheetGridProps {
  columns: SpreadsheetColumn[];
  rows: SpreadsheetRow[];
  onRowsChange: (rows: SpreadsheetRow[]) => void;
  onAddRow?: () => void;
  onDeleteRows?: (rowIds: string[]) => void;
  exportBasename?: string;
  className?: string;
  /** When false, hide add-row control. */
  allowAddRow?: boolean;
}

function isCellEditable(
  row: SpreadsheetRow,
  column: SpreadsheetColumn
): boolean {
  if (row.cellEditable && column.id in row.cellEditable) {
    return row.cellEditable[column.id] === true;
  }
  return column.editable;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  columns,
  rows,
  onRowsChange,
  onAddRow,
  onDeleteRows,
  exportBasename = 'export',
  className,
  allowAddRow = true,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const {
    focus,
    selection,
    selectCell,
    moveFocus,
  } = useSpreadsheetSelection();
  const [editing, setEditing] = useState<{
    rowIndex: number;
    colIndex: number;
    draft: string;
  } | null>(null);

  const updateCell = useCallback(
    (rowIndex: number, colId: string, value: string) => {
      const next = rows.map((row, i) => {
        if (i !== rowIndex) return row;
        return {
          ...row,
          cells: { ...row.cells, [colId]: value },
        };
      });
      onRowsChange(next);
    },
    [onRowsChange, rows]
  );

  const beginEdit = useCallback(
    (rowIndex: number, colIndex: number, seed?: string) => {
      const row = rows[rowIndex];
      const col = columns[colIndex];
      if (!row || !col || !isCellEditable(row, col)) return;
      const current = row.cells[col.id] ?? '';
      setEditing({
        rowIndex,
        colIndex,
        draft: seed !== undefined ? seed : current,
      });
    },
    [columns, rows]
  );

  const commitEdit = useCallback(() => {
    if (!editing) return;
    const col = columns[editing.colIndex];
    if (col) {
      updateCell(editing.rowIndex, col.id, editing.draft);
    }
    setEditing(null);
  }, [columns, editing, updateCell]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

  const selectedRowIds = useMemo(() => {
    if (!selection) return [] as string[];
    const start = Math.min(selection.start.rowIndex, selection.end.rowIndex);
    const end = Math.max(selection.start.rowIndex, selection.end.rowIndex);
    const ids: string[] = [];
    for (let i = start; i <= end; i++) {
      const row = rows[i];
      if (row) ids.push(row.id);
    }
    return ids;
  }, [rows, selection]);

  const copySelection = useCallback(async () => {
    if (!selection || rows.length === 0) return;
    const tsv = rangeToTsv(rows, columns, selection);
    try {
      await navigator.clipboard.writeText(tsv);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [columns, rows, selection]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!focus) return;
      const rowCount = rows.length;
      const colCount = columns.length;
      const isMod = event.metaKey || event.ctrlKey;

      if (editing) {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitEdit();
          moveFocus(1, 0, rowCount, colCount, false);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          cancelEdit();
        } else if (event.key === 'Tab') {
          event.preventDefault();
          commitEdit();
          moveFocus(0, event.shiftKey ? -1 : 1, rowCount, colCount, false);
        }
        return;
      }

      if (isMod && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        void copySelection();
        return;
      }

      if (event.key === 'F2' || event.key === 'Enter') {
        event.preventDefault();
        beginEdit(focus.rowIndex, focus.colIndex);
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const row = rows[focus.rowIndex];
        const col = columns[focus.colIndex];
        if (row && col && isCellEditable(row, col)) {
          event.preventDefault();
          updateCell(focus.rowIndex, col.id, '');
        }
        return;
      }

      if (event.key.length === 1 && !isMod && !event.altKey) {
        const row = rows[focus.rowIndex];
        const col = columns[focus.colIndex];
        if (row && col && isCellEditable(row, col) && col.type !== 'select') {
          event.preventDefault();
          beginEdit(focus.rowIndex, focus.colIndex, event.key);
        }
        return;
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          moveFocus(-1, 0, rowCount, colCount, event.shiftKey);
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveFocus(1, 0, rowCount, colCount, event.shiftKey);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          moveFocus(0, -1, rowCount, colCount, event.shiftKey);
          break;
        case 'ArrowRight':
        case 'Tab':
          event.preventDefault();
          moveFocus(
            0,
            event.key === 'Tab' && event.shiftKey ? -1 : 1,
            rowCount,
            colCount,
            event.key === 'Tab' ? false : event.shiftKey
          );
          break;
        default:
          break;
      }
    },
    [
      beginEdit,
      cancelEdit,
      columns,
      commitEdit,
      copySelection,
      editing,
      focus,
      moveFocus,
      rows,
      updateCell,
    ]
  );

  useEffect(() => {
    if (!editing) return;
    const input = gridRef.current?.querySelector<HTMLInputElement>(
      '[data-spreadsheet-editor="true"]'
    );
    input?.focus();
    if (editing.draft.length <= 1) {
      input?.setSelectionRange(editing.draft.length, editing.draft.length);
    } else {
      input?.select();
    }
  }, [editing]);

  const tableColumns = useMemo<ColumnDef<SpreadsheetRow>[]>(
    () =>
      columns.map((col, colIndex) => ({
        id: col.id,
        accessorFn: (row) => row.cells[col.id] ?? '',
        header: col.header,
        size: col.width ?? 140,
        cell: ({ row }) => {
          const rowIndex = row.index;
          const value = row.original.cells[col.id] ?? '';
          const selected = isCellInRange(rowIndex, colIndex, selection);
          const focused =
            focus?.rowIndex === rowIndex && focus?.colIndex === colIndex;
          const isEditing =
            editing?.rowIndex === rowIndex && editing?.colIndex === colIndex;
          const editable = isCellEditable(row.original, col);

          return (
            <div
              role="gridcell"
              tabIndex={focused ? 0 : -1}
              className={cn(
                'h-8 min-h-8 w-full truncate px-2 py-1 text-xs outline-none',
                selected && 'bg-primary/15',
                focused && 'ring-2 ring-inset ring-primary',
                !editable && 'text-muted-foreground'
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectCell({ rowIndex, colIndex }, e.shiftKey);
                gridRef.current?.focus();
              }}
              onDoubleClick={() => beginEdit(rowIndex, colIndex)}
            >
              {isEditing ? (
                col.type === 'select' && col.options ? (
                  <Select
                    value={editing.draft || undefined}
                    onValueChange={(v) => {
                      updateCell(rowIndex, col.id, v);
                      setEditing(null);
                    }}
                    open
                    onOpenChange={(open) => {
                      if (!open) setEditing(null);
                    }}
                  >
                    <SelectTrigger className="h-7 border-0 px-1 text-xs shadow-none focus:ring-0">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {col.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    data-spreadsheet-editor="true"
                    type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                    className="h-full w-full bg-transparent text-xs outline-none"
                    value={editing.draft}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, draft: e.target.value } : prev
                      )
                    }
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitEdit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                      }
                      e.stopPropagation();
                    }}
                  />
                )
              ) : col.type === 'select' && col.options ? (
                col.options.find((o) => o.value === value)?.label ?? value
              ) : (
                value
              )}
            </div>
          );
        },
      })),
    [
      beginEdit,
      cancelEdit,
      columns,
      commitEdit,
      editing,
      focus,
      selectCell,
      selection,
      updateCell,
    ]
  );

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const handleDelete = () => {
    if (!onDeleteRows || selectedRowIds.length === 0) return;
    const deletable = rows
      .filter((r) => selectedRowIds.includes(r.id) && r.deletable !== false)
      .map((r) => r.id);
    if (deletable.length === 0) {
      toast.error('Selected rows cannot be deleted');
      return;
    }
    onDeleteRows(deletable);
  };

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {allowAddRow && onAddRow && (
          <Button type="button" variant="outline" size="sm" onClick={onAddRow}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add row
          </Button>
        )}
        {onDeleteRows && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={selectedRowIds.length === 0}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete row
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => void copySelection()}>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => exportXlsx(rows, columns, exportBasename, 'Data')}
            >
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => exportCsv(rows, columns, exportBasename)}
            >
              CSV (.csv)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={gridRef}
        role="grid"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-auto rounded-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={handleKeyDown}
      >
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-b border-r px-2 py-1.5 text-xs font-medium text-muted-foreground"
                    style={{ width: header.getSize(), minWidth: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-xs text-muted-foreground"
                >
                  No rows
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="border-r p-0 align-middle last:border-r-0"
                      style={{
                        width: cell.column.getSize(),
                        minWidth: cell.column.getSize(),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
