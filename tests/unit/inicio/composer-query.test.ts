import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { composerQuery } from "web/app/(shell)/inicio/composer-query"

// Decisão do dono (25/09/2026): quem pergunta pelo Início publica, por padrão,
// na comunidade principal da cidade atual — como era antes de o compositor
// virar rota. A mesma escolha vale em /community.

describe("composerQuery", () => {
  it("leva a comunidade principal como público padrão e volta ao Início", () => {
    const params = new URLSearchParams(composerQuery("c-1"))
    expect(params.get("comunidade")).toBe("c-1")
    expect(params.get("origem")).toBe("/inicio")
    expect(params.has("tipo")).toBe(false)
  })

  it("sem comunidade principal pronta não inventa público", () => {
    const params = new URLSearchParams(composerQuery(null))
    expect(params.has("comunidade")).toBe(false)
    expect(params.get("origem")).toBe("/inicio")
  })

  it("a dica de anexo segue como tipo", () => {
    expect(new URLSearchParams(composerQuery("c-1", "link")).get("tipo")).toBe("link")
  })
})

describe("a Home e /community escolhem a mesma comunidade principal", () => {
  const root = join(process.cwd(), "apps", "web", "app", "(shell)")
  const inicio = readFileSync(join(root, "inicio", "page.tsx"), "utf8")
  const community = readFileSync(join(root, "community", "page.tsx"), "utf8")

  it("a Home passa a comunidade principal ao compositor", () => {
    expect(inicio).toContain('primary.status === "ready" ? primary.id : null')
    expect(inicio).toContain("composerQuery(primaryCommunityId, attachment)")
  })

  it("/community usa o loader com filtro de localidade, não a membership mais antiga global", () => {
    expect(community).toContain("loadPrimaryCommunity(supabase, current.id)")
    expect(community).not.toContain('.from("community_memberships")')
  })
})
