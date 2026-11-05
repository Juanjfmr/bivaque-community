import { describe, expect, it } from "vitest"
import { origensPermitidas } from "../../../apps/web/lib/app-api/rota-do-app"

// A checagem de mesma origem das escritas por cookie (SPA ADR §5). O Next pode
// normalizar o host do `url` para `localhost` mesmo quando o navegador abriu
// `127.0.0.1`; por isso a lista também lê o `Host` que a plataforma entregou.

function requisicao(url: string, cabecalhos: Record<string, string>): Request {
  return { url, headers: new Headers(cabecalhos) } as unknown as Request
}

describe("origens permitidas", () => {
  it("inclui a origem do pedido e a do Host real", () => {
    const origens = origensPermitidas(
      requisicao("http://localhost:3000/api/app/entry/otp", {
        host: "127.0.0.1:3000",
      }),
    )
    expect(origens).toContain("http://localhost:3000")
    expect(origens).toContain("http://127.0.0.1:3000")
  })

  it("usa o esquema da borda quando há x-forwarded-proto", () => {
    const origens = origensPermitidas(
      requisicao("http://localhost:3000/api/app/entry/otp", {
        host: "bivaque.example",
        "x-forwarded-proto": "https",
      }),
    )
    expect(origens).toContain("https://bivaque.example")
  })

  it("sem Host, vale só a origem do pedido e a lista do ambiente", () => {
    const origens = origensPermitidas(
      requisicao("https://app.bivaque.example/api/app/entry/otp", {}),
    )
    expect(origens).toEqual(["https://app.bivaque.example"])
  })

  it("não deixa a lista do ambiente se repetir", () => {
    process.env["BIVAQUE_APP_ORIGINS"] = "https://loja.example, https://loja.example"
    try {
      const origens = origensPermitidas(
        requisicao("https://app.bivaque.example/api", { host: "app.bivaque.example" }),
      )
      expect(origens.filter((origem) => origem === "https://loja.example")).toHaveLength(1)
    } finally {
      delete process.env["BIVAQUE_APP_ORIGINS"]
    }
  })
})
