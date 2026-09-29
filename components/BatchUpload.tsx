"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

type Preview = { filename: string; size: number; total: number; columns: string[] };

export default function BatchUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [conversationColumn, setConversationColumn] = useState("");
  const [customerIdColumn, setCustomerIdColumn] = useState("");
  const [customerNameColumn, setCustomerNameColumn] = useState("");
  const [busy, setBusy] = useState(false);

  async function validateAndPreview(nextFile: File | undefined) {
    setError("");
    setPreview(null);
    setFile(null);
    if (!nextFile) return;
    const extension = `.${nextFile.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ACCEPTED_EXTENSIONS.includes(extension)) return setError("文件格式不支持，请上传 .xlsx、.xls 或 .csv 文件。");
    if (nextFile.size > MAX_FILE_SIZE) return setError("文件过大，请上传不超过 10 MB 的文件。");

    setFile(nextFile);
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", nextFile);
      const response = await fetch("/api/jobs/preview", { method: "POST", body: form });
      const result = await response.json() as Preview & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "文件解析失败，请重试。");
      setPreview(result);
      setConversationColumn(findColumn(result.columns, ["conversation", "chat", "聊天记录", "对话"]));
      setCustomerIdColumn(findColumn(result.columns, ["customer_id", "customerid", "客户id", "客户编号"]));
      setCustomerNameColumn(findColumn(result.columns, ["customer_name", "customername", "客户名称", "客户姓名"]));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "文件解析失败，请重试。");
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void validateAndPreview(event.dataTransfer.files[0]);
  }

  async function startBatch() {
    if (!file || !preview) return setError("请先上传并解析 Excel 文件。");
    if (!conversationColumn) return setError("请选择包含客户聊天记录的列。");
    setError("");
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("templateId", "sales-lead");
      form.set("conversationColumn", conversationColumn);
      form.set("customerIdColumn", customerIdColumn);
      form.set("customerNameColumn", customerNameColumn);
      const response = await fetch("/api/jobs", { method: "POST", body: form });
      const result = await response.json() as { job_id?: string; error?: string };
      if (!response.ok || !result.job_id) throw new Error(result.error ?? "任务创建失败，请稍后重试。");
      router.push(`/jobs/${result.job_id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "任务创建失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-6">
    <label htmlFor="batch-file" onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${dragging ? "border-brand bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-brand hover:bg-blue-50/50"}`}><span className="mb-3 text-3xl" aria-hidden="true">↑</span><span className="text-base font-semibold text-ink">拖拽 Excel 到这里</span><span className="mt-2 text-sm text-muted">支持 .xlsx、.xls、.csv，最多 1000 条记录</span><span className="mt-4 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink">选择文件</span><input id="batch-file" type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => void validateAndPreview(event.target.files?.[0])} /></label>
    <label className="block space-y-2 text-sm font-medium text-ink"><span>分析模板</span><select disabled className="w-full rounded-lg border border-line bg-slate-50 px-3 py-2.5 text-ink"><option>AI销售线索批量分析</option></select></label>
    {file && <div className="rounded-xl border border-line bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="break-all font-semibold text-ink">{file.name}</p><p className="mt-1 text-xs text-muted">{formatBytes(file.size)}{preview ? ` · ${preview.total} 条记录` : " · 正在解析"}</p></div><span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">{preview ? "已解析" : "解析中"}</span></div></div>}
    {preview && <div className="grid gap-4 sm:grid-cols-3"><ColumnSelect label="聊天记录字段" value={conversationColumn} columns={preview.columns} onChange={setConversationColumn} required /><ColumnSelect label="客户 ID（可选）" value={customerIdColumn} columns={preview.columns} onChange={setCustomerIdColumn} /><ColumnSelect label="客户名称（可选）" value={customerNameColumn} columns={preview.columns} onChange={setCustomerNameColumn} /></div>}
    <p className="text-xs leading-5 text-muted">请勿上传身份证号、银行卡号、密码等敏感信息。</p>
    {error && <p className="text-sm font-medium text-red-600" role="alert">{error}</p>}
    <button type="button" disabled={busy} onClick={() => void startBatch()} className="w-full rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-60">{busy ? "正在处理…" : "开始批量分析"}</button>
  </div>;
}

function ColumnSelect({ label, value, columns, onChange, required = false }: { label: string; value: string; columns: string[]; onChange: (value: string) => void; required?: boolean }) {
  return <label className="space-y-2 text-sm font-medium text-ink"><span>{label}{required && <span className="ml-1 text-red-500">*</span>}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-line bg-white px-3 py-2.5 outline-none focus:border-brand focus:ring-4 focus:ring-blue-100"><option value="">请选择字段</option>{columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>;
}

function findColumn(columns: string[], candidates: string[]) {
  return columns.find((column) => candidates.includes(column.trim().toLowerCase().replaceAll(" ", ""))) ?? "";
}

function formatBytes(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(2)} MB`; }
