// RUN-004 / O06 — `/community` deixou de ser tela: é encaminhamento.
//
// A regra de destino é pura e mora em `legacy-target.ts` justamente para ser
// auditável sem navegador. Aqui ficam as duas metades da propriedade:
//   1. todo valor de `?post=` termina em destino interno conhecido — nenhum
//      parâmetro estranho pode virar feed alheio, porque não há feed;
//   2. a página não voltou a renderizar nada (o feed legado não pode regressar
//      por descuido numa refatoração futura).
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  LEGACY_COMMUNITY_HOME,
  legacyCommunityTarget,
} from "web/app/(shell)/community/legacy-target"

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8")

const VALID_UUID = "71000000-0000-4000-8000-000000000001"

/** Todo destino é caminho interno: nada de host, protocolo ou `//`. */
function expectInternalPath(path: string) {
  expect(path.startsWith("/")).toBe(true)
  expect(path.startsWith("//")).toBe(false)
  expect(path).not.toMatch(/^[a-z]+:/i)
  expect(path).not.toMatch(/\\/)
}

describe("legacyCommunityTarget", () => {
  it("sem parâmetro, encaminha ao início", () => {
    for (const absent of [undefined, null]) {
      const target = legacyCommunityTarget(absent)
      expect(target).toEqual({ kind: "inicio", path: LEGACY_COMMUNITY_HOME })
    }
  })

  it("com UUID canônico, encaminha ao detalhe estável da publicação", () => {
    const target = legacyCommunityTarget(VALID_UUID)
    expect(target).toEqual({ kind: "publicacao", path: `/inicio?post=${VALID_UUID}` })
    expectInternalPath(target.path)
  })

  it("canonicaliza a caixa: o mesmo registro tem um endereço só", () => {
    expect(legacyCommunityTarget(VALID_UUID.toUpperCase()).path).toBe(`/inicio?post=${VALID_UUID}`)
  })

  it("aceita espaço em volta do id sem inventar rota nova", () => {
    expect(legacyCommunityTarget(`  ${VALID_UUID}  `).path).toBe(`/inicio?post=${VALID_UUID}`)
  })

  it("vazio, repetido, malformado ou hostil termina no início", () => {
    const values: Array<string | string[]> = [
      "",
      "   ",
      "\t\n",
      "abc",
      "123",
      VALID_UUID.slice(0, -1),
      `${VALID_UUID}0`,
      VALID_UUID.replace(/-/g, ""),
      "not-a-uuid-but-exactly-36-chars.....",
      "'; drop table posts; --",
      "../../../etc/passwd",
      "/%2e%2e/%2e%2e",
      "//exemplo.invalid",
      "https://exemplo.invalid/publicacoes/1",
      "javascript:alert(1)",
      // `?post=a&post=b`: escolher um dos dois seria arbitrar qual link a pessoa
      // abriu, então o parâmetro repetido não é um id.
      [VALID_UUID, "71000000-0000-4000-8000-000000000002"],
      [],
      ["", VALID_UUID],
    ]
    for (const value of values) {
      const target = legacyCommunityTarget(value)
      expect(target, JSON.stringify(value)).toEqual({
        kind: "inicio",
        path: LEGACY_COMMUNITY_HOME,
      })
      expectInternalPath(target.path)
    }
  })
})

describe("a rota /community não tem superfície de renderização", () => {
  const page = read("apps", "web", "app", "(shell)", "community", "page.tsx")

  it("é componente de servidor que só encaminha", () => {
    expect(page).not.toContain('"use client"')
    expect(page).toContain("redirect(")
    expect(page).toContain("legacyCommunityTarget")
    // Nenhuma bifurcação de JSX: encaminhar não é escolher o que desenhar.
    expect(page).not.toMatch(/return\s*\(/)
  })

  it("não importa o feed legado nem cliente de navegador", () => {
    for (const legacy of [
      "FeedPost",
      "FeedComposer",
      "FeedRightRail",
      "CityReference",
      "createBrowserClient",
      "CreatePostModal",
      "useSearchParams",
    ]) {
      expect(page, legacy).not.toContain(legacy)
    }
  })
})
