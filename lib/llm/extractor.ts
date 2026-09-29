import { createChatCompletion } from "@/lib/llm/client";
import { parseExtractedData, type ExtractedData } from "@/schemas/analysis";

const extractionSystemPrompt = `你是一名专业的B2B销售情报分析助手。

你的任务是从客户与销售的聊天记录中提取客观销售情报。

你必须区分：
1. 明确事实
2. 有依据的销售信号
3. 缺失信息

禁止编造信息。不要判断客户最终是否会购买，也不要输出客户等级或成交概率。
只能输出以下英文字段，禁止使用中文键名：customer_type、company_size、needs、pain_points、budget、timeline、decision_maker、buying_signals、objections、purchase_stage、missing_information。
没有相关信息时使用 null，列表没有内容时使用空数组。
不要输出 Markdown 或额外解释。`;

export async function extractConversationFacts(conversation: string): Promise<ExtractedData> {
  const rawContent = await createChatCompletion(
    extractionSystemPrompt,
    `请从以下聊天记录提取事实，并严格输出 JSON：\n\n${conversation}`,
  );
  return parseExtractedData(rawContent);
}
