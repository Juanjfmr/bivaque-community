import { describe, expect, it, vi } from "vitest"
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
      "bivaque:///app/entrar",
      "bivaque://app:443/entrar",
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
  it("não depende do parser de esquema próprio da WebView", () => {
    const URLOriginal = URL
    class URLDaWebView extends URLOriginal {
      constructor(url: string) {
        if (url.startsWith("bivaque:")) throw new Error("Esquema próprio sem host")
        super(url)
      }
    }
    vi.stubGlobal("URL", URLDaWebView)
    try {
      expect(rotaDoLink("bivaque://app/mercado", undefined)).toBe("/mercado")
      expect(rotaDoLink("bivaque://outro/mercado", undefined)).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
