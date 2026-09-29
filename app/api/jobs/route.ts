import { NextResponse } from "next/server";
import { createLocalJob, listLocalJobs } from "@/lib/jobs/local-store";
import { getMaxRowsPerTask, getMaxUploadBytes, parseSpreadsheet, SpreadsheetInputError } from "@/lib/jobs/excel";
import { getOwnerId } from "@/lib/jobs/access";
import { createJobFormSchema } from "@/schemas/jobs";
import { startJobWorker } from "@/lib/jobs/worker";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ownerId = await getOwnerId();
    const jobs = ownerId ? await listLocalJobs(ownerId) : [];
    for (const job of jobs) {
      if (job.status === "queued" || job.status === "processing") startJobWorker(job.id);
    }
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("List jobs failed", { error_type: errorType(error) });
    return NextResponse.json({ error: "任务列表暂时不可用，请检查本地存储配置。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const input = createJobFormSchema.safeParse({
      templateId: form.get("templateId"),
      conversationColumn: form.get("conversationColumn"),
      customerIdColumn: form.get("customerIdColumn") ?? undefined,
      customerNameColumn: form.get("customerNameColumn") ?? undefined,
    });

    if (!(file instanceof File)) return NextResponse.json({ error: "请选择要上传的 Excel 文件。" }, { status: 400 });
    if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message ?? "请检查任务设置。" }, { status: 400 });
    if (file.size > getMaxUploadBytes()) return NextResponse.json({ error: "文件过大，请上传不超过 10 MB 的文件。" }, { status: 413 });

    const filename = safeFilename(file.name);
    const spreadsheet = parseSpreadsheet(Buffer.from(await file.arrayBuffer()), filename, getMaxRowsPerTask());
    if (!spreadsheet.columns.includes(input.data.conversationColumn)) {
      return NextResponse.json({ error: "所选聊天记录列不存在于文件表头中，请重新选择。" }, { status: 400 });
    }
    if (input.data.customerIdColumn && !spreadsheet.columns.includes(input.data.customerIdColumn)) {
      return NextResponse.json({ error: "所选客户 ID 列不存在于文件表头中，请重新选择。" }, { status: 400 });
    }
    if (input.data.customerNameColumn && !spreadsheet.columns.includes(input.data.customerNameColumn)) {
      return NextResponse.json({ error: "所选客户名称列不存在于文件表头中，请重新选择。" }, { status: 400 });
    }

    for (const row of spreadsheet.rows) {
      if (!row.inputData[input.data.conversationColumn].trim()) {
        return NextResponse.json({ error: `第 ${row.rowNumber} 行的聊天记录为空，请补充内容后再上传。` }, { status: 400 });
      }
    }

    const ownerId = await getOwnerId(true);
    if (!ownerId) throw new Error("Could not establish job owner");
    const jobId = await createLocalJob({
      ownerId,
      filename,
      templateId: input.data.templateId,
      mapping: {
        conversation: input.data.conversationColumn,
        customer_id: input.data.customerIdColumn,
        customer_name: input.data.customerNameColumn,
      },
      rows: spreadsheet.rows,
      inputBuffer: Buffer.from(await file.arrayBuffer()),
    });
    const response = NextResponse.json({ job_id: jobId, status: "queued", total: spreadsheet.rows.length }, { status: 201 });
    response.cookies.set("batch_jobs_owner", ownerId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    startJobWorker(jobId);
    return response;
  } catch (error) {
    if (error instanceof SpreadsheetInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Create job failed", { error_type: errorType(error) });
    return NextResponse.json({ error: "任务创建失败，请检查本地存储后重试。" }, { status: 503 });
  }
}

function safeFilename(filename: string) {
  return filename.replaceAll("\\", "/").split("/").pop()?.slice(0, 255) || "upload";
}

function errorType(error: unknown) {
  return error instanceof Error ? error.name : "unknown";
}
