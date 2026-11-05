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
