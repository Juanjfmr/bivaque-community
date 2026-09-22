import { describe, expect, it } from "vitest"
import {
  advanceFeedPageState,
  appendFeedPage,
  cursorFromLastRow,
  EMPTY_FEED_PAGE_STATE,
  FEED_PAGE_SIZE,
  type FeedCursorRow,
  feedOrderPaginates,
  initialFeedPageState,
} from "../../../apps/web/lib/feed/feed-pagination"

// FEED-PAGINACAO-CURSOR — rodada 2 (TELA): a aritmética do cursor.
//
// A rodada 1 entregou o cursor no SERVIDOR e provou por pgTAP que a página 2 não
// repete nem pula (`supabase/tests/feed-community-pagination.sql`). Aqui se prova
// a outra metade: que a TELA monta o cursor da última linha recebida, avança para
// a próxima página e sabe dizer que acabou. São as duas falhas silenciosas da
// paginação — cursor que não anda repete cartão, cursor que anda demais pula
// cartão — e as duas passariam por um e2e que só contasse "mais de 20".
//
// LIMITE DESTA PROVA: é função pura. Não há rede, banco nem DOM aqui; o
// comportamento da tela é e2e (`tests/e2e/feed-pagination.spec.ts`).

function row(id: string, createdAt: string): FeedCursorRow {
  return { id, created_at: createdAt }
}

// Referência do servidor: `(created_at, id) < (cursor_at, cursor_id)`, na mesma
// ordem decrescente da função (`order by created_at desc, id desc`). Serve para
// simular três páginas e cobrar do avanço do cursor o conjunto inteiro.
function referencePage(
  ordered: FeedCursorRow[],
  cursor: { createdAt: string; id: string } | null,
  limit: number,
): FeedCursorRow[] {
  const after = cursor
    ? ordered.filter(
        (r) =>
          r.created_at < cursor.createdAt ||
          (r.created_at === cursor.createdAt && r.id < cursor.id),
      )
    : ordered
  return after.slice(0, limit)
}

describe("cursorFromLastRow", () => {
  it("lista vazia não inventa cursor", () => {
    expect(cursorFromLastRow([])).toBeNull()
  })

  it("o cursor é o par da ÚLTIMA linha — a mesma ponta que o order by usou", () => {
    const rows = [row("a", "2026-09-20T10:00:00Z"), row("b", "2026-09-20T09:00:00Z")]
    expect(cursorFromLastRow(rows)).toEqual({
      createdAt: "2026-09-20T09:00:00Z",
      id: "b",
    })
  })
})

describe("estado inicial: a página 1 que chegou do servidor", () => {
  it("página cheia nasce sabendo que pode haver mais", () => {
    const page = Array.from({ length: FEED_PAGE_SIZE }, (_, index) =>
      row(`p${index}`, "2026-09-20T10:00:00Z"),
    )
    const state = initialFeedPageState(page)
    expect(state.hasMore).toBe(true)
    expect(state.cursor).toEqual({ createdAt: "2026-09-20T10:00:00Z", id: "p19" })
  })

  it("página curta já nasce no fim: o servidor devolveu tudo o que tinha", () => {
    const state = initialFeedPageState([row("p0", "2026-09-20T10:00:00Z")])
    expect(state.hasMore).toBe(false)
  })

  it("feed vazio é o estado vazio, sem cursor", () => {
    expect(initialFeedPageState([])).toEqual(EMPTY_FEED_PAGE_STATE)
  })

  it("o tamanho da página é o pedido da tela, não um número solto no chamador", () => {
    expect(FEED_PAGE_SIZE).toBe(20)
    const custom = initialFeedPageState([row("p0", "2026-09-20T10:00:00Z")], "recent", 1)
    expect(custom.hasMore).toBe(true)
  })
})

describe("advanceFeedPageState", () => {
  it("página cheia avança o cursor para a última linha RECEBIDA", () => {
    const first = initialFeedPageState(
      Array.from({ length: FEED_PAGE_SIZE }, (_, index) =>
        row(`p${index}`, `2026-09-20T10:${String(index).padStart(2, "0")}:00Z`),
      ),
    )
    const second = Array.from({ length: FEED_PAGE_SIZE }, (_, index) =>
      row(`q${index}`, `2026-09-19T10:${String(index).padStart(2, "0")}:00Z`),
    )
    const advanced = advanceFeedPageState(first, second)
    expect(advanced.hasMore).toBe(true)
    expect(advanced.cursor).toEqual({ createdAt: "2026-09-19T10:19:00Z", id: "q19" })
  })

  it("página curta diz que acabou", () => {
    const previous = initialFeedPageState(
      Array.from({ length: FEED_PAGE_SIZE }, (_, index) =>
        row(`p${index}`, "2026-09-20T10:00:00Z"),
      ),
    )
    const advanced = advanceFeedPageState(previous, [row("q0", "2026-09-19T10:00:00Z")])
    expect(advanced.hasMore).toBe(false)
  })

  it("página VAZIA não mexe no cursor e encerra a lista", () => {
    const previous = { cursor: { createdAt: "2026-09-20T10:00:00Z", id: "p19" }, hasMore: true }
    const advanced = advanceFeedPageState(previous, [])
    expect(advanced).toEqual({
      cursor: { createdAt: "2026-09-20T10:00:00Z", id: "p19" },
      hasMore: false,
    })
  })

  it("Relevantes não pagina: lista limitada nunca ganha 'Carregar mais'", () => {
    const full = Array.from({ length: FEED_PAGE_SIZE }, (_, index) =>
      row(`r${index}`, "2026-09-20T10:00:00Z"),
    )
    expect(feedOrderPaginates("relevant")).toBe(false)
    expect(advanceFeedPageState(EMPTY_FEED_PAGE_STATE, full, "relevant")).toEqual(
      EMPTY_FEED_PAGE_STATE,
    )
    // E o outro lado: Recentes pagina.
    expect(feedOrderPaginates("recent")).toBe(true)
    expect(advanceFeedPageState(EMPTY_FEED_PAGE_STATE, full, "recent").hasMore).toBe(true)
  })
})

describe("o cursor cobre o conjunto inteiro — três páginas, sem repetir e sem pular", () => {
  // 45 linhas NA ORDEM DO SERVIDOR (`created_at desc, id desc`), com EMPATES de
  // instante a cada três linhas — é o empate que o id desempata, e é onde um
  // cursor só de `created_at` repetiria ou pularia linha.
  const ordered: FeedCursorRow[] = Array.from({ length: 45 }, (_, index) => {
    const minutes = 14 - Math.floor(index / 3)
    return row(
      `post-${String(44 - index).padStart(2, "0")}`,
      `2026-09-20T10:${String(minutes).padStart(2, "0")}:00Z`,
    )
  })

  it("as páginas somadas são a lista inteira, na ordem", () => {
    const collected: FeedCursorRow[] = []
    let state = EMPTY_FEED_PAGE_STATE
    let cursor: { createdAt: string; id: string } | null = null
    for (let page = 0; page < 4; page += 1) {
      const received = referencePage(ordered, cursor, FEED_PAGE_SIZE)
      collected.push(...received)
      state = advanceFeedPageState(state, received)
      cursor = state.cursor
      if (!state.hasMore) break
    }
    expect(collected.map((r) => r.id)).toEqual(ordered.map((r) => r.id))
    expect(new Set(collected.map((r) => r.id)).size).toBe(ordered.length)
    expect(state.hasMore).toBe(false)
  })
})

describe("appendFeedPage", () => {
  it("acrescenta preservando a ordem recebida", () => {
    const merged = appendFeedPage([row("a", "t1")], [row("b", "t2"), row("c", "t3")])
    expect(merged.map((r) => r.id)).toEqual(["a", "b", "c"])
  })

  it("id repetido não entra duas vezes — nem vindo da mesma página", () => {
    const merged = appendFeedPage(
      [row("a", "t1"), row("b", "t2")],
      [row("b", "t2"), row("c", "t3"), row("c", "t3")],
    )
    expect(merged.map((r) => r.id)).toEqual(["a", "b", "c"])
  })

  it("página vazia não muda a lista", () => {
    const current = [row("a", "t1")]
    expect(appendFeedPage(current, [])).toEqual(current)
  })
})
