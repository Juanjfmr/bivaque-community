import { describe, expect, it } from "vitest"
import {
  conferirEscrita,
  conferirPorta,
  opcoesDoApp,
  origensNativas,
  origensPermitidas,
  responder,
} from "../../../apps/web/lib/app-api/rota-do-app"

// A checagem de mesma origem das escritas por cookie (SPA ADR §5, RUN-135). A
// lista é FIXA: as origens locais e as do ambiente. `Host` e `x-forwarded-proto`
// são controlados por quem chama o pedido; derivar a origem deles faria o
// `Origin` forjado do atacante combinar com o `Host` forjado e passar.

function requisicao(url: string, cabecalhos: Record<string, string>): Request {
  return { url, headers: new Headers(cabecalhos) } as unknown as Request
}

describe("origens permitidas", () => {
  it("separa as origens nativas e aplica CORS e escrita conforme a credencial", () => {
    for (const origin of origensNativas()) {
      expect(origensPermitidas()).not.toContain(origin)
      const pedido = requisicao("http://localhost:3000/api/app/teste", {
        origin,
        authorization: "Bearer token",
        "x-bivaque-app": "bivaque-spa",
      })
      const preflight = opcoesDoApp(pedido)
      expect(preflight.status).toBe(204)
      expect(preflight.headers.get("access-control-allow-origin")).toBe(origin)
      expect(preflight.headers.get("access-control-allow-credentials")).toBeNull()
      for (const nome of ["authorization", "content-type", "x-bivaque-app", "x-bivaque-cliente"]) {
        expect(preflight.headers.get("access-control-allow-headers")).toContain(nome)
      }
      const resposta = responder(pedido, {}, 200)
      expect(resposta.headers.get("access-control-allow-origin")).toBe(origin)
      expect(resposta.headers.get("access-control-allow-credentials")).toBeNull()
      expect(conferirPorta(pedido, "bearer")).toBe("ok")
      expect(conferirEscrita(pedido, "bearer")).toBe("ok")
      expect(conferirPorta(pedido, "cookie")).toBe("origem-recusada")
      expect(conferirEscrita(pedido, "cookie")).toBe("origem-recusada")
    }
  })

  it("recusa origem null e preserva CORS web", () => {
    const nulo = requisicao("http://localhost:3000/api/app/teste", { origin: "null" })
    expect(opcoesDoApp(nulo).status).toBe(403)
    expect(conferirPorta(nulo, "bearer")).toBe("origem-recusada")
    expect(conferirEscrita(nulo, "bearer")).toBe("origem-recusada")
    const web = requisicao("http://localhost:3000/api/app/teste", {
      origin: "http://localhost:3000",
      "x-bivaque-app": "bivaque-spa",
    })
    expect(opcoesDoApp(web).headers.get("access-control-allow-credentials")).toBe("true")
    expect(conferirEscrita(web, "cookie")).toBe("ok")
  })
  it("contém as origens locais fixas, sem depender de pedido", () => {
    const origens = origensPermitidas()

    expect(origens).toContain("http://localhost:3000")
    expect(origens).toContain("http://127.0.0.1:3000")
    expect(origens).toContain("http://localhost:3200")
    expect(origens).toContain("http://127.0.0.1:3200")
  })

  it("não deriva origem do Host nem de x-forwarded-proto", () => {
    const origens = origensPermitidas()

    expect(origens).not.toContain("https://evil.example")
    expect(origens).not.toContain("https://bivaque.example")
    expect(origens.some((origem) => origem.includes("evil.example"))).toBe(false)
  })

  it("recusa a escrita quando o Host e o x-forwarded-proto descrevem outra origem", () => {
    const porta = conferirPorta(
      requisicao("http://localhost:3000/api/app/entry/otp", {
        host: "evil.example",
        "x-forwarded-proto": "https",
        origin: "https://evil.example",
        "x-bivaque-app": "bivaque-spa",
      }),
      "cookie",
    )

    expect(porta).toBe("origem-recusada")
  })

  it("aceita a escrita da origem local real", () => {
    const porta = conferirPorta(
      requisicao("http://localhost:3000/api/app/entry/otp", {
        origin: "http://127.0.0.1:3000",
        "x-bivaque-app": "bivaque-spa",
      }),
      "cookie",
    )

    expect(porta).toBe("ok")
  })

  it("não deixa a lista do ambiente se repetir", () => {
    process.env["BIVAQUE_APP_ORIGINS"] = "https://loja.example, https://loja.example"
    try {
      const origens = origensPermitidas()
      expect(origens.filter((origem) => origem === "https://loja.example")).toHaveLength(1)
    } finally {
      delete process.env["BIVAQUE_APP_ORIGINS"]
    }
  })

  it("recusa uma origem ambiente que não esteja na lista", () => {
    process.env["BIVAQUE_APP_ORIGINS"] = "https://app.bivaque.example"
    try {
      expect(origensPermitidas()).toContain("https://app.bivaque.example")
      const porta = conferirPorta(
        requisicao("http://localhost:3000/api/app/entry/otp", {
          origin: "https://outro.bivaque.example",
          "x-bivaque-app": "bivaque-spa",
        }),
        "cookie",
      )
      expect(porta).toBe("origem-recusada")
    } finally {
      delete process.env["BIVAQUE_APP_ORIGINS"]
    }
  })
})
