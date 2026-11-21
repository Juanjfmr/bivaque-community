import { describe, expect, it, vi } from "vitest"

// NAV-002: o Mercado do app tem um endereço só (`/app/mercado`, com a aba na
// busca). Link antigo da web chega ao destino final num salto: se a regra
// mandasse para `/app/imoveis`, o app faria um segundo redirecionamento.
//
// O Sentry não roda no teste; a configuração crua é que interessa.
vi.mock("@sentry/nextjs", () => ({ withSentryConfig: (config: unknown) => config }))

const { nextConfig } = await import("../next.config")

const ENDERECOS_ANTIGOS = ["/app/desapegos", "/app/catalogo", "/app/imoveis"]

type Regra = { readonly source: string; readonly destination: string }

async function regras(): Promise<readonly Regra[]> {
  const redirects = nextConfig.redirects
  if (redirects === undefined) throw new Error("a web não declara redirecionamentos")
  return (await redirects()) as readonly Regra[]
}

describe("redirecionamentos da web para o Mercado (NAV-002)", () => {
  it("o link de imóveis leva ao Mercado na aba Imóveis, num salto só", async () => {
    const lista = await regras()
    const imoveis = lista.filter((regra) => regra.source === "/imoveis")
    expect(imoveis).toHaveLength(1)
    expect(imoveis[0]?.destination).toBe("/app/mercado?aba=imoveis")

    const imovelNovo = lista.filter((regra) => regra.source === "/imoveis/novo")
    expect(imovelNovo).toHaveLength(1)
    expect(imovelNovo[0]?.destination).toBe("/app/mercado?aba=imoveis")
  })

  it("nenhuma regra manda para um endereço antigo do Mercado", async () => {
    const lista = await regras()
    const destinos = lista.map((regra) => regra.destination)
    for (const antigo of ENDERECOS_ANTIGOS) {
      expect(destinos.includes(antigo), `${antigo} ainda é destino de regra`).toBe(false)
    }
    // A tela de alertas é endereço próprio e continua chegando direto.
    expect(destinos.includes("/app/imoveis/alertas")).toBe(true)
  })
})
