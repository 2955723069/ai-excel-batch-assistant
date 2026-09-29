import { NextResponse } from "next/server";
import { z } from "zod";
import { getLocalSettings, saveLocalSettings } from "@/lib/settings";

export const runtime = "nodejs";

const settingsSchema = z.object({
  llm_api_key: z.string().max(500).optional(),
  llm_base_url: z.string().url("LLM URL 格式不正确").or(z.literal("")),
  llm_model: z.string().trim().max(200),
  llm_wire_api: z.enum(["chat_completions", "responses"]),
  llm_use_json_response_format: z.boolean(),
  jev_api_key: z.string().max(500).optional(),
  jev_base_url: z.string().url("Jev URL 格式不正确").or(z.literal("")),
}).strict();

export async function GET() {
  return NextResponse.json(await getLocalSettings());
}

export async function PUT(request: Request) {
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "设置格式不正确。" }, { status: 400 });
  try {
    await saveLocalSettings(parsed.data);
    return NextResponse.json({ settings: await getLocalSettings() });
  } catch (error) {
    console.error("Save local settings failed", { error_type: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "设置保存失败，请检查 data 目录权限。" }, { status: 500 });
  }
}
