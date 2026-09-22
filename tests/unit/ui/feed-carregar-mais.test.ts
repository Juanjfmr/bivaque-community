import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "./source-scan"

// FEED-PAGINACAO-CURSOR — rodada 2 (TELA): as guardas de AUSÊNCIA.
//
// O comportamento (20 cartões, depois 40, sem id repetido; falha que mantém o
// feed; troca de aba que recomeça) é provado por e2e em
// `tests/e2e/feed-pagination.spec.ts`. O que o e2e NÃO pega é o jeito ERRADO de
// fazer a mesma coisa — e aqui o jeito errado é conhecido e tem nome:
//
//   - ROLAGEM INFINITA AUTOMÁTICA (`IntersectionObserver`, listener de `scroll`).
//     É mais fácil de escrever e passa num e2e que só conta cartões, mas cria
//     armadilha de foco e deixa o rodapé inalcançável. O ADR-20260922 escolheu
//     botão; esta é a guarda que impede a volta silenciosa.
//   - o marcador de fim ANTES do fim: "Você está em dia" fixo no fonte, sem
//     depender de haver mais página, era o que a tela dizia com 356 publicações
//     ainda por carregar.
//   - falha da página seguinte que LIMPA a lista (o `set` de reset dentro do
//     caminho de erro), o oposto do que o ADR exige.
//
// LIMITE DESTA PROVA: leitura de fonte, não comportamento. Nenhum navegador foi
// aberto aqui.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")
const strip = (...segments: string[]) => stripComments(read(...segments))

const botao = strip("apps", "web", "app", "components", "bivaque", "feed-load-more.tsx")
const hook = strip("apps", "web", "lib", "feed", "use-feed-pagination.ts")
const loader = strip("apps", "web", "lib", "feed", "feed-page-loader.ts")

const superficie = {
  "/community": strip("apps", "web", "app", "(shell)", "community", "page.tsx"),
  "/inicio": strip("apps", "web", "app", "(shell)", "inicio", "community-section.tsx"),
  "/communities/[id]": strip(
    "apps",
    "web",
    "app",
    "(shell)",
    "communities",
    "[id]",
    "community-detail-screen.tsx",
  ),
}

describe("a página seguinte é pedida por BOTÃO, nunca por rolagem automática", () => {
  it("o controle é um botão real, com rótulo visível de 44 px", () => {
    // Botão de verdade: foco, Enter e Espaço vêm do elemento, não de um handler
    // de teclado reinventado.
    expect(botao).toContain("<Button")
    expect(botao).toContain("onPress={onLoadMore}")
    expect(botao).toContain('FEED_LOAD_MORE_LABEL = "Carregar mais"')
    expect(botao).toContain("min-h-11")
  })

  it("nada observa interseção nem escuta scroll", () => {
    for (const [rota, fonte] of Object.entries(superficie)) {
      expect(fonte, rota).not.toContain("IntersectionObserver")
      expect(fonte, rota).not.toContain("onScroll")
      expect(fonte, rota).not.toMatch(/addEventListener\(\s*["']scroll["']/)
    }
    expect(botao).not.toContain("IntersectionObserver")
    expect(botao).not.toContain("scroll")
  })

  it("as TRÊS superfícies montam o mesmo controle", () => {
    for (const [rota, fonte] of Object.entries(superficie)) {
      expect(fonte, rota).toContain("<FeedLoadMore")
      expect(fonte, rota).toContain("onLoadMore={loadMore}")
    }
  })
})

describe("o fim da lista só é dito quando a lista acabou", () => {
  it("o marcador de fim vive no controle, atrás de `hasMore`", () => {
    // No controle, o texto do fim é o ramo de quem NÃO tem mais página.
    const fim = botao.indexOf("{endLabel}")
    const botaoCarregar = botao.indexOf("{FEED_LOAD_MORE_LABEL}")
    expect(botaoCarregar).toBeGreaterThan(-1)
    expect(fim).toBeGreaterThan(botaoCarregar)
    expect(botao).toContain("hasMore ?")
  })

  it("/community não tem mais o marcador fixo no fonte", () => {
    // O defeito medido: "Você está em dia" era renderizado sempre que havia
    // cartões, com 356 publicações ainda por carregar. A copy agora vem do
    // controle (FEED_END_LABEL), que só a mostra no fim de verdade.
    expect(superficie["/community"]).not.toContain("Você está em dia")
  })
})

describe("a falha da página seguinte não apaga o que está na tela", () => {
  it("o caminho de erro do hook só registra a mensagem", () => {
    const inicio = hook.indexOf("const loadMore = useCallback")
    const fim = hook.indexOf("const clearLoadMoreError")
    expect(inicio).toBeGreaterThan(-1)
    expect(fim).toBeGreaterThan(inicio)
    const loadMore = hook.slice(inicio, fim)

    expect(loadMore).toContain("setLoadMoreError(outcome.message)")
    // Nenhum reset dentro do caminho de carregar mais: quem zera é o efeito de
    // primeira página nova, não uma falha.
    expect(loadMore).not.toContain("setExtra([])")
    expect(loadMore).not.toMatch(/setExtra\(\s*\[\s*\]\s*\)/)
  })

  it("a lista é a união da página 1 com o que o botão trouxe, sem id repetido", () => {
    expect(hook).toContain("appendFeedPage(firstPage, extra)")
  })
})

describe("um só caminho de leitura, sempre de UMA página", () => {
  it("nenhuma superfície chama feed_community por conta própria", () => {
    for (const [rota, fonte] of Object.entries(superficie)) {
      expect(fonte, rota).not.toContain('rpc("feed_community"')
    }
    // O RPC vive num arquivo só, e ali o pedido é de uma página.
    expect(loader).toContain('rpc("feed_community"')
    expect(loader).toContain("p_limit: limit")
    // Primeira página não manda cursor: o par só entra quando existe página
    // anterior (o servidor RECUSA meio cursor).
    expect(loader).toContain("if (cursor !== null) {")
    expect(loader).toContain("args.p_before_created_at = cursor.createdAt")
  })
})
