import {
  buildGuideExtractionPrompt,
  type GuideExtractionDraft,
  parseGuideExtractionResponse,
} from "./ai-curation"

const DEFAULT_BASE_URL = "https://api.deepseek.com/chat/completions"
const DEFAULT_MODEL = "deepseek-chat"

export interface DeepSeekCurationConfig {
  apiKey: string | undefined
  baseUrl: string
  model: string
  enabled: boolean
}

export class GuideAiCurationDisabledError extends Error {
  constructor() {
    super("curadoria por IA do guia está desligada")
    this.name = "GuideAiCurationDisabledError"
  }
}

export function resolveDeepSeekCurationConfig(
  env: NodeJS.ProcessEnv = process.env,
): DeepSeekCurationConfig {
  return {
    apiKey: env["DEEPSEEK_API_KEY"],
    baseUrl: env["DEEPSEEK_BASE_URL"] ?? DEFAULT_BASE_URL,
    model: env["DEEPSEEK_MODEL"] ?? DEFAULT_MODEL,
    enabled: env["BIVAQUE_AI_CURATION_ENABLED"] === "true",
  }
}

export function buildDeepSeekRequest(
  sourceText: string,
  config: DeepSeekCurationConfig,
): {
  url: string
  init: RequestInit
} {
  return {
    url: config.baseUrl,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: buildGuideExtractionPrompt(sourceText),
          },
        ],
      }),
    },
  }
}

export async function suggestGuideEntries(
  sourceText: string,
  config: DeepSeekCurationConfig = resolveDeepSeekCurationConfig(),
): Promise<GuideExtractionDraft[]> {
  if (!config.enabled) {
    throw new GuideAiCurationDisabledError()
  }
  if (!config.apiKey) {
    throw new Error("DEEPSEEK_API_KEY é obrigatória quando a curadoria por IA está ligada")
  }

  const { url, init } = buildDeepSeekRequest(sourceText, config)
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`DeepSeek request failed (${response.status})`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = payload.choices?.[0]?.message?.content
  if (!content) {
    throw new Error("DeepSeek response missing choices[0].message.content")
  }

  return parseGuideExtractionResponse(content)
}
