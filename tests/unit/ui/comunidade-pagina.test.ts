import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  appendPage,
  FEED_PAGE_SIZE,
  hasMoreAfter,
  pageParams,
} from "../../../apps/web/app/(shell)/community/feed-pages"
import { stripComments } from "./source-scan"

// A Comunidade e o feed da cidade depois do lote 5, tarefa N2 (ADR-20261023).
// LIMITE: leitura de fonte; o comportamento em navegador é provado pelos e2e
// (inicio-feed-cidade, audience-selector, empty-locality, two-localities) e pela
// captura da tela.

const root = join(import.meta.dirname, "..", "..", "..")
const web = (...segments: string[]) =>
  readFileSync(join(root, "apps", "web", "app", ...segments), "utf8")

const page = stripComments(web("(shell)", "community", "page.tsx"))
const composer = web("components", "bivaque", "feed-composer.tsx")
const cityFeed = web("(shell)", "inicio", "city-feed.tsx")
const homeLoaders = web("(shell)", "inicio", "home-loaders.ts")

describe("página da Comunidade", () => {
  it("segue a ordem: quem é a comunidade, publicar, indicações", () => {
    const jsx = page.slice(page.indexOf("<CommunityHeader"))
    const order = ["<CommunityHeader", "<FeedComposer", "<IndicationsPanel"].map((marker) =>
      jsx.indexOf(marker),
    )
    for (const position of order) expect(position).toBeGreaterThan(-1)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it("a vista Conversa saiu: nenhum feed, nenhuma aba, nenhum trilho", () => {
    // O feed da cidade mora no Início (leitura nova `feed_locality`); não há
    // duas telas com o mesmo feed nem uma aba "Conversa" a manter.
    expect(page).not.toContain("Conversa")
    expect(page).not.toContain("<Tabs")
    expect(page).not.toContain("FeedPost")
    expect(page).not.toContain("feed_community")
    expect(page).not.toContain("feed_right_rail")
    expect(page).not.toContain("FeedRightRail")
  })

  it("não usa style inline nem o controle de ordem antigo", () => {
    expect(page).not.toContain("style={{")
    expect(page).not.toContain("ToggleButton")
  })

  it("sem comunidade, o convite a entrar vem antes do painel", () => {
    const jsx = page.slice(page.indexOf("<JoinCommunityCard />"))
    expect(page).toContain('primary.status === "none" ? <JoinCommunityCard />')
    expect(jsx.indexOf("<IndicationsPanel")).toBeGreaterThan(jsx.indexOf("<JoinCommunityCard />"))
  })

  it("leitura de comunidade que falha vira estado de erro recuperável", () => {
    // Renderizar lista vazia (ou a tela sem cabeçalho) no lugar de uma consulta
    // que falhou é o bug que a casa proíbe.
    expect(page).toContain("<ErrorState")
    expect(page).toContain("onRetry={loadPrimary}")
  })
})

describe("linha de publicar", () => {
  it("tem o campo, o atalho de link e o botão Publicar", () => {
    expect(composer).toContain('onOpenModal("link")')
    expect(composer).toContain('aria-label="Nova publicação com link"')
    expect(composer).toMatch(/>\s*Publicar\s*</)
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

describe("o feed da cidade no Início", () => {
  it("lê a cidade pela função paginada do banco, com p_limit/p_offset", () => {
    expect(homeLoaders).toContain('rpc("feed_locality"')
    expect(homeLoaders).toContain("...pageParams(offset)")
    expect(cityFeed).toContain("appendPage")
    expect(cityFeed).toContain("hasMoreAfter")
  })

  it("as duas abas: a cidade (feed_locality) e o que a pessoa acompanha", () => {
    expect(cityFeed).toContain("loadCityFeed")
    expect(cityFeed).toContain("loadFollowedFeed")
    expect(homeLoaders).toContain('rpc("feed_following")')
  })

  it("chegar ao fim carrega sozinho, e o botão fica para teclado e falha", () => {
    expect(cityFeed).toContain("new IntersectionObserver(")
    expect(cityFeed).toContain('"Carregar mais"')
    expect(cityFeed).toContain("Não foi possível carregar mais publicações.")
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
  // contagens. Nem o feed da cidade nem o detalhe da comunidade pedem o feed
  // inteiro.
  it("o feed da cidade e o detalhe da comunidade nunca pedem o feed inteiro", () => {
    expect(homeLoaders).toContain("pageParams(offset)")
    expect(homeLoaders).not.toContain(".range(")
    const detail = web("(shell)", "communities", "[id]", "community-detail-loaders.ts")
    expect(detail).toContain("p_limit: COMMUNITY_DETAIL_FEED")
  })
})
