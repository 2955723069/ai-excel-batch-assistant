import { jevResultSchema, type ExtractedData, type JevResult } from "@/schemas/analysis";

const DEFAULT_TIMEOUT_MS = 30_000;

export class JevApiError extends Error {
  constructor(message = "Jev 服务暂时不可用。", public readonly cause?: unknown) {
    super(message);
    this.name = "JevApiError";
  }
}

type JevResponse = { result?: unknown } | unknown;

export async function requestJevDecision(input: ExtractedData): Promise<JevResult> {
  const apiKey = process.env.JEV_API_KEY?.trim();
  const baseUrl = process.env.JEV_BASE_URL?.trim();

  if (!apiKey || !baseUrl) {
    throw new JevApiError("Jev 服务尚未配置。");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ extracted_data: input }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("Jev request failed", {
        status: response.status,
        body: body.slice(0, 500),
        baseUrl,
      });
      throw new JevApiError();
    }

    const payload = (await response.json()) as JevResponse;
    const candidate = isRecord(payload) && "result" in payload ? payload.result : payload;
    const parsed = jevResultSchema.safeParse(candidate);
    if (!parsed.success) {
      console.error("Jev returned invalid result", {
        issues: parsed.error.issues.map((issue) => ({ path: issue.path, code: issue.code })),
      });
      throw new JevApiError("Jev 返回结果格式无效。");
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof JevApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new JevApiError("Jev 请求超时。", error);
    }
    console.error("Jev request error", error instanceof Error ? error.message : "unknown error");
    throw new JevApiError(undefined, error);
  } finally {
    clearTimeout(timeout);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
