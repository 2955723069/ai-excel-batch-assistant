import Link from "next/link";
import BatchUpload from "@/components/BatchUpload";

export default function HomePage() {
  return <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-5xl">
    <header className="flex items-center justify-between border-b border-line pb-6"><div><p className="text-lg font-bold tracking-tight text-ink">AI批量办公助手</p><p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-muted">AI-powered Batch Office Assistant</p></div><Link href="/jobs" className="hidden rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-blue-300 hover:text-brand sm:inline-flex">任务列表</Link></header>
    <section className="grid gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-16"><div className="max-w-xl"><p className="mb-4 text-sm font-semibold text-brand">批量处理重复工作</p><h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">上传 Excel，让 AI 自动批量处理销售线索。</h1><p className="mt-6 max-w-lg text-base leading-7 text-muted">一次上传客户聊天记录，系统将逐条生成销售优先级分析和后续建议，最终导出一份结果 Excel。</p><div className="mt-8 flex flex-wrap gap-3 text-sm text-muted"><span className="rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">最多 1000 条</span><span className="rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">支持后台任务</span><span className="rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">结果可下载</span></div></div><section className="rounded-2xl border border-line bg-white p-5 shadow-panel sm:p-7" aria-labelledby="upload-heading"><div className="mb-5"><h2 id="upload-heading" className="text-lg font-bold text-ink">AI销售线索批量分析</h2><p className="mt-1 text-sm text-muted">上传包含客户聊天记录的 Excel 文件</p></div><BatchUpload /></section></section>
    <footer className="border-t border-line py-6 text-xs leading-6 text-muted">分析结果用于销售优先级辅助判断，不代表真实成交概率或成交承诺。</footer>
  </div></main>;
}
