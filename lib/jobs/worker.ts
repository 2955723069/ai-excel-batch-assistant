import { extractConversationFacts } from "@/lib/llm/extractor";
import { decideLead } from "@/lib/jev/decision";
import { generateSalesAdvice } from "@/lib/llm/advisor";
import { getLocalJobForWorker, updateLocalItem, updateLocalJob, type LocalJobItem } from "@/lib/jobs/local-store";

const running = new Map<string, { cancelled: boolean; paused: boolean }>();

export function startJobWorker(id: string) {
  if (running.has(id)) return;
  const control = { cancelled: false, paused: false };
  running.set(id, control);
  void processJob(id, control).finally(() => running.delete(id));
}

export function pauseJobWorker(id: string) { const state = running.get(id); if (state) state.paused = true; void updateLocalJob(id, { status: "paused" }); }
export function resumeJobWorker(id: string) { const state = running.get(id); if (state) { state.paused = false; void updateLocalJob(id, { status: "processing" }); } else startJobWorker(id); }
export function cancelJobWorker(id: string) { const state = running.get(id); if (state) state.cancelled = true; void updateLocalJob(id, { status: "cancelled" }); }

async function processJob(id: string, control: { cancelled: boolean; paused: boolean }) {
  let job = await getLocalJobForWorker(id);
  if (!job) return;
  for (const item of job.items) {
    if (item.status === "processing") await updateLocalItem(id, item.row_number, { status: "pending" });
  }
  job = await getLocalJobForWorker(id);
  if (!job) return;
  await updateLocalJob(id, { status: "processing", started_at: job.started_at ?? new Date().toISOString() });
  const concurrency = Math.min(10, Math.max(1, Number(process.env.MAX_CONCURRENCY ?? 5)));
  const queue = job.items.filter((item) => item.status === "pending" || item.status === "retrying");
  let cursor = 0;
  const runOne = async () => {
    while (cursor < queue.length) {
      if (control.cancelled) return;
      while (control.paused && !control.cancelled) await delay(250);
      const item = queue[cursor++];
      if (!item) return;
      await processItem(id, job as NonNullable<typeof job>, item);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, runOne));
  job = await getLocalJobForWorker(id) ?? job;
  if (control.cancelled) await updateLocalJob(id, { status: "cancelled" });
  else if (control.paused) await updateLocalJob(id, { status: "paused" });
  else await updateLocalJob(id, { status: "completed", completed_at: new Date().toISOString() });
}

async function processItem(id: string, job: NonNullable<Awaited<ReturnType<typeof getLocalJobForWorker>>>, item: LocalJobItem) {
  const maxRetries = Math.max(1, Number(process.env.MAX_RETRIES ?? 3));
  await updateLocalItem(id, item.row_number, { status: "processing" });
  try {
    const conversation = item.input_data[job.input_mapping.conversation] ?? "";
    const extracted = await extractConversationFacts(conversation);
    const decision = await decideLead(extracted);
    const advice = process.env.ENABLE_ADVISOR === "false" ? null : await generateSalesAdvice(conversation, extracted, decision);
    await updateLocalItem(id, item.row_number, { status: "completed", extracted_data: extracted, jev_result: decision, sales_advice: advice, completed_at: new Date().toISOString(), error_message: null });
    await incrementJob(id, true);
  } catch (error) {
    const retry = item.retry_count + 1;
    if (retry < maxRetries) {
      await updateLocalItem(id, item.row_number, { status: "retrying", retry_count: retry, error_message: error instanceof Error ? error.message : "处理失败" });
      await delay(2 ** retry * 1000);
    } else {
      await updateLocalItem(id, item.row_number, { status: "failed", retry_count: retry, error_message: "处理失败，已达到最大重试次数。" });
      await incrementJob(id, false);
    }
  }
}

async function incrementJob(id: string, success: boolean) {
  const job = await getLocalJobForWorker(id);
  if (!job) return;
  await updateLocalJob(id, { processed_rows: job.processed_rows + 1, success_rows: job.success_rows + (success ? 1 : 0), failed_rows: job.failed_rows + (success ? 0 : 1) });
}
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
