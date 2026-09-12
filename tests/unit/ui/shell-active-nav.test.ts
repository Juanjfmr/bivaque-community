import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  resolveActiveNav,
  SECONDARY_SELF_ROUTES,
} from "../../../apps/web/app/components/shell/active-nav"

const root = join(import.meta.dirname, "..", "..", "..")
const appShell = join(root, "apps", "web", "app", "components", "bivaque", "app-shell.tsx")
const bottomNav = join(root, "apps", "web", "app", "components", "bivaque", "bottom-nav.tsx")

// Espelha NAV_ITEMS de bottom-nav.tsx. O teste abaixo lê o arquivo e confere
// cada href, então mudar a navegação real sem a fixture aqui falha alto.
const PRIMARY = [
  { id: "inicio", href: "/inicio" },
  { id: "explorar", href: "/explorar" },
  { id: "comunidades", href: "/communities" },
  { id: "perfil", href: "/profile" },
]

describe("resolveActiveNav deriva o item ativo da rota", () => {
  it("/salvos acende Salvos, nunca Perfil — o defeito do RECON-038", () => {
    expect(resolveActiveNav("/salvos", PRIMARY)).toEqual({
      kind: "secondary",
      href: "/salvos",
    })
  })

  it("/salvos/... também acende Salvos", () => {
    expect(resolveActiveNav("/salvos/abc", PRIMARY)).toEqual({
      kind: "secondary",
      href: "/salvos",
    })
  })

  it("cada container primário acende a si mesmo", () => {
    expect(resolveActiveNav("/inicio", PRIMARY)).toEqual({ kind: "primary", id: "inicio" })
    expect(resolveActiveNav("/explorar", PRIMARY)).toEqual({ kind: "primary", id: "explorar" })
    expect(resolveActiveNav("/explorar/servicos", PRIMARY)).toEqual({
      kind: "primary",
      id: "explorar",
    })
    expect(resolveActiveNav("/communities", PRIMARY)).toEqual({
      kind: "primary",
      id: "comunidades",
    })
    expect(resolveActiveNav("/profile", PRIMARY)).toEqual({ kind: "primary", id: "perfil" })
  })

  it("preserva o fallback DS-011: pessoais caem em Perfil, o resto em Início", () => {
    expect(resolveActiveNav("/messages", PRIMARY)).toEqual({ kind: "primary", id: "perfil" })
    expect(resolveActiveNav("/notifications", PRIMARY)).toEqual({
      kind: "primary",
      id: "perfil",
    })
    expect(resolveActiveNav("/denuncias/nova", PRIMARY)).toEqual({ kind: "primary", id: "perfil" })
    expect(resolveActiveNav("/ajuda", PRIMARY)).toEqual({ kind: "primary", id: "perfil" })
    expect(resolveActiveNav("/desconhecida", PRIMARY)).toEqual({ kind: "primary", id: "inicio" })
  })

  it("só /salvos é destino secundário que acende a si mesmo", () => {
    expect([...SECONDARY_SELF_ROUTES]).toEqual(["/salvos"])
  })
})

describe("app-shell usa o resolvedor e não reintroduz o fallback por vizinhança", () => {
  it("chama resolveActiveNav", () => {
    expect(readFileSync(appShell, "utf8")).toContain("resolveActiveNav(pathname, NAV_ITEMS)")
  })

  it("não trata /salvos como rota pessoal que cai em Perfil", () => {
    expect(readFileSync(appShell, "utf8")).not.toContain('pathname.startsWith("/salvos")')
  })
})

describe("a fixture do teste acompanha a navegação real", () => {
  it("todo href de primary existe em bottom-nav.tsx", () => {
    const source = readFileSync(bottomNav, "utf8")
    for (const item of PRIMARY) {
      expect(source).toContain(`href: "${item.href}"`)
    }
  })
})
