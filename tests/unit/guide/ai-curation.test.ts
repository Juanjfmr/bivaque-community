import { describe, expect, it } from "vitest"
import {
  buildGuideExtractionPrompt,
  parseGuideExtractionResponse,
  sanitizeGuideSource,
} from "../../../apps/web/lib/guide/ai-curation"

describe("sanitizeGuideSource", () => {
  it("removes CPF, CEP and email before a model call", () => {
    const source = [
      "Recomendo a Escola Modelo.",
      "Falar com joao@example.com",
      "CPF 123.456.789-09",
      "CEP 69000-000",
    ].join(" ")

    const sanitized = sanitizeGuideSource(source)

    expect(sanitized).not.toContain("joao@example.com")
    expect(sanitized).not.toContain("123.456.789-09")
    expect(sanitized).not.toContain("69000-000")
    expect(sanitized).toContain("Escola Modelo")
  })
})

describe("buildGuideExtractionPrompt", () => {
  it("keeps useful content and constrains the output contract", () => {
    const prompt = buildGuideExtractionPrompt("Escola Modelo, fone (92) 3000-0001")

    expect(prompt).toContain("Escola Modelo")
    expect(prompt).toContain("(92) 3000-0001")
    expect(prompt).toContain("suggestions")
    expect(prompt).toContain("school|hospital|transporter|courier")
  })
})

describe("parseGuideExtractionResponse", () => {
  it("parses a valid suggestion and normalizes confidence", () => {
    const parsed = parseGuideExtractionResponse(
      JSON.stringify({
        suggestions: [
          {
            category: "school",
            name: "Escola Modelo",
            description: "Ensino fundamental e médio.",
            website_url: "https://escola.example.invalid",
            phone: "(92) 3000-0001",
            confidence: 101,
          },
        ],
      }),
    )

    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({
      category: "school",
      name: "Escola Modelo",
      website_url: "https://escola.example.invalid",
      phone: "(92) 3000-0001",
      confidence: 100,
    })
  })

  it("rejects invalid categories and malformed JSON", () => {
    expect(parseGuideExtractionResponse("{not json")).toEqual([])
    expect(
      parseGuideExtractionResponse(
        JSON.stringify({ suggestions: [{ category: "hamburguer", name: "X" }] }),
      ),
    ).toEqual([])
  })
})
