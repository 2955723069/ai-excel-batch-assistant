import { createChatCompletion } from "@/lib/llm/client";

export type SalesAdvice = { follow_up_advice: string[]; recommended_questions: string[]; follow_up_message: string };

export async function generateSalesAdvice(conversation: string, extracted: unknown, decision: unknown): Promise<SalesAdvice> {
  const raw = await createChatCompletion(
    "你是一名专业B2B销售顾问。只根据输入事实生成可执行建议，不编造信息，不保证成交。严格输出JSON：{\"follow_up_advice\":[],\"recommended_questions\":[],\"follow_up_message\":\"\"}",
    `原始聊天：${conversation}\n提取事实：${JSON.stringify(extracted)}\n决策：${JSON.stringify(decision)}`,
  );
  const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "").trim()) as Partial<SalesAdvice>;
  if (!Array.isArray(parsed.follow_up_advice) || !Array.isArray(parsed.recommended_questions) || typeof parsed.follow_up_message !== "string") throw new Error("Advisor JSON invalid");
  return { follow_up_advice: parsed.follow_up_advice.filter((v): v is string => typeof v === "string"), recommended_questions: parsed.recommended_questions.filter((v): v is string => typeof v === "string"), follow_up_message: parsed.follow_up_message };
}
