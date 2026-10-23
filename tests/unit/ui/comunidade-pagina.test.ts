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

// A Comunidade depois do lote 5, tarefa N2 (ADR-20261023): sem feed, sem a
// vista "Conversa" e sem linha de publicar. LIMITE: leitura de fonte; o
// comportamento em navegador é provado pelos e2e (inicio-sem-feed,
// audience-selector, empty-locality, two-localities) e pela captura da tela.

const root = join(import.meta.dirname, "..", "..", "..")
const web = (...segments: string[]) =>
  readFileSync(join(root, "apps", "web", "app", ...segments), "utf8")

const page = stripComments(web("(shell)", "community", "page.tsx"))
const homeLoaders = stripComments(web("(shell)", "inicio", "home-loaders.ts"))
const composer = stripComments(web("components", "bivaque", "feed-post-create.tsx"))

describe("página da Comunidade", () => {
  it("segue a ordem: quem é a comunidade, indicações", () => {
    const jsx = page.slice(page.indexOf("<CommunityHeader"))
    const order = ["<CommunityHeader", "<IndicationsPanel"].map((marker) => jsx.indexOf(marker))
    for (const position of order) expect(position).toBeGreaterThan(-1)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it("a vista Conversa saiu: nenhum feed, nenhuma aba, nenhum trilho", () => {
    // O Início também não ganhou feed: na cidade a conversa é de perguntas e
    // respostas, e publicar só existe dentro de um grupo.
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
  it("saiu da Comunidade: a publicação acontece pelo compositor, dentro de um grupo", () => {
    // A linha de publicar da Comunidade foi removida no lote 5 N2. O compositor
    // continua existindo (shell e Início o abrem) e publica só em grupo.
    expect(page).not.toContain("FeedComposer")
    expect(page).not.toContain("onOpenModal")
    expect(composer).toContain('initialAttachment')
    expect(composer).toContain("Publicar")
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

describe("o Início não lê feed", () => {
  it("nenhuma leitura de publicações da cidade no Início", () => {
    // Lote 5, N2: a leitura `feed_locality` que a versão anterior usava nem
    // chegou ao banco — a migration 20261024100000 passou a recusar publicação
    // sem grupo, e sem publicação de cidade não há feed de cidade.
    expect(homeLoaders).not.toContain("feed_locality")
    expect(homeLoaders).not.toContain("feed_community")
    expect(homeLoaders).not.toContain("feed_following")
    expect(homeLoaders).not.toContain("loadCityFeed")
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
  // contagens. O detalhe da comunidade nunca pede o feed inteiro.
  it("o detalhe da comunidade nunca pede o feed inteiro", () => {
    expect(homeLoaders).not.toContain(".range(")
    const detail = web("(shell)", "communities", "[id]", "community-detail-loaders.ts")
    expect(detail).toContain("p_limit: COMMUNITY_DETAIL_FEED")
  })
})
