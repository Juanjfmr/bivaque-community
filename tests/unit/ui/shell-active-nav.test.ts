import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import {
  AREA_CONTAINERS,
  declaredContainerFor,
  livesOutsideShell,
  PRIMARY_CONTAINERS,
  rememberNavigationOrigin,
  resolveActiveNav,
  SECONDARY_SELF_ROUTES,
} from "../../../apps/web/app/components/shell/active-nav"

const root = join(import.meta.dirname, "..", "..", "..")
const appShell = join(root, "apps", "web", "app", "components", "bivaque", "app-shell.tsx")
const bottomNav = join(root, "apps", "web", "app", "components", "bivaque", "bottom-nav.tsx")

// Espelha NAV_ITEMS de bottom-nav.tsx. O teste abaixo lê o arquivo e confere
// cada href, então mudar a navegação real sem a fixture aqui falha alto.
//
// Lote 5, tarefa N1 (ADR-20261023-comunidade-do-prototipo): a barra passa a
// Início / Comunidade / Conversas / Você, como o activeTab() do protótipo.
const PRIMARY = [
  { id: "inicio", href: "/inicio" },
  { id: "comunidade", href: "/community" },
  { id: "conversas", href: "/messages" },
  { id: "voce", href: "/profile" },
]

function isDeclaredContainer(pathname: string): boolean {
  if (declaredContainerFor(pathname) !== null) return true
  if (livesOutsideShell(pathname)) return true
  return SECONDARY_SELF_ROUTES.some((href) => pathname === href || pathname.startsWith(`${href}/`))
}

describe("resolveActiveNav deriva o item ativo da rota", () => {
  it("Salvos acende Você, como no activeTab() do protótipo", () => {
    // O protótipo devolve 'voce' para salvos (navigation.js:54). A entrada
    // secundária da lateral continua existindo como atalho, mas não é mais um
    // destino primário autônomo.
    expect(resolveActiveNav("/salvos", PRIMARY)).toEqual({ kind: "primary", id: "voce" })
    expect(resolveActiveNav("/salvos/abc", PRIMARY)).toEqual({ kind: "primary", id: "voce" })
  })

  it("os destinos compartilhados herdam a última aba raiz e os pessoais ficam fixos", () => {
    expect(resolveActiveNav("/mercado", PRIMARY, "voce")).toEqual({
      kind: "primary",
      id: "voce",
    })
    expect(resolveActiveNav("/salvos", PRIMARY, "inicio")).toEqual({
      kind: "primary",
      id: "voce",
    })
  })

  it("grava a origem em cada entrada e a restaura sem depender da URL", () => {
    const values = new Map<string, string>()
    let currentState: Record<string, unknown> = { __NA: true, marker: "preserved" }
    const replaceState = (state: Record<string, unknown>) => {
      currentState = state
    }
    try {
      vi.stubGlobal("window", {
        history: {
          get state() {
            return currentState
          },
          replaceState,
        },
        sessionStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
        },
      })
      expect(rememberNavigationOrigin("/profile", PRIMARY, null)).toBe("voce")
      expect(currentState).toMatchObject({ bivaqueOrigem: "voce", __NA: true, marker: "preserved" })
      expect(rememberNavigationOrigin("/salvos", PRIMARY, "voce")).toBe("voce")
      const announcement = "/mercado/anuncio-1"
      expect(rememberNavigationOrigin(announcement, PRIMARY, "inicio")).toBe("voce")
      const voceEntry = currentState
      expect(values.get("bivaque:last-navigation-root")).toBe("voce")

      currentState = {}
      expect(rememberNavigationOrigin("/inicio", PRIMARY, "voce")).toBe("inicio")
      currentState = voceEntry
      expect(rememberNavigationOrigin(announcement, PRIMARY, "inicio")).toBe("voce")
      expect(resolveActiveNav(announcement, PRIMARY, "voce")).toEqual({
        kind: "primary",
        id: "voce",
      })

      // Uma entrada inicial sem estado usa a ultima raiz salva.
      currentState = {}
      expect(rememberNavigationOrigin(announcement, PRIMARY, null)).toBe("inicio")
      expect(currentState.bivaqueOrigem).toBe("inicio")

      // Trocar o filtro depois de voltar herda a origem da entrada restaurada,
      // ainda que sessionStorage guarde outra aba raiz.
      values.set("bivaque:last-navigation-root", "voce")
      currentState = { bivaqueOrigem: "inicio" }
      const restoredOrigin = rememberNavigationOrigin(announcement, PRIMARY, "voce")
      expect(restoredOrigin).toBe("inicio")
      currentState = {} // router.replace remove o state ao trocar o filtro
      expect(rememberNavigationOrigin(announcement, PRIMARY, restoredOrigin)).toBe("inicio")
      expect(currentState.bivaqueOrigem).toBe("inicio")

      currentState = voceEntry
      vi.stubGlobal("window", {
        history: {
          get state() {
            return currentState
          },
          replaceState,
        },
        sessionStorage: {
          getItem: () => {
            throw new Error("storage disabled")
          },
          setItem: () => {
            throw new Error("storage disabled")
          },
        },
      })
      expect(rememberNavigationOrigin(announcement, PRIMARY, "inicio")).toBe("voce")
      currentState = {}
      expect(rememberNavigationOrigin("/community", PRIMARY, "inicio")).toBe("comunidade")
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("repõe a origem após router.replace trocar só a busca", () => {
    const source = readFileSync(appShell, "utf8")
    expect(source).toContain("const search = useSearchParams().toString()")
    expect(source).toContain("[origin, pathname, search]")

    let currentState: Record<string, unknown> = { bivaqueOrigem: "inicio" }
    vi.stubGlobal("window", {
      history: {
        get state() {
          return currentState
        },
        replaceState: (state: Record<string, unknown>) => {
          currentState = state
        },
      },
      sessionStorage: { getItem: () => "inicio", setItem: () => undefined },
    })
    try {
      // Next 16 router.replace atualiza a URL sem preservar custom history state.
      currentState = { __NA: true }
      expect(rememberNavigationOrigin("/mercado", PRIMARY, "inicio")).toBe("inicio")
      expect(currentState.bivaqueOrigem).toBe("inicio")
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("cada container primário acende a si mesmo", () => {
    expect(resolveActiveNav("/inicio", PRIMARY)).toEqual({ kind: "primary", id: "inicio" })
    expect(resolveActiveNav("/community", PRIMARY)).toEqual({ kind: "primary", id: "comunidade" })
    expect(resolveActiveNav("/messages", PRIMARY)).toEqual({ kind: "primary", id: "conversas" })
    expect(resolveActiveNav("/profile", PRIMARY)).toEqual({ kind: "primary", id: "voce" })
  })

  it("o Explorar do §7 some da barra: a descoberta acende Início", () => {
    expect(resolveActiveNav("/explorar", PRIMARY)).toEqual({ kind: "primary", id: "inicio" })
    expect(resolveActiveNav("/explorar/servicos", PRIMARY)).toEqual({
      kind: "primary",
      id: "inicio",
    })
  })

  it("mensagens e notificações: Conversas e Você, respectivamente", () => {
    expect(resolveActiveNav("/messages", PRIMARY)).toEqual({ kind: "primary", id: "conversas" })
    expect(resolveActiveNav("/messages/abc", PRIMARY)).toEqual({
      kind: "primary",
      id: "conversas",
    })
    expect(resolveActiveNav("/notifications", PRIMARY)).toEqual({ kind: "primary", id: "voce" })
    expect(resolveActiveNav("/denuncias/nova", PRIMARY)).toEqual({ kind: "primary", id: "voce" })
    expect(resolveActiveNav("/ajuda", PRIMARY)).toEqual({ kind: "primary", id: "voce" })
  })

  it("RECON-042: a área manda, não o último recurso", () => {
    expect(resolveActiveNav("/guide", PRIMARY)).toEqual({ kind: "primary", id: "inicio" })
    expect(resolveActiveNav("/events", PRIMARY)).toEqual({ kind: "primary", id: "inicio" })
    expect(resolveActiveNav("/recommendations", PRIMARY)).toEqual({
      kind: "primary",
      id: "comunidade",
    })
    expect(resolveActiveNav("/configuracoes", PRIMARY)).toEqual({ kind: "primary", id: "voce" })
    for (const section of ["conta", "notificacoes", "familia", "bloqueados"]) {
      expect(resolveActiveNav(`/configuracoes/${section}`, PRIMARY)).toEqual({
        kind: "primary",
        id: "voce",
      })
    }
  })

  it("não elege Início por omissão: rota sem container não acende nada", () => {
    expect(resolveActiveNav("/desconhecida", PRIMARY)).toEqual({ kind: "none" })
    expect(resolveActiveNav("/rota-nova-qualquer", PRIMARY)).toEqual({ kind: "none" })
  })

  it("nenhum destino secundário acende a si mesmo depois do lote 5 N1", () => {
    expect([...SECONDARY_SELF_ROUTES]).toEqual([])
  })
})

describe("app-shell usa o resolvedor e não reintroduz o fallback por vizinhança", () => {
  it("chama resolveActiveNav", () => {
    expect(readFileSync(appShell, "utf8")).toContain(
      "resolveActiveNav(pathname, NAV_ITEMS, origin)",
    )
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

  it("todo id de primary é um container conhecido", () => {
    for (const item of PRIMARY) {
      expect(PRIMARY_CONTAINERS).toContain(item.id)
    }
  })
})

describe("RECON-042, defeito 2 — toda rota do mapa de captura declara container", () => {
  it("nenhuma rota do mapa HEADINGS fica sem container", async () => {
    const { HEADINGS } = await import("../../../scripts/visual/capture.mjs")
    const missing = Object.keys(HEADINGS)
      .map((key) => key.split("?")[0])
      .filter((pathname) => !isDeclaredContainer(pathname))
    expect(missing).toEqual([])
  }, 30000)

  it("toda rota do shell resolve para um container, nunca para nenhum item", async () => {
    const { HEADINGS } = await import("../../../scripts/visual/capture.mjs")
    const undeclaredActive = Object.keys(HEADINGS)
      .map((key) => key.split("?")[0])
      .filter((pathname) => !livesOutsideShell(pathname))
      .filter((pathname) => resolveActiveNav(pathname, PRIMARY).kind === "none")
    expect(undeclaredActive).toEqual([])
  }, 30000)

  it("a área declara o container de cada prefixo conhecido", () => {
    expect(AREA_CONTAINERS.length).toBeGreaterThan(0)
    for (const [prefix, container] of AREA_CONTAINERS) {
      expect(PRIMARY_CONTAINERS).toContain(container)
      expect(prefix.startsWith("/")).toBe(true)
    }
  })

  it("a gestão do negócio do membro pertence ao espaço Você", () => {
    expect(resolveActiveNav("/negocio/catalogo", PRIMARY)).toEqual({
      kind: "primary",
      id: "voce",
    })
  })
})

// As duas barras usam resolveActiveNav. Destinos compartilhados recebem a
// última raiz visitada, como origin em activeTab() do protótipo.
describe("barra inferior do celular usa a mesma regra da lateral", () => {
  const bottomNavSource = readFileSync(bottomNav, "utf8")

  it("resolve a aba pelo active-nav, não por prefixo próprio", () => {
    expect(bottomNavSource).toContain("resolveActiveNav(pathname, items, origin)")
    expect(bottomNavSource).not.toContain(`pathname.startsWith(\`\${item.href}/\`)`)
  })

  it.each([
    ["/community", "comunidade"],
    ["/guide", "inicio"],
    ["/events/abc", "inicio"],
    ["/mercado", "inicio"],
    ["/cidade/abc", "inicio"],
    ["/indicacoes", "comunidade"],
    ["/indicacoes/abc", "comunidade"],
    ["/notifications", "voce"],
    ["/messages/abc", "conversas"],
  ])("%s acende %s", (path, id) => {
    expect(resolveActiveNav(path, PRIMARY)).toEqual({ kind: "primary", id })
  })

  it.each(["/explorar", "/guide", "/events/abc", "/mercado", "/cidade/abc"])(
    "%s herda a última aba raiz",
    (path) => {
      expect(resolveActiveNav(path, PRIMARY, "voce")).toEqual({ kind: "primary", id: "voce" })
    },
  )
})
