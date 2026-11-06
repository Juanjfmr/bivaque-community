import { readdirSync } from "node:fs"
import { join } from "node:path"
import { getRedirectStatus } from "next/dist/lib/redirect-status"
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match"
import { matchHas, prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination"
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { ROTAS } from "../../../apps/app/lib/navegacao/rotas"
import nextConfig from "../../../apps/web/next.config"
import { routeFromFile } from "../../e2e/helpers/crawl-model"

const ID = "41000000-0000-4000-8000-000000000051"
const ORIGEM = "https://bivaque.example.invalid"
const TROCADAS = [
  ["/messages", "/app/conversas"],
  [`/messages?conversation=${ID}`, `/app/conversa/${ID}?conversation=${ID}`],
  [`/messages/${ID}`, `/app/conversa/${ID}`],
  [`/mercado/${ID}`, `/app/anuncio/${ID}`],
  [`/imoveis/${ID}`, `/app/anuncio/${ID}`],
  ["/pedidos", "/app/pedidos"],
  [`/pedidos/${ID}`, `/app/pedido/${ID}`],
  [`/prestadores/${ID}`, `/app/negocio/${ID}`],
  ["/configuracoes/bloqueados", "/app/bloqueados"],
  ["/configuracoes/familia", "/app/voce"],
  ["/inicio", "/app/inicio"],
  ["/explorar", "/app/busca"],
] as const

// Mesmos matchers do resolve-routes do Next, sem servidor. O helper experimental
// instalado perde as capturas de `has`, impedindo testar conversation pelo helper.
async function resolver(caminho: string) {
  const url = new URL(caminho, ORIGEM)
  const query = Object.fromEntries(url.searchParams)
  for (const regra of (await nextConfig.redirects?.()) ?? []) {
    const parametros = getPathMatch(regra.source)(url.pathname)
    if (!parametros) continue
    const condicoes = matchHas(new NextRequest(url), query, regra.has, regra.missing)
    if (!condicoes) continue
    const { newUrl, parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: regra.destination,
      params: { ...parametros, ...condicoes },
      query,
    })
    const destino = new URL(newUrl, ORIGEM)
    for (const [chave, valor] of Object.entries(parsedDestination.query)) {
      for (const item of Array.isArray(valor) ? valor : [valor]) {
        if (item !== undefined) destino.searchParams.append(chave, item)
      }
    }
    return Response.redirect(destino, getRedirectStatus(regra))
  }
  return new Response()
}

describe("LAN-TROCA fase 1", () => {
  it.each(TROCADAS)("%s preserva ID e query em 307 para %s, sem ciclo", async (de, para) => {
    const separador = de.includes("?") ? "&" : "?"
    const resposta = await resolver(`${de}${separador}origem=aviso&texto=ol%C3%A1`)
    expect(resposta.status).toBe(307)
    const destino = new URL(resposta.headers.get("location") ?? "", ORIGEM)
    const esperado = new URL(para, ORIGEM)
    expect(destino.pathname).toBe(esperado.pathname)
    expect(destino.searchParams.get("origem")).toBe("aviso")
    expect(destino.searchParams.get("texto")).toBe("olá")
    for (const [chave, valor] of esperado.searchParams) {
      expect(destino.searchParams.get(chave)).toBe(valor)
    }
    expect(
      (await resolver(`${destino.pathname}${destino.search}`)).headers.get("location"),
    ).toBeNull()
    expect(
      ROTAS.some((rota) => `/app${rota.caminho.replace("$id", ID)}` === destino.pathname),
    ).toBe(true)
  })

  it.each(["", "nao-e-uuid", `${ID}/editar`, `https://fora.example.invalid/${ID}`])(
    "conversation=%s inválido fica na caixa e não vira caminho",
    async (valor) => {
      const resposta = await resolver(`/messages?conversation=${encodeURIComponent(valor)}`)
      expect(resposta.status).toBe(307)
      expect(new URL(resposta.headers.get("location") ?? "", ORIGEM).pathname).toBe(
        "/app/conversas",
      )
    },
  )

  const shell = join(process.cwd(), "apps/web/app/(shell)")
  const paginas = readdirSync(shell, { recursive: true, encoding: "utf8" })
    .filter((arquivo) => arquivo.replaceAll("\\", "/").endsWith("/page.tsx"))
    .map((arquivo) => routeFromFile(arquivo).replace(/\[[^\]]+\]/g, ID))
  const trocadas = new Set(TROCADAS.map(([de]) => de.split("?")[0]))

  it.each(paginas.filter((caminho) => !trocadas.has(caminho)))(
    "%s continua na web, inclusive criação, edição e demais jornadas",
    async (caminho) => {
      expect((await resolver(caminho)).headers.get("location")).toBeNull()
      expect((await resolver(`${caminho}?q=teste`)).headers.get("location")).toBeNull()
      expect((await resolver(`${caminho}/`)).headers.get("location")).toBeNull()
    },
  )

  it.each(["/", "/api/app/pedidos", "/auth/callback", "/consent", "/admissions", "/prestador"])(
    "%s mantém seu portão ou fluxo próprio",
    async (caminho) => {
      expect((await resolver(caminho)).headers.get("location")).toBeNull()
    },
  )
})
