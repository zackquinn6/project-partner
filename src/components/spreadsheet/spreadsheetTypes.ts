export type SpreadsheetCellType = 'text' | 'number' | 'date' | 'select';

export interface SpreadsheetColumn {
  id: string;
  header: string;
  type: SpreadsheetCellType;
  editable: boolean;
  width?: number;
  options?: { value: string; label: string }[];
}

export interface SpreadsheetRow {
  id: string;
  cells: Record<string, string>;
  /** When false, the row cannot be deleted from the grid. */
  deletable?: boolean;
  /** Per-column edit overrides; missing keys fall back to column.editable. */
  cellEditable?: Record<string, boolean>;
}

export interface CellCoord {
  rowIndex: number;
  colIndex: number;
}

export interface SelectionRange {
  start: CellCoord;
  end: CellCoord;
}
