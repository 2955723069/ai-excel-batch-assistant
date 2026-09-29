import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getOwnerId } from "@/lib/jobs/access";
import { getLocalJob } from "@/lib/jobs/local-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = await getOwnerId();
  const job = ownerId ? await getLocalJob(id, ownerId) : null;
  if (!job) return NextResponse.json({ error: "未找到该任务。" }, { status: 404 });
  const rows = job.items.map((item) => {
    const extracted = item.extracted_data as Record<string, unknown> | undefined;
    const decision = item.jev_result as Record<string, unknown> | undefined;
    const advice = item.sales_advice as Record<string, unknown> | undefined;
    return { ...item.input_data, lead_level: decision?.lead_level ?? "", priority: decision?.priority ?? "", intent_score: "", customer_type: extracted?.customer_type ?? "", company_size: extracted?.company_size ?? "", needs: join(extracted?.needs), pain_points: join(extracted?.pain_points), budget: extracted?.budget ?? "", timeline: extracted?.timeline ?? "", decision_maker: extracted?.decision_maker ?? "", purchase_stage: extracted?.purchase_stage ?? "", buying_signals: join(extracted?.buying_signals), objections: join(extracted?.objections), missing_information: join(extracted?.missing_information), human_required: decision?.human_required ?? "", next_action: decision?.next_action ?? "", follow_up_advice: join(advice?.follow_up_advice), recommended_questions: join(advice?.recommended_questions), follow_up_message: advice?.follow_up_message ?? "", processing_status: item.status, error_message: item.error_message ?? "" };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "销售分析结果");
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(bytes, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename*=UTF-8''AI%E9%94%80%E5%94%AE%E5%88%86%E6%9E%90%E7%BB%93%E6%9E%9C.xlsx` } });
}
function join(value: unknown) { return Array.isArray(value) ? value.join("；") : value ?? ""; }
