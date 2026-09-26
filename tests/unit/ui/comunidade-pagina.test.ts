import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  appendPage,
  FEED_PAGE_SIZE,
  hasMoreAfter,
  pageParams,
} from "../../../apps/web/app/(shell)/community/feed-pages"
import { sectionFeed } from "../../../apps/web/app/(shell)/community/feed-sections"

// A Comunidade refeita no sistema visual mínimo (25/09/2026). LIMITE: leitura
// de fonte; o comportamento em navegador foi provado pela captura da mesma
// rodada (375 e 1440) e pelos E2E que publicam a partir desta página.

const root = join(import.meta.dirname, "..", "..", "..")
const web = (...segments: string[]) =>
  readFileSync(join(root, "apps", "web", "app", ...segments), "utf8")

const page = web("(shell)", "community", "page.tsx")
const composer = web("components", "bivaque", "feed-composer.tsx")
const rail = web("components", "bivaque", "feed-right-rail.tsx")

describe("página da Comunidade", () => {
  it("segue a ordem: quem é a comunidade, vistas, publicar, abas, publicações", () => {
    const jsx = page.slice(page.indexOf("<CommunityHeader"))
    const order = [
      "<CommunityHeader",
      "<CommunityViewSwitch",
      "<FeedComposer",
      'aria-label="Ordenar publicações"',
      "<FeedRailDisclosure",
      "<FeedPost",
    ].map((marker) => jsx.indexOf(marker))
    for (const position of order) expect(position).toBeGreaterThan(-1)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it("as abas de ordem ficam presas ao topo enquanto se lê", () => {
    expect(page).toMatch(/className="sticky top-0[^"]*"/)
    expect(page).toContain('aria-label="Ordenar publicações"')
  })

  it("não usa style inline nem o controle de ordem antigo", () => {
    expect(page).not.toContain("style={{")
    expect(page).not.toContain("ToggleButton")
  })

  it("sem comunidade, o convite a entrar vem antes da referência da cidade", () => {
    const noCommunity = page.slice(page.indexOf("!primaryCommunityId && !error"))
    expect(noCommunity.indexOf("<JoinCommunityCard />")).toBeLessThan(
      noCommunity.indexOf("<CityReference"),
    )
  })
})

// ADR-20260925-memoria-de-indicacoes: a conversa corre, as indicações ficam.
describe("vistas da comunidade", () => {
  const viewSwitch = web("(shell)", "community", "view-switch.tsx")

  it("Conversa e Indicações, com a vista na URL", () => {
    expect(page).toContain('readCommunityView(searchParams.get("vista"))')
    expect(viewSwitch).toContain('return vista === "indicacoes" ? "indicacoes" : "conversa"')
    expect(viewSwitch).toContain('"/community?vista=indicacoes"')
  })

  it("com ou sem comunidade, a vista Indicações mostra o painel da cidade do membro", () => {
    const panels = page.match(/<IndicationsPanel\s+localityId=\{current\.id\}/g) ?? []
    expect(panels.length).toBe(2)
    expect(page.match(/<CommunityViewSwitch view=\{view\} \/>/g)?.length).toBe(2)
  })
})

describe("linha de publicar", () => {
  it("tem o campo, o atalho de link e o botão Publicar", () => {
    expect(composer).toContain('onOpenModal("link")')
    expect(composer).toContain('aria-label="Nova publicação com link"')
    expect(composer).toMatch(/>\s*Publicar\s*</)
  })
})

describe("trilho da Comunidade", () => {
  it("cada encontro e cada grupo leva à sua página", () => {
    expect(rail).toContain("href={`/events/${event.id}` as Route}")
    expect(rail).toContain("href={`/groups/${group.id}` as Route}")
  })

  it("leitura que falha diz que falhou, não 'nenhum evento'", () => {
    expect(rail).toContain("failed: Boolean(eventsResult.error || groupsResult.error)")
    expect(rail).toContain("Não foi possível carregar os encontros.")
  })
})

describe("feed dividido no tempo", () => {
  const NOW = new Date("2026-09-25T15:00:00")
  const post = (id: string, iso: string) => ({ id, created_at: iso })

  it("com visita anterior: novas desde então e anteriores", () => {
    const span = { since: new Date("2026-09-24T12:00:00"), until: NOW }
    const sections = sectionFeed(
      [post("a", "2026-09-25T10:00:00"), post("b", "2026-09-20T10:00:00")],
      NOW,
      span,
    )
    expect(sections.map((s) => [s.label, s.posts.map((p) => p.id)])).toEqual([
      ["Novas desde a sua última visita", ["a"]],
      ["Anteriores", ["b"]],
    ])
    expect(sections.map((s) => Boolean(s.showCount))).toEqual([true, false])
  })

  it("sem visita anterior: hoje, esta semana e mais antigas, sem seção vazia", () => {
    const sections = sectionFeed(
      [
        post("hoje", "2026-09-25T09:00:00"),
        post("semana", "2026-09-22T09:00:00"),
        post("antiga", "2026-09-01T09:00:00"),
      ],
      NOW,
      null,
    )
    expect(sections.map((s) => s.label)).toEqual(["Hoje", "Esta semana", "Mais antigas"])
  })

  it("uma seção só não ganha rótulo", () => {
    const sections = sectionFeed([post("x", "2026-09-25T09:00:00")], NOW, null)
    expect(sections).toEqual([{ label: null, posts: [post("x", "2026-09-25T09:00:00")] }])
  })

  it("só a ordem Recentes se divide no tempo", () => {
    expect(page).toContain('sortOrder === "recent"')
    expect(page).toContain("sectionFeed(visiblePosts, now, novelty)")
  })
})

describe("cabeçalho da comunidade", () => {
  const header = web("(shell)", "community", "community-header.tsx")
  it("tem capa, descrição, fileira de membros, Convidar e Sobre", () => {
    expect(header).toContain("data.bannerUrl ?")
    expect(header).toContain("data.description ?")
    expect(header).toContain("<MemberStack")
    expect(header).toContain("/invite` as Route")
    expect(header).toMatch(/>\s*Sobre\s*</)
  })
})

describe("feed em páginas", () => {
  it("pede 20 por vez à própria função (p_limit / p_offset)", () => {
    expect(FEED_PAGE_SIZE).toBe(20)
    expect(pageParams(0)).toEqual({ p_limit: 20, p_offset: 0 })
    expect(pageParams(20)).toEqual({ p_limit: 20, p_offset: 20 })
  })

  it("junta a página nova sem repetir o que já está na tela", () => {
    const merged = appendPage([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }])
    expect(merged.map((post) => post.id)).toEqual(["a", "b", "c"])
  })

  it("página curta é o fim; página cheia sugere mais", () => {
    expect(hasMoreAfter(20)).toBe(true)
    expect(hasMoreAfter(7)).toBe(false)
  })

  // Migration 20260925213256: a página é escolhida DENTRO da função, antes das
  // contagens. Nenhum dos três leitores pede o feed inteiro.
  it("a página, a prévia do Início e o detalhe nunca pedem o feed inteiro", () => {
    expect(page.match(/\.rpc\("feed_community"/g)?.length).toBe(2)
    expect(page.match(/\.\.\.pageParams\(/g)?.length).toBe(2)
    expect(page).not.toContain(".range(")
    expect(web("(shell)", "inicio", "home-loaders.ts")).toContain("p_limit: COMMUNITY_PREVIEW_READ")
    const detail = web("(shell)", "communities", "[id]", "community-detail-loaders.ts")
    expect(detail).toContain("p_limit: COMMUNITY_DETAIL_FEED")
  })

  it("chegar ao fim carrega sozinho, e o botão fica para teclado e falha", () => {
    expect(page).toContain("new IntersectionObserver(")
    expect(page).toContain('"Carregar mais"')
    expect(page).toContain("Não foi possível carregar mais publicações.")
  })
})
