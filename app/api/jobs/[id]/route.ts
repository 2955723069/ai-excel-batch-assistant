import { NextResponse } from "next/server";
import { getLocalJob } from "@/lib/jobs/local-store";
import { getOwnerId } from "@/lib/jobs/access";
import { pauseJobWorker, resumeJobWorker, cancelJobWorker } from "@/lib/jobs/worker";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "未找到该任务。" }, { status: 404 });
  }
  try {
    const ownerId = await getOwnerId();
    const job = ownerId ? await getLocalJob(id, ownerId) : null;
    if (!job) return NextResponse.json({ error: "未找到该任务。" }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    console.error("Get job failed", { job_id: id, error_type: errorType(error) });
    return NextResponse.json({ error: "任务暂时不可用，请稍后重试。" }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = await getOwnerId();
  if (!ownerId || !/^[0-9a-f-]{36}$/i.test(id) || !(await getLocalJob(id, ownerId))) return NextResponse.json({ error: "未找到该任务。" }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { action?: string };
  if (body.action === "pause") { pauseJobWorker(id); return NextResponse.json({ status: "paused" }); }
  if (body.action === "resume") { resumeJobWorker(id); return NextResponse.json({ status: "processing" }); }
  if (body.action === "cancel") { cancelJobWorker(id); return NextResponse.json({ status: "cancelled" }); }
  return NextResponse.json({ error: "不支持的任务操作。" }, { status: 400 });
}

function errorType(error: unknown) {
  return error instanceof Error ? error.name : "unknown";
}
