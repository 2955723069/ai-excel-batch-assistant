"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type JobView = {
  filename: string;
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
  status: string;
  input_mapping: { conversation: string; customer_id: string | null; customer_name: string | null };
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [job, setJob] = useState<JobView | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void params.then(({ id: value }) => setId(value)); }, [params]);
  useEffect(() => { if (!id) return; const load = async () => { const response = await fetch(`/api/jobs/${id}`, { cache: "no-store" }); const result = await response.json() as { job?: JobView; error?: string }; if (!response.ok) setError(result.error ?? "任务暂时不可用"); else setJob(result.job ?? null); }; void load(); const timer = window.setInterval(() => void load(), 2000); return () => window.clearInterval(timer); }, [id]);
  if (error) return <Message title="任务暂时不可用" description={error} />;
  if (!job) return <Message title="正在读取任务" description="请稍候…" />;

  const progress = job.total_rows ? Math.floor((job.processed_rows / job.total_rows) * 100) : 0;
  return <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-4xl"><header className="flex items-center justify-between border-b border-line pb-6"><div><p className="text-lg font-bold text-ink">AI销售线索批量分析</p><p className="mt-1 max-w-md truncate text-sm text-muted">{job.filename}</p></div><Link href="/jobs" className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:text-brand">返回任务列表</Link></header><section className="mt-10 rounded-2xl border border-line bg-white p-6 shadow-panel sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold text-ink">任务详情</h1><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{job.status}</span></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><Stat label="记录数" value={`${job.processed_rows} / ${job.total_rows}`} /><Stat label="处理进度" value={`${progress}%`} /><Stat label="状态" value={`${job.success_rows} 成功 · ${job.failed_rows} 失败`} /></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => void control("pause")} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink">暂停</button><button type="button" onClick={() => void control("resume")} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink">恢复</button><button type="button" onClick={() => void control("cancel")} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">取消</button>{job.status === "completed" && <a href={`/api/jobs/${id}/export`} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">下载结果 Excel</a>}</div><div className="mt-8 border-t border-line pt-6"><p className="text-sm font-semibold text-ink">字段映射</p><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><Mapping label="聊天记录" value={job.input_mapping.conversation} /><Mapping label="客户 ID" value={job.input_mapping.customer_id} /><Mapping label="客户名称" value={job.input_mapping.customer_name} /></dl></div><p className="mt-8 text-xs leading-5 text-muted">任务已保存到本机 data 目录，页面每 2 秒刷新一次进度。</p></section></div></main>;

  async function control(action: "pause" | "resume" | "cancel") { await fetch(`/api/jobs/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); }
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-muted">{label}</p><p className="mt-2 font-semibold text-ink">{value}</p></div>; }
function Mapping({ label, value }: { label: string; value: string | null }) { return <div><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 truncate font-medium text-ink">{value || "未设置"}</dd></div>; }
function Message({ title, description }: { title: string; description: string }) { return <main className="min-h-screen px-5 py-16"><div className="mx-auto max-w-xl rounded-xl border border-line bg-white p-8 text-center"><h1 className="font-bold text-ink">{title}</h1><p className="mt-2 text-sm text-muted">{description}</p><Link href="/jobs" className="mt-6 inline-flex text-sm font-semibold text-brand">返回任务列表</Link></div></main>; }
