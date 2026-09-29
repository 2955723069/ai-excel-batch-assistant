import * as XLSX from "xlsx";

export type SpreadsheetRow = {
  rowNumber: number;
  inputData: Record<string, string>;
};

export type ParsedSpreadsheet = {
  columns: string[];
  rows: SpreadsheetRow[];
};

export class SpreadsheetInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpreadsheetInputError";
  }
}

const ALLOWED_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);

export function parseSpreadsheet(buffer: Buffer, filename: string, maxRows: number): ParsedSpreadsheet {
  const extension = `.${filename.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new SpreadsheetInputError("文件格式不支持，请上传 .xlsx、.xls 或 .csv 文件。");
  }
  if (buffer.length === 0) throw new SpreadsheetInputError("文件内容为空，请检查上传文件。");

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: false, dense: true });
  } catch {
    throw new SpreadsheetInputError("文件无法读取，请确认它是有效的 Excel 或 CSV 文件。");
  }

  if (workbook.vbaraw) throw new SpreadsheetInputError("不支持包含宏的工作簿。");
  const firstSheetName = workbook.SheetNames[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!sheet) throw new SpreadsheetInputError("工作簿中没有可读取的工作表。");

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: true,
  });
  const headerIndex = matrix.findIndex((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  if (headerIndex < 0) throw new SpreadsheetInputError("文件中没有表头。");

  const columns = (matrix[headerIndex] ?? []).map((cell) => String(cell ?? "").trim());
  if (columns.some((column) => column.length === 0) || new Set(columns).size !== columns.length) {
    throw new SpreadsheetInputError("表头列名不能为空且不能重复，请先整理 Excel 表头。");
  }

  const rows: SpreadsheetRow[] = [];
  for (let index = headerIndex + 1; index < matrix.length; index += 1) {
    const sourceRow = matrix[index] ?? [];
    if (!sourceRow.some((cell) => String(cell ?? "").trim() !== "")) continue;
    const inputData: Record<string, string> = {};
    columns.forEach((column, columnIndex) => {
      inputData[column] = String(sourceRow[columnIndex] ?? "");
    });
    rows.push({ rowNumber: index + 1, inputData });
    if (rows.length > maxRows) {
      throw new SpreadsheetInputError(`当前文件包含超过 ${maxRows} 条记录，请拆分文件后再上传。`);
    }
  }

  if (rows.length === 0) throw new SpreadsheetInputError("文件中没有可分析的数据行。");
  return { columns, rows };
}

export function getMaxRowsPerTask(): number {
  const configured = Number.parseInt(process.env.MAX_ROWS_PER_TASK ?? "1000", 10);
  return Number.isInteger(configured) && configured > 0 ? configured : 1000;
}

export function getMaxUploadBytes(): number {
  const configuredMb = Number.parseInt(process.env.MAX_FILE_SIZE_MB ?? "10", 10);
  const safeMb = Number.isInteger(configuredMb) && configuredMb > 0 ? configuredMb : 10;
  return safeMb * 1024 * 1024;
}
