import { NextResponse } from "next/server";
import { extractConversationFacts } from "@/lib/llm/extractor";
import { analyzeRequestSchema, LlmOutputError } from "@/schemas/analysis";
import { LlmApiError } from "@/lib/llm/client";
import { decideLead } from "@/lib/jev/decision";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = analyzeRequestSchema.safeParse(body);
    if (!input.success) {
      const message = input.error.issues[0]?.message ?? "请输入有效的聊天记录。";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const extractedData = await extractConversationFacts(input.data.conversation);
    const jevResult = await decideLead(extractedData);
    return NextResponse.json({ extracted_data: extractedData, jev_result: jevResult });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
    }
    if (error instanceof LlmOutputError) {
      return NextResponse.json({ error: "AI 返回结果格式异常，请稍后重试。" }, { status: 502 });
    }
    if (error instanceof LlmApiError) {
      const message = error.message === "LLM 请求超时。"
        ? error.message
        : error.message === "LLM 服务尚未配置。"
          ? "AI 分析服务未正确配置，请检查服务器环境变量。"
          : "AI 分析服务暂时不可用，请稍后重试。";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json({ error: "分析失败，请稍后重试。" }, { status: 500 });
  }
}
