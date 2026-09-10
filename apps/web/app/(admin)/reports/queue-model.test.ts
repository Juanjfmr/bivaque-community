import { describe, expect, it } from "vitest"
import {
  applyFilters,
  countLabel,
  decisionToAction,
  pageWindow,
  paginateRows,
  parseQueueParams,
  type ReportRow,
  SEM_COMUNIDADE,
  shortLabel,
  truncateReason,
} from "./targets"

// RECON-011 — a prova da fila sem banco: o parsing nunca inventa aba, o
// filtro nunca casa por heurística, e a decisão só existe nos dois valores
// humanos da prancha. Nada aqui depende de rede.

function row(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    target_type: "post",
    target_id: "22222222-2222-2222-2222-222222222222",
    reason: "Publicação de spam repetido",
    created_at: "2026-09-01T10:00:00.000Z",
    status: "open",
    resolved_at: null,
    operator_note: null,
    excerpt: "Vendo mesa de madeira maciça\n6 lugares",
    authorName: "Paulo Lima",
    communityName: "Jardim das Acácias",
    contentCreatedAt: "2026-08-31T18:00:00.000Z",
    openReportsOnTarget: 1,
    ...overrides,
  }
}

describe("shortLabel", () => {
  it("pega a primeira linha real do conteúdo", () => {
    expect(shortLabel("Mesa de madeira\nsegunda linha")).toBe("Mesa de madeira")
  })

  it("trunca em 48 caracteres com reticências", () => {
    const label = shortLabel("a".repeat(60))
    expect(label.length).toBe(49)
    expect(label.endsWith("…")).toBe(true)
  })

  it("devolve vazio quando não há conteúdo — quem consome diz o estado honesto", () => {
    expect(shortLabel(null)).toBe("")
    expect(shortLabel("   \n  ")).toBe("")
  })
})

describe("truncateReason", () => {
  it("mantém motivo curto e corta longo com reticências", () => {
    expect(truncateReason("Spam")).toBe("Spam")
    expect(truncateReason("x".repeat(100), 90).length).toBe(91)
  })
})

describe("parseQueueParams", () => {
  it("cai na aba e na ordem padrão sem parâmetros", () => {
    const p = parseQueueParams({})
    expect(p.tab).toBe("em-analise")
    expect(p.ordem).toBe("antigas")
    expect(p.pagina).toBe(1)
    expect(p.tipo).toBeNull()
    expect(p.comunidade).toBeNull()
    expect(p.motivo).toBeNull()
  })

  it("só aceita motivo da lista fechada; texto fora dela não vira filtro", () => {
    expect(parseQueueParams({ motivo: "Spam" }).motivo).toBe("Spam")
    expect(parseQueueParams({ motivo: "Propaganda" }).motivo).toBeNull()
    expect(parseQueueParams({ motivo: "spam" }).motivo).toBeNull()
  })

  it("não inventa aba desconhecida", () => {
    expect(parseQueueParams({ aba: "qualquer-coisa" }).tab).toBe("em-analise")
    expect(parseQueueParams({ aba: "concluidas" }).tab).toBe("concluidas")
  })

  it("aceita pagina maior que zero e ignora lixo", () => {
    expect(parseQueueParams({ pagina: "3" }).pagina).toBe(3)
    expect(parseQueueParams({ pagina: "0" }).pagina).toBe(1)
    expect(parseQueueParams({ pagina: "abc" }).pagina).toBe(1)
  })

  it("recebe o primeiro valor quando o parâmetro vem repetido", () => {
    expect(parseQueueParams({ tipo: ["post", "comment"] }).tipo).toBe("post")
  })
})

describe("decisionToAction", () => {
  it("traduz só as duas escolhas humanas da prancha", () => {
    expect(decisionToAction("manter")).toBe("dismiss")
    expect(decisionToAction("ocultar")).toBe("hide")
  })

  it("nada mais é decisão: sem seleção, sem veredito", () => {
    expect(decisionToAction(null)).toBeNull()
    expect(decisionToAction("")).toBeNull()
    expect(decisionToAction("qualquer")).toBeNull()
    // Preseleção automática seria exatamente isso: um valor que ninguém marcou.
    expect(decisionToAction("dismiss")).toBeNull()
    expect(decisionToAction("hide")).toBeNull()
  })
})

describe("applyFilters", () => {
  const rows = [
    row({ id: "a", created_at: "2026-09-02T10:00:00.000Z" }),
    row({
      id: "b",
      target_type: "group",
      created_at: "2026-09-01T10:00:00.000Z",
      communityName: null,
      reason: "Atividade suspeita",
    }),
    row({
      id: "c",
      created_at: "2026-09-03T10:00:00.000Z",
      communityName: "Vila Nova",
      reason: "Propaganda eleitoral",
    }),
  ]

  it("ordena por recebimento, antigas primeiro por padrão", () => {
    const out = applyFilters(rows, parseQueueParams({}))
    expect(out.map((r) => r.id)).toEqual(["b", "a", "c"])
  })

  it("inverte a ordem quando pedida por recentes", () => {
    const out = applyFilters(rows, parseQueueParams({ ordem: "recentes" }))
    expect(out.map((r) => r.id)).toEqual(["c", "a", "b"])
  })

  it("filtra por tipo e por comunidade reais", () => {
    expect(applyFilters(rows, parseQueueParams({ tipo: "group" })).map((r) => r.id)).toEqual(["b"])
    expect(
      applyFilters(rows, parseQueueParams({ comunidade: "Vila Nova" })).map((r) => r.id),
    ).toEqual(["c"])
    expect(
      applyFilters(rows, parseQueueParams({ comunidade: SEM_COMUNIDADE })).map((r) => r.id),
    ).toEqual(["b"])
  })

  it("filtra o motivo pela lista fechada canônica das duas pontas", () => {
    const closed = [
      row({ id: "a", reason: "Spam: vende curso" }),
      row({ id: "b", reason: "Conteúdo inadequado" }),
      row({ id: "c", reason: "texto livre legado de antes da lista" }),
    ]
    expect(applyFilters(closed, parseQueueParams({ motivo: "Spam" })).map((r) => r.id)).toEqual([
      "a",
    ])
    expect(
      applyFilters(closed, parseQueueParams({ motivo: "Conteúdo inadequado" })).map((r) => r.id),
    ).toEqual(["b"])
    // Linha legada de texto livre não pertence a nenhuma categoria: some
    // quando um filtro canônico está ativo, aparece sem filtro.
    expect(applyFilters(closed, parseQueueParams({ motivo: "Outro" }))).toEqual([])
    expect(applyFilters(closed, parseQueueParams({})).map((r) => r.id)).toEqual(["a", "b", "c"])
  })

  it("combina filtros sem mutating a lista original", () => {
    const snapshot = [...rows]
    applyFilters(rows, parseQueueParams({ tipo: "post", ordem: "recentes" }))
    expect(rows).toEqual(snapshot)
  })
})

describe("paginateRows e countLabel", () => {
  it("limita ao tamanho de página e ajusta a página pedida", () => {
    const many = Array.from({ length: 25 }, (_, i) => row({ id: String(i) }))
    const paged = paginateRows(many, 4)
    expect(paged.page).toBe(3)
    expect(paged.rows.length).toBe(5)
    expect(paged.totalPages).toBe(3)
    expect(paged.firstShown).toBe(21)
    expect(paged.lastShown).toBe(25)
  })

  it("vazio não é página quebrada", () => {
    const paged = paginateRows([], 1)
    expect(paged.totalPages).toBe(1)
    expect(paged.rows).toEqual([])
    expect(countLabel(paged)).toContain("0")
  })

  it("mostra a janela contada ao operador", () => {
    const many = Array.from({ length: 25 }, (_, i) => row({ id: String(i) }))
    expect(countLabel(paginateRows(many, 1))).toBe("Mostrando 1–10 de 25 denúncias")
    expect(countLabel(paginateRows(many.slice(0, 8), 1))).toBe("Mostrando 8 de 8 denúncias")
  })

  it("janela de página não inventa páginas fora do total", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
    expect(pageWindow(10, 20)).toEqual([1, 9, 10, 11, 20])
  })
})
