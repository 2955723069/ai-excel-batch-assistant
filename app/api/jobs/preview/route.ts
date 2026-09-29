import { NextResponse } from "next/server";
import { getMaxRowsPerTask, getMaxUploadBytes, parseSpreadsheet, SpreadsheetInputError } from "@/lib/jobs/excel";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "请选择要上传的 Excel 文件。" }, { status: 400 });
    if (file.size > getMaxUploadBytes()) return NextResponse.json({ error: "文件过大，请上传不超过 10 MB 的文件。" }, { status: 413 });

    const spreadsheet = parseSpreadsheet(Buffer.from(await file.arrayBuffer()), safeFilename(file.name), getMaxRowsPerTask());
    return NextResponse.json({ filename: safeFilename(file.name), size: file.size, total: spreadsheet.rows.length, columns: spreadsheet.columns });
  } catch (error) {
    if (error instanceof SpreadsheetInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Spreadsheet preview failed", { error_type: errorType(error) });
    return NextResponse.json({ error: "文件解析失败，请检查文件后重试。" }, { status: 400 });
  }
}

function safeFilename(filename: string) {
  return filename.replaceAll("\\", "/").split("/").pop()?.slice(0, 255) || "upload";
}

function errorType(error: unknown) {
  return error instanceof Error ? error.name : "unknown";
}
