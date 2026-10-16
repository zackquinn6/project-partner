import * as XLSX from 'xlsx';
import type { SpreadsheetColumn, SpreadsheetRow } from './spreadsheetTypes';

function rowsToRecords(
  rows: SpreadsheetRow[],
  columns: SpreadsheetColumn[]
): Record<string, string>[] {
  return rows.map((row) => {
    const record: Record<string, string> = {};
    for (const col of columns) {
      record[col.header] = row.cells[col.id] ?? '';
    }
    return record;
  });
}

export function exportXlsx(
  rows: SpreadsheetRow[],
  columns: SpreadsheetColumn[],
  filename: string,
  sheetName = 'Sheet1'
): void {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rowsToRecords(rows, columns));
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  const safeName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, safeName);
}

export function exportCsv(
  rows: SpreadsheetRow[],
  columns: SpreadsheetColumn[],
  filename: string
): void {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rowsToRecords(rows, columns));
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
