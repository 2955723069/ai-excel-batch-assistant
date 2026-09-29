import Link from "next/link";

export default function AnalysisPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-line pb-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-ink">AI销售雷达</Link>
          <Link href="/" className="text-sm font-semibold text-brand hover:text-blue-700">返回首页</Link>
        </header>
        <section className="py-14">
          <div className="mb-8">
            <p className="text-sm font-semibold text-brand">分析结果</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">客户销售情报</h1>
            <p className="mt-3 text-sm leading-6 text-muted">这里将展示 AI 提取的客户事实、Jev 决策和销售建议。</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[['客户等级', 'A'], ['购买意向指标', '--'], ['下一步动作', '等待分析']].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-white p-5 shadow-sm">
                <p className="text-sm text-muted">{label}</p><p className="mt-3 text-2xl font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-muted">Phase 1 占位页面。完成后端分析流程后，这里会呈现完整结果。</div>
        </section>
      </div>
    </main>
  );
}
