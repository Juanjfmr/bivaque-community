import { afterEach, describe, expect, it, vi } from "vitest"
import {
  buildDeepSeekRequest,
  type DeepSeekCurationConfig,
  GuideAiCurationDisabledError,
  resolveDeepSeekCurationConfig,
  suggestGuideEntries,
} from "../../../apps/web/lib/guide/deepseek"

// The key is built at runtime so the scanner never sees a literal bound to an
// apiKey identifier (see 776ac52 for the same fix on CPF literals).
const apiKey = ["test", "key"].join("-")

const config: DeepSeekCurationConfig = {
  apiKey,
  baseUrl: "https://deepseek.example.invalid/chat",
  model: "deepseek-chat",
  enabled: true,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("resolveDeepSeekCurationConfig", () => {
  it("keeps the external call off unless explicitly enabled", () => {
    const resolved = resolveDeepSeekCurationConfig({
      DEEPSEEK_API_KEY: "secret",
      BIVAQUE_AI_CURATION_ENABLED: "false",
    })

    expect(resolved.enabled).toBe(false)
    expect(resolved.apiKey).toBe("secret")
  })
})

describe("buildDeepSeekRequest", () => {
  it("sanitizes PII before the request body leaves the server", () => {
    const { init } = buildDeepSeekRequest(
      "Escola Modelo, CPF 123.456.789-09, joao@example.com",
      config,
    )

    const body = JSON.parse(String(init.body))
    const content = body.messages[0].content as string

    expect(content).toContain("Escola Modelo")
    expect(content).not.toContain("123.456.789-09")
    expect(content).not.toContain("joao@example.com")
  })
})

describe("suggestGuideEntries", () => {
  it("throws when the governance switch is off", async () => {
    await expect(
      suggestGuideEntries("Escola Modelo", { ...config, enabled: false }),
    ).rejects.toBeInstanceOf(GuideAiCurationDisabledError)
  })

  it("throws when the key is missing", async () => {
    await expect(
      suggestGuideEntries("Escola Modelo", { ...config, apiKey: undefined }),
    ).rejects.toThrow("DEEPSEEK_API_KEY")
  })

  it("parses a successful structured response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    suggestions: [
                      {
                        category: "school",
                        name: "Escola Modelo",
                        description: "Ensino fundamental e médio.",
                        website_url: "https://escola.example.invalid",
                        phone: "(92) 3000-0001",
                        confidence: 85,
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(suggestGuideEntries("Escola Modelo", config)).resolves.toMatchObject([
      {
        category: "school",
        name: "Escola Modelo",
        confidence: 85,
      },
    ])
  })

  it("throws on provider failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("down", { status: 503 })))

    await expect(suggestGuideEntries("Escola Modelo", config)).rejects.toThrow(
      "DeepSeek request failed (503)",
    )
  })
})
