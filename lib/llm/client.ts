const DEFAULT_TIMEOUT_MS = 60_000;

export class LlmApiError extends Error {
  constructor(message = "LLM 服务暂时不可用。", public readonly cause?: unknown) {
    super(message);
    this.name = "LlmApiError";
  }
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

type ResponsesResponse = {
  output_text?: string | null;
  output?: Array<{ content?: Array<{ text?: string | null }> }>;
};

export async function createChatCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  const model = process.env.LLM_MODEL?.trim();
  const wireApi = process.env.LLM_WIRE_API?.trim() || "chat_completions";
  const useJsonResponseFormat = process.env.LLM_USE_JSON_RESPONSE_FORMAT === "true";

  if (!apiKey || !baseUrl || !model) {
    throw new LlmApiError("LLM 服务尚未配置。");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const isResponsesApi = wireApi === "responses";
    const requestBody = isResponsesApi
      ? {
          model,
          input: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }
      : {
          model,
          temperature: 0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          ...(useJsonResponseFormat ? { response_format: { type: "json_object" } } : {}),
        };

    const endpoint = isResponsesApi ? "/responses" : "/chat/completions";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("LLM request failed", {
        status: response.status,
        body: errorBody.slice(0, 500),
        baseUrl,
        model,
      });
      throw new LlmApiError();
    }

    const payload = (await response.json()) as ChatCompletionResponse & ResponsesResponse;
    const content = isResponsesApi
      ? payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("")
      : payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new LlmApiError();
    }
    return content;
  } catch (error) {
    if (error instanceof LlmApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new LlmApiError("LLM 请求超时。", error);
    }
    console.error("LLM request error", error instanceof Error ? error.message : "unknown error");
    throw new LlmApiError(undefined, error);
  } finally {
    clearTimeout(timeout);
  }
}
