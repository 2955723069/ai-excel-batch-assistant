import { z } from "zod";

const nullableString = z.string().trim().min(1).nullable();

export const extractedDataSchema = z.object({
  customer_type: nullableString,
  company_size: z.number().int().nonnegative().nullable(),
  needs: z.array(z.string().trim().min(1)),
  pain_points: z.array(z.string().trim().min(1)),
  budget: nullableString,
  timeline: nullableString,
  decision_maker: nullableString,
  buying_signals: z.array(z.string().trim().min(1)),
  objections: z.array(z.string().trim().min(1)),
  purchase_stage: nullableString,
  missing_information: z.array(z.string().trim().min(1)),
}).strict();

export const analyzeRequestSchema = z.object({
  conversation: z.string().trim().min(1, "聊天记录不能为空").max(10_000, "聊天记录过长，请分段分析。"),
}).strict();

export type ExtractedData = z.infer<typeof extractedDataSchema>;

export const jevResultSchema = z.object({
  lead_level: z.enum(["A", "B", "C"]),
  priority: z.enum(["high", "medium", "low"]),
  human_required: z.boolean(),
  next_action: z.enum([
    "sales_follow_up",
    "ask_budget",
    "ask_timeline",
    "ask_decision_maker",
    "send_product_material",
    "send_case_study",
    "long_term_nurture",
    "human_review",
  ]),
  reason_codes: z.array(z.string().trim().min(1)),
}).strict();

export type JevResult = z.infer<typeof jevResultSchema>;

export class LlmOutputError extends Error {
  constructor(message = "LLM 返回的数据格式无效。") {
    super(message);
    this.name = "LlmOutputError";
  }
}

export function parseExtractedData(rawContent: string): ExtractedData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(rawContent));
  } catch {
    console.error("LLM returned invalid JSON", rawContent.slice(0, 500));
    throw new LlmOutputError();
  }

  const normalized = normalizeExtractedData(parsed);
  const result = extractedDataSchema.safeParse(normalized);
  if (!result.success) {
    console.error("LLM returned invalid extracted data", {
      issues: result.error.issues.map((issue) => ({ path: issue.path, code: issue.code })),
      content: rawContent.slice(0, 500),
    });
    throw new LlmOutputError();
  }
  return result.data;
}

function normalizeExtractedData(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const source = value;
  const factItems = Array.isArray(source["明确事实"]) ? source["明确事实"] : [];
  const signalItems = Array.isArray(source["有依据的销售信号"]) ? source["有依据的销售信号"] : [];
  const missingItems = Array.isArray(source["缺失信息"]) ? source["缺失信息"] : [];
  const factText = factItems.map(itemText).filter(Boolean);
  const signalText = signalItems.map(itemText).filter(Boolean);

  return {
    customer_type: source.customer_type ?? null,
    company_size: normalizeCompanySize(source.company_size),
    needs: asStringArray(source.needs) ?? factText.filter((item) => /需求|关注|询问/.test(item)),
    pain_points: asStringArray(source.pain_points) ?? [],
    budget: source.budget ?? null,
    timeline: source.timeline ?? null,
    decision_maker: normalizeNullableString(source.decision_maker),
    buying_signals: asStringArray(source.buying_signals) ?? signalText,
    objections: asStringArray(source.objections) ?? [],
    purchase_stage: source.purchase_stage ?? null,
    missing_information: asStringArray(source.missing_information) ?? asStringArray(missingItems) ?? [],
  };
}

function normalizeCompanySize(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string") {
    const matched = value.replaceAll(",", "").match(/\d+/);
    if (matched) {
      return Number(matched[0]);
    }
  }

  return null;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const result = value.trim();
    return result || null;
  }

  if (Array.isArray(value)) {
    const result = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .join("、");
    return result || null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function itemText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (isRecord(value) && typeof value.内容 === "string") return value.内容.trim();
  return "";
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return undefined;
  return value.map((item) => item.trim()).filter(Boolean);
}

function stripJsonFence(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}
