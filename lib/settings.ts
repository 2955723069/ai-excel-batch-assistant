import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type LocalSettings = {
  llm_api_key?: string;
  llm_base_url?: string;
  llm_model?: string;
  llm_wire_api?: "chat_completions" | "responses";
  llm_use_json_response_format?: boolean;
  jev_api_key?: string;
  jev_base_url?: string;
};

export type PublicSettings = Omit<LocalSettings, "llm_api_key" | "jev_api_key"> & {
  llm_api_key_configured: boolean;
  jev_api_key_configured: boolean;
};

export async function readStoredSettings(): Promise<LocalSettings> {
  try { return JSON.parse(await readFile(getSettingsPath(), "utf8")) as LocalSettings; } catch { return {}; }
}

export async function saveLocalSettings(input: LocalSettings): Promise<void> {
  const current = await readStoredSettings();
  const next: LocalSettings = {
    ...current,
    ...input,
    llm_api_key: input.llm_api_key?.trim() || current.llm_api_key,
    jev_api_key: input.jev_api_key?.trim() || current.jev_api_key,
  };
  await mkdir(getJobsDataDir(), { recursive: true });
  const temp = `${getSettingsPath()}.tmp`;
  await writeFile(temp, JSON.stringify(next, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temp, getSettingsPath());
}

export async function getLocalSettings(): Promise<PublicSettings> {
  const settings = await readStoredSettings();
  const { llm_api_key: _llm, jev_api_key: _jev, ...publicSettings } = settings;
  return { ...publicSettings, llm_api_key_configured: Boolean(_llm), jev_api_key_configured: Boolean(_jev) };
}

export async function getRuntimeSettings() {
  const stored = await readStoredSettings();
  return {
    llm_api_key: stored.llm_api_key || process.env.LLM_API_KEY || "",
    llm_base_url: stored.llm_base_url || process.env.LLM_BASE_URL || "",
    llm_model: stored.llm_model || process.env.LLM_MODEL || "",
    llm_wire_api: stored.llm_wire_api || process.env.LLM_WIRE_API || "chat_completions",
    llm_use_json_response_format: stored.llm_use_json_response_format ?? process.env.LLM_USE_JSON_RESPONSE_FORMAT === "true",
    jev_api_key: stored.jev_api_key || process.env.JEV_API_KEY || "",
    jev_base_url: stored.jev_base_url || process.env.JEV_BASE_URL || "",
  };
}

function getSettingsPath() { return path.join(getJobsDataDir(), "settings.json"); }
function getJobsDataDir() { return process.env.JOBS_DATA_DIR?.trim() || path.join(process.cwd(), "data"); }
