import { describe, expect, it } from "vitest"
import { rotaDoLink } from "../lib/nativo/link"

describe("links do app", () => {
  it("converte o esquema nativo e a origem HTTPS configurada", () => {
    expect(
      rotaDoLink(
        "bivaque://app/pergunta/123?origem=grupo#resposta",
        "https://bivaque.example.invalid",
      ),
    ).toBe("/pergunta/123?origem=grupo#resposta")
    expect(
      rotaDoLink("https://bivaque.example.invalid/app/entrar", "https://bivaque.example.invalid"),
    ).toBe("/entrar")
    expect(rotaDoLink("bivaque://app", undefined)).toBe("/")
  })
  it("recusa origens e caminhos externos ao app", () => {
    for (const link of [
      "bivaque://outro/entrar",
      "https://outro.invalid/app/entrar",
      "https://bivaque.example.invalid/aplicativo",
      "bivaque://app//outro.invalid",
      "bivaque://app/%2e%2e/entrar",
      "não é URL",
    ]) {
      expect(rotaDoLink(link, "https://bivaque.example.invalid")).toBeNull()
    }
    expect(rotaDoLink("https://bivaque.example.invalid/app/entrar", undefined)).toBeNull()
  })
})
