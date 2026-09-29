"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Settings = { llm_base_url: string; llm_model: string; llm_wire_api: "chat_completions" | "responses"; llm_use_json_response_format: boolean; jev_base_url: string; llm_api_key_configured: boolean; jev_api_key_configured: boolean };

const emptySettings: Settings = { llm_base_url: "", llm_model: "", llm_wire_api: "chat_completions", llm_use_json_response_format: false, jev_base_url: "", llm_api_key_configured: false, jev_api_key_configured: false };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [llmKey, setLlmKey] = useState("");
  const [jevKey, setJevKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { void fetch("/api/settings").then((response) => response.json()).then((data: Settings) => setSettings({ ...emptySettings, ...data })).catch(() => setError("设置读取失败。")); }, []);

  async function save() {
    setSaving(true); setError(""); setMessage("");
    const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...settings, llm_api_key: llmKey || undefined, jev_api_key: jevKey || undefined }) });
    const data = await response.json() as { settings?: Settings; error?: string };
    if (!response.ok) setError(data.error ?? "保存失败。"); else { setSettings({ ...settings, ...(data.settings ?? {}) }); setLlmKey(""); setJevKey(""); setMessage("设置已保存，后续任务会使用新配置。"); }
    setSaving(false);
  }

  return <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-3xl"><header className="flex items-center justify-between border-b border-line pb-6"><div><p className="text-lg font-bold text-ink">本地设置</p><p className="mt-1 text-sm text-muted">配置模型服务，密钥只保存在本机服务端</p></div><Link href="/" className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:text-brand">返回首页</Link></header><section className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-panel sm:p-8"><h1 className="text-xl font-bold text-ink">LLM 配置</h1><div className="mt-6 grid gap-5"><Field label="LLM Base URL" value={settings.llm_base_url} placeholder="https://api.example.com/v1" onChange={(value) => setSettings({ ...settings, llm_base_url: value })} /><Field label="模型名称" value={settings.llm_model} placeholder="deepseek-chat" onChange={(value) => setSettings({ ...settings, llm_model: value })} /><Field label={`LLM API Key${settings.llm_api_key_configured ? "（已配置，留空保持不变）" : ""}`} value={llmKey} type="password" placeholder={settings.llm_api_key_configured ? "已保存，输入新值可替换" : "请输入 API Key"} onChange={setLlmKey} /><label className="space-y-2 text-sm font-medium text-ink"><span>接口协议</span><select value={settings.llm_wire_api} onChange={(event) => setSettings({ ...settings, llm_wire_api: event.target.value as Settings["llm_wire_api"] })} className="w-full rounded-lg border border-line px-3 py-2.5"><option value="chat_completions">Chat Completions</option><option value="responses">Responses</option></select></label><label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={settings.llm_use_json_response_format} onChange={(event) => setSettings({ ...settings, llm_use_json_response_format: event.target.checked })} />请求 JSON 输出格式</label></div><h2 className="mt-10 text-xl font-bold text-ink">Jev 配置</h2><div className="mt-6 grid gap-5"><Field label="Jev Base URL" value={settings.jev_base_url} placeholder="https://your-jev-endpoint/decision" onChange={(value) => setSettings({ ...settings, jev_base_url: value })} /><Field label={`Jev API Key${settings.jev_api_key_configured ? "（已配置，留空保持不变）" : ""}`} value={jevKey} type="password" placeholder={settings.jev_api_key_configured ? "已保存，输入新值可替换" : "请输入 API Key"} onChange={setJevKey} /></div>{error && <p className="mt-6 text-sm font-medium text-red-600" role="alert">{error}</p>}{message && <p className="mt-6 text-sm font-medium text-emerald-700" role="status">{message}</p>}<button type="button" disabled={saving} onClick={() => void save()} className="mt-8 w-full rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "保存中…" : "保存设置"}</button><p className="mt-4 text-xs leading-5 text-muted">API Key 不会返回到浏览器，也不会写入日志。请勿把 data/settings.json 提交到 Git。</p></section></div></main>;
}

function Field({ label, value, placeholder, onChange, type = "text" }: { label: string; value: string; placeholder: string; onChange: (value: string) => void; type?: string }) { return <label className="space-y-2 text-sm font-medium text-ink"><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand focus:ring-4 focus:ring-blue-100" /></label>; }
