import { useCallback, useState } from 'react';
import type { CellCoord, SelectionRange, SpreadsheetColumn, SpreadsheetRow } from './spreadsheetTypes';

function normalizeRange(range: SelectionRange): SelectionRange {
  return {
    start: {
      rowIndex: Math.min(range.start.rowIndex, range.end.rowIndex),
      colIndex: Math.min(range.start.colIndex, range.end.colIndex),
    },
    end: {
      rowIndex: Math.max(range.start.rowIndex, range.end.rowIndex),
      colIndex: Math.max(range.start.colIndex, range.end.colIndex),
    },
  };
}

export function rangeToTsv(
  rows: SpreadsheetRow[],
  columns: SpreadsheetColumn[],
  range: SelectionRange
): string {
  const normalized = normalizeRange(range);
  const lines: string[] = [];
  for (let r = normalized.start.rowIndex; r <= normalized.end.rowIndex; r++) {
    const row = rows[r];
    if (!row) continue;
    const cells: string[] = [];
    for (let c = normalized.start.colIndex; c <= normalized.end.colIndex; c++) {
      const col = columns[c];
      if (!col) continue;
      const raw = row.cells[col.id] ?? '';
      cells.push(raw.replace(/\t/g, ' ').replace(/\r?\n/g, ' '));
    }
    lines.push(cells.join('\t'));
  }
  return lines.join('\n');
}

export function isCellInRange(rowIndex: number, colIndex: number, range: SelectionRange | null): boolean {
  if (!range) return false;
  const normalized = normalizeRange(range);
  return (
    rowIndex >= normalized.start.rowIndex &&
    rowIndex <= normalized.end.rowIndex &&
    colIndex >= normalized.start.colIndex &&
    colIndex <= normalized.end.colIndex
  );
}

export function useSpreadsheetSelection() {
  const [focus, setFocus] = useState<CellCoord | null>(null);
  const [anchor, setAnchor] = useState<CellCoord | null>(null);
  const [selection, setSelection] = useState<SelectionRange | null>(null);

  const selectCell = useCallback((coord: CellCoord, extend: boolean) => {
    setFocus(coord);
    if (extend && anchor) {
      setSelection({ start: anchor, end: coord });
    } else {
      setAnchor(coord);
      setSelection({ start: coord, end: coord });
    }
  }, [anchor]);

  const clearSelection = useCallback(() => {
    setFocus(null);
    setAnchor(null);
    setSelection(null);
  }, []);

  const moveFocus = useCallback(
    (
      rowDelta: number,
      colDelta: number,
      rowCount: number,
      colCount: number,
      extend: boolean
    ) => {
      if (!focus || rowCount === 0 || colCount === 0) return;
      const next: CellCoord = {
        rowIndex: Math.max(0, Math.min(rowCount - 1, focus.rowIndex + rowDelta)),
        colIndex: Math.max(0, Math.min(colCount - 1, focus.colIndex + colDelta)),
      };
      selectCell(next, extend);
    },
    [focus, selectCell]
  );

  return {
    focus,
    selection,
    selectCell,
    clearSelection,
    moveFocus,
    setFocus,
  };
}
