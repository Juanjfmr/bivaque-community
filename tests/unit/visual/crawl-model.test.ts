import { describe, expect, it } from "vitest"
import {
  buildPatterns,
  Frontier,
  internalTarget,
  matchRoute,
  routeFromFile,
  staleAllowances,
  unreachedRoutes,
} from "../../e2e/helpers/crawl-model"

// O rastreador só é tão bom quanto este modelo: se uma rota real não casa, todo link para ela
// vira "quebrado"; se um href externo passa por interno, o crawler sai do app.

const PAGES = [
  "page.tsx",
  "(shell)/pedidos/page.tsx",
  "(shell)/pedidos/novo/page.tsx",
  "(shell)/pedidos/[id]/page.tsx",
  "(preauth)/nova-senha/page.tsx",
  "(owner)/communities/[id]/admin/page.tsx",
]
const HANDLERS = ["api/health/route.ts", "auth/callback/route.ts"]

describe("modelo do rastreador de links", () => {
  it("tira os grupos de rota da URL", () => {
    expect(routeFromFile("(shell)/pedidos/[id]/page.tsx")).toBe("/pedidos/[id]")
    expect(routeFromFile("page.tsx")).toBe("/")
    expect(routeFromFile("(owner)\\communities\\[id]\\admin\\page.tsx")).toBe(
      "/communities/[id]/admin",
    )
  })

  it("rota estática vence a dinâmica, e o que não existe não casa", () => {
    const patterns = buildPatterns(PAGES, HANDLERS)
    expect(matchRoute("/pedidos/novo", patterns)?.route).toBe("/pedidos/novo")
    expect(matchRoute("/pedidos/97212ea3", patterns)?.route).toBe("/pedidos/[id]")
    expect(matchRoute("/", patterns)?.route).toBe("/")
    expect(matchRoute("/pedidos/", patterns)?.route).toBe("/pedidos")
    expect(matchRoute("/api/health", patterns)?.kind).toBe("handler")
    expect(matchRoute("/pedidos/1/extra", patterns)).toBeNull()
    expect(matchRoute("/invite", patterns)).toBeNull()
  })

  it("só segue navegação interna", () => {
    const here = "http://127.0.0.1:3211/communities/abc"
    expect(internalTarget("/pedidos?status=open", here)).toBe("/pedidos?status=open")
    expect(internalTarget("invite", here)).toBe("/communities/invite")
    expect(internalTarget("http://127.0.0.1:3211/inicio#x", here)).toBe("/inicio")
    expect(internalTarget("https://gov.br/x", here)).toBeNull()
    expect(internalTarget("mailto:a@b.c", here)).toBeNull()
    expect(internalTarget("#configuracoes", here)).toBeNull()
    expect(internalTarget("javascript:void(0)", here)).toBeNull()
  })

  it("a fila tem teto por rota e não repete visita", () => {
    const frontier = new Frontier(buildPatterns(PAGES, HANDLERS), 2)
    const offer = (target: string) => frontier.offer({ target, from: "/", persona: "m" })
    offer("/pedidos/1")
    offer("/pedidos/1")
    offer("/pedidos/2")
    offer("/pedidos/3")
    expect(offer("/nao-existe")).toBeNull()
    expect(offer("/api/health")?.kind).toBe("handler")
    const queued: string[] = []
    for (let v = frontier.next(); v; v = frontier.next()) queued.push(v.target)
    expect(queued).toEqual(["/pedidos/1", "/pedidos/2"])
  })

  it("rota sem caminho e sem porta declarada é acusada; exceção velha também", () => {
    const patterns = buildPatterns(PAGES, HANDLERS)
    const reached = new Set(["/", "/pedidos", "/pedidos/[id]", "/communities/[id]/admin"])
    const allowed = [
      { route: "/nova-senha", porta: "link do e-mail de recuperação" },
      { route: "/pedidos", porta: "velha: hoje tem link" },
      { route: "/sumiu", porta: "rota removida" },
    ]
    expect(unreachedRoutes(patterns, reached, allowed)).toEqual(["/pedidos/novo"])
    expect(staleAllowances(patterns, reached, allowed)).toEqual(["/pedidos", "/sumiu"])
  })
})
