import { describe, expect, it, vi } from "vitest"

// NAV-002: o Mercado do app tem um endereço só (`/app/mercado`, com a aba na
// busca). Link antigo da web chega ao destino final num salto: se a regra
// mandasse para `/app/imoveis`, o app faria um segundo redirecionamento.
//
// O Sentry não roda no teste; a configuração crua é que interessa.
vi.mock("@sentry/nextjs", () => ({ withSentryConfig: (config: unknown) => config }))

const { nextConfig } = await import("../next.config")

const ENDERECOS_ANTIGOS = ["/app/desapegos", "/app/catalogo", "/app/imoveis"]

type Regra = { readonly source: string; readonly destination: string; readonly permanent?: boolean }

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

// TROCA-004: a vila sai (redesenho §3.4) — o membro não indica prestador (§6) e o
// painel de quem administrava a vila não existe mais. Os dois endereços respondem
// 307 para telas do app; a query segue pelo Next, porque nenhum destino declara
// query própria e o Next a repassa (provado no resolver de
// tests/unit/infra/lan-troca-redirect.test.ts).
describe("redirecionamentos da vila (TROCA-004)", () => {
  const TELAS_DA_VILA = [
    ["/communities/:id/indicar-prestador", "/app/negocios"],
    ["/communities/:id/admin", "/app/comunidade"],
  ] as const

  it.each(TELAS_DA_VILA)("%s responde 307 e leva a %s", async (source, destination) => {
    const lista = await regras()
    const regra = lista.filter((item) => item.source === source)
    expect(regra, `regra única para ${source}`).toHaveLength(1)
    expect(regra[0]?.destination).toBe(destination)
    // 307, não 308: o endereço pode voltar se o uso real pedir.
    expect(regra[0]?.permanent).toBe(false)
  })

  it("as subrotas do painel caem pela mesma regra, e nada volta para a origem", async () => {
    const lista = await regras()
    const painel = lista.filter((item) => item.source === "/communities/:id/admin/:demais*")
    expect(painel).toHaveLength(1)
    expect(painel[0]?.destination).toBe("/app/comunidade")

    // Ciclo seria uma regra cujo destino é outra origem; nenhum destino da vila é.
    const origens = new Set(lista.map((item) => item.source))
    for (const [, destination] of TELAS_DA_VILA) {
      expect(origens.has(destination), `${destination} é origem de regra`).toBe(false)
    }
  })
})
