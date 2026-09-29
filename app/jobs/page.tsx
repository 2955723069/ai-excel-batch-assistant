import Link from "next/link";
import { getOwnerId } from "@/lib/jobs/access";
import { listLocalJobs } from "@/lib/jobs/local-store";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  let jobs: Awaited<ReturnType<typeof listLocalJobs>> = [];
  let storageUnavailable = false;
  try {
    const ownerId = await getOwnerId();
    if (ownerId) jobs = await listLocalJobs(ownerId);
  } catch {
    storageUnavailable = true;
  }

  return <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-5xl"><header className="flex items-center justify-between border-b border-line pb-6"><div><p className="text-lg font-bold text-ink">任务列表</p><p className="mt-1 text-sm text-muted">你的 Excel 批量分析任务</p></div><Link href="/" className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:text-brand">返回首页</Link></header>
    {storageUnavailable ? <section className="mt-10 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">本地任务存储暂时不可用，请检查 data 目录权限。</section> : jobs.length === 0 ? <section className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-panel"><p className="text-base font-semibold text-ink">暂无批量任务</p><p className="mt-2 text-sm text-muted">上传 Excel 并开始分析后，任务会显示在这里。</p></section> : <div className="mt-8 overflow-x-auto rounded-xl border border-line bg-white shadow-panel"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-line bg-slate-50 text-xs text-muted"><tr><th className="px-5 py-4 font-medium">文件名</th><th className="px-5 py-4 font-medium">记录数</th><th className="px-5 py-4 font-medium">成功 / 失败</th><th className="px-5 py-4 font-medium">状态</th><th className="px-5 py-4 font-medium">创建时间</th><th className="px-5 py-4 font-medium">任务</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id} className="border-b border-line last:border-0"><td className="max-w-64 truncate px-5 py-4 font-medium text-ink">{job.filename}</td><td className="px-5 py-4 text-muted">{job.total_rows}</td><td className="px-5 py-4 text-muted">{job.success_rows} / {job.failed_rows}</td><td className="px-5 py-4"><Status status={job.status} /></td><td className="px-5 py-4 text-muted">{new Date(job.created_at).toLocaleString("zh-CN")}</td><td className="px-5 py-4"><Link className="font-semibold text-brand hover:underline" href={`/jobs/${job.id}`}>查看任务</Link></td></tr>)}</tbody></table></div>}
  </div></main>;
}

function Status({ status }: { status: string }) {
  const labels: Record<string, string> = { uploading: "上传中", queued: "排队中", processing: "处理中", paused: "已暂停", completed: "已完成", failed: "失败", cancelled: "已取消" };
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{labels[status] ?? status}</span>;
}
