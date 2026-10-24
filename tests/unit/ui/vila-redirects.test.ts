import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  COMMUNITY_HREF,
  VILA_LEGACY_PATHS,
  vilaRedirectFor,
} from "../../../apps/web/app/components/shell/vila-redirects"

// Lote 5, tarefa N1 (ADR-20261023-comunidade-do-prototipo, "Navegação e
// estrutura"): vila não existe nesta versão. As rotas antigas redirecionam para
// a Comunidade da cidade por uma LISTA FECHADA no código, nunca por um caminho
// vindo da URL. LIMITE: leitura de fonte para a fiação das rotas; o
// comportamento em navegador é provado pelo e2e (lote5-vila-redirect).

const root = join(import.meta.dirname, "..", "..", "..")
const web = (...segments: string[]) =>
  readFileSync(join(root, "apps", "web", "app", ...segments), "utf8")

describe("lista fechada das rotas de vila", () => {
  it("é exatamente o conjunto esperado, nada além", () => {
    expect([...VILA_LEGACY_PATHS]).toEqual([
      "/communities",
      "/communities/[id]",
      "/communities/[id]/invite",
      "/communities/[id]/indicar-prestador",
      "/communities/[id]/admin",
      "/communities/[id]/admin/media",
      "/communities/[id]/admin/moderators",
      "/communities/[id]/admin/pending",
      "/communities/[id]/admin/providers",
      "/invite/[token]",
    ])
  })

  it("cada caminho da lista leva à Comunidade da cidade (positivo)", () => {
    for (const path of VILA_LEGACY_PATHS) {
      expect(vilaRedirectFor(path)).toBe("/community")
    }
    expect(COMMUNITY_HREF).toBe("/community")
  })

  it("recusa qualquer caminho fora da lista (negativo)", () => {
    // Um destino que aceitasse a URL seria open redirect. A função só responde
    // pela lista fechada; todo o resto lança.
    for (const forbidden of [
      "/community",
      "/",
      "/admin",
      "/communities/../profile",
      "https://evil.example/community",
      "/communities?to=/profile",
      "",
    ]) {
      expect(() => vilaRedirectFor(forbidden)).toThrow()
    }
  })
})

describe("as rotas antigas de vila redirecionam na fonte", () => {
  const sources: Array<{ file: string; path: string }> = [
    { file: "(shell)/communities/page.tsx", path: "/communities" },
    { file: "(shell)/communities/[id]/page.tsx", path: "/communities/[id]" },
    { file: "(shell)/communities/[id]/invite/page.tsx", path: "/communities/[id]/invite" },
    {
      file: "(shell)/communities/[id]/indicar-prestador/page.tsx",
      path: "/communities/[id]/indicar-prestador",
    },
    { file: "(owner)/communities/[id]/admin/layout.tsx", path: "/communities/[id]/admin" },
    { file: "(shell)/invite/[token]/page.tsx", path: "/invite/[token]" },
  ]

  it.each(sources)("$file redireciona com a lista fechada", ({ file, path }) => {
    const source = web(...file.split("/"))
    expect(source).toContain("redirect(")
    expect(source).toContain(`vilaRedirectFor("${path}")`)
    // O destino nunca vem da URL: nenhuma dessas rotas lê searchParams.
    expect(source).not.toContain("searchParams")
  })
})
