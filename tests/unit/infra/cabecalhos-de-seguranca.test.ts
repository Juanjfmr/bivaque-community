import { describe, expect, it } from "vitest"
import nextConfig from "../../../apps/web/next.config"

// SEC-007: nenhuma resposta do Next pode ser emoldurada por outro site. O teste
// lê a configuração real (a que o servidor aplica), não o texto do arquivo.

describe("cabeçalhos de segurança do Next", () => {
  it("toda rota responde com frame-ancestors 'none' e X-Frame-Options DENY", async () => {
    expect(typeof nextConfig.headers).toBe("function")
    const regras = await nextConfig.headers?.()
    const todas = regras?.find((regra) => regra.source === "/:path*")
    expect(todas, "precisa haver uma regra para todas as rotas").toBeDefined()
    const porNome = Object.fromEntries(
      (todas?.headers ?? []).map((cabecalho) => [cabecalho.key.toLowerCase(), cabecalho.value]),
    )
    expect(porNome["content-security-policy"]).toBe("frame-ancestors 'none'")
    expect(porNome["x-frame-options"]).toBe("DENY")
    expect(porNome["x-content-type-options"]).toBe("nosniff")
    expect(porNome["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(porNome["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    )
    expect(porNome["cross-origin-opener-policy"]).toBe("same-origin")
    expect(porNome["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains")
  })

  it("aplica CSP est?tica ao app", async () => {
    const regras = await nextConfig.headers?.()
    const app = regras?.find((regra) => regra.source === "/app/:path*")
    const csp = app?.headers.find((cabecalho) => cabecalho.key === "Content-Security-Policy")?.value
    expect(csp).toContain("script-src 'self';")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain("nonce-")
  })

  it("nenhuma regra afrouxa o enquadramento para um caminho específico", async () => {
    const regras = (await nextConfig.headers?.()) ?? []
    for (const regra of regras) {
      for (const cabecalho of regra.headers) {
        if (cabecalho.key.toLowerCase() === "x-frame-options") expect(cabecalho.value).toBe("DENY")
        if (cabecalho.key.toLowerCase() === "content-security-policy") {
          expect(cabecalho.value).toContain("frame-ancestors 'none'")
        }
      }
    }
  })
})
