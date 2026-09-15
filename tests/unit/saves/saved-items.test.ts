import { describe, expect, it, vi } from "vitest"
import {
  buildGuideSavedItems,
  buildSavedItems,
  filterSavedItems,
  loadSavedItems,
  removeSavedItem,
} from "web/lib/saves/saved-items"

const saves = [{ request_id: "r-1", saved_at: "2026-09-01T10:00:00Z" }]

const liveRequest = {
  id: "r-1",
  title: "Bom pediatra particular",
  body: "Preciso de indicação de pediatra particular no bairro.",
  category: "saude_bem_estar",
  is_deleted: false,
}

const guideSaves = [{ entry_id: "g-1", saved_at: "2026-09-02T10:00:00Z" }]

const liveEntry = {
  id: "g-1",
  name: "Escola Modelo do Centro",
  description: "Escola pública bem avaliada no centro.",
  category: "school",
  status: "approved",
}

describe("buildSavedItems", () => {
  it("hidrata o pedido vivo com titulo, resumo, categoria e destino real", () => {
    const [item] = buildSavedItems(saves, [liveRequest])
    expect(item).toMatchObject({
      kind: "indicacao",
      available: true,
      title: "Bom pediatra particular",
      category: "saude_bem_estar",
      href: "/recommendations?focus=r-1#req-r-1",
    })
  })

  it("pedido retirado (is_deleted) fica indisponivel sem herdar conteudo antigo", () => {
    const [item] = buildSavedItems(saves, [{ ...liveRequest, is_deleted: true }])
    expect(item?.available).toBe(false)
    expect(item?.title).toBeNull()
    expect(item?.excerpt).toBeNull()
    expect(item?.href).toBeNull()
  })

  it("salvamento sem linha legivel pela RLS fica indisponivel", () => {
    const [item] = buildSavedItems(saves, [])
    expect(item).toMatchObject({ available: false, title: null, excerpt: null, href: null })
  })
})

describe("buildGuideSavedItems", () => {
  it("hidrata a referência viva e aponta para o filtro real do guia", () => {
    const [item] = buildGuideSavedItems(guideSaves, [liveEntry])
    expect(item).toMatchObject({
      kind: "guia",
      available: true,
      title: "Escola Modelo do Centro",
      category: "school",
      href: "/guide?q=Escola%20Modelo%20do%20Centro",
    })
  })

  it("referência que saiu da fila aprovada fica indisponível, sem herdar conteúdo", () => {
    const [item] = buildGuideSavedItems(guideSaves, [{ ...liveEntry, status: "pending" }])
    expect(item).toMatchObject({
      kind: "guia",
      available: false,
      title: null,
      excerpt: null,
      href: null,
    })
  })

  it("salvamento sem referência legível pela RLS fica indisponível", () => {
    const [item] = buildGuideSavedItems(guideSaves, [])
    expect(item).toMatchObject({ available: false, title: null, excerpt: null, href: null })
  })
})

describe("filterSavedItems", () => {
  const unavailable = buildSavedItems(saves, [{ ...liveRequest, is_deleted: true }])

  it("busca nao reconstitui conteudo de item retirado", () => {
    expect(filterSavedItems(unavailable, "pediatra")).toEqual([])
    expect(filterSavedItems(unavailable, "Bom pediatra particular")).toEqual([])
  })

  it("busca acha o item vivo pelo texto hidratado", () => {
    expect(filterSavedItems(buildSavedItems(saves, [liveRequest]), "pediatra")).toHaveLength(1)
  })
})

// Duas tabelas de origem, dois alvos: a leitura mescla e ordena por data de
// salvamento, e cada falha tem seu próprio código de erro.
function makeSupabase(handlers: Record<string, unknown>) {
  const table = (name: string) => ({
    select: () => {
      const builder: Record<string, unknown> = {
        order: () => handlers[name],
        in: () => handlers[name],
      }
      return builder
    },
    delete: () => ({
      eq: () => ({
        eq: () => handlers[name],
        error: (handlers[name] as { error?: unknown } | undefined)?.error ?? null,
      }),
    }),
  })
  return { from: vi.fn(table) } as unknown as Parameters<typeof loadSavedItems>[0]
}

describe("loadSavedItems", () => {
  it("falha de leitura de salvamentos nao vira lista vazia", async () => {
    const supabase = makeSupabase({
      recommendation_saves: { data: null, error: { message: "boom" } },
      guide_entry_saves: { data: [], error: null },
    })
    await expect(loadSavedItems(supabase)).rejects.toThrow("saves-query-failed")
  })

  it("falha de leitura dos salvamentos do guia nao vira lista vazia", async () => {
    const supabase = makeSupabase({
      recommendation_saves: { data: [], error: null },
      guide_entry_saves: { data: null, error: { message: "boom" } },
    })
    await expect(loadSavedItems(supabase)).rejects.toThrow("guide-saves-query-failed")
  })

  it("falha de leitura dos pedidos nao vira lista vazia", async () => {
    const supabase = makeSupabase({
      recommendation_saves: { data: saves, error: null },
      guide_entry_saves: { data: [], error: null },
      recommendation_requests: { data: null, error: { message: "boom" } },
    })
    await expect(loadSavedItems(supabase)).rejects.toThrow("requests-query-failed")
  })

  it("falha de leitura das referências nao vira lista vazia", async () => {
    const supabase = makeSupabase({
      recommendation_saves: { data: [], error: null },
      guide_entry_saves: { data: guideSaves, error: null },
      arrival_guide_entries: { data: null, error: { message: "boom" } },
    })
    await expect(loadSavedItems(supabase)).rejects.toThrow("guide-entries-query-failed")
  })

  it("carrega e hidrata o caminho feliz dos pedidos", async () => {
    const supabase = makeSupabase({
      recommendation_saves: { data: saves, error: null },
      guide_entry_saves: { data: [], error: null },
      recommendation_requests: { data: [liveRequest], error: null },
    })
    const items = await loadSavedItems(supabase)
    expect(items).toHaveLength(1)
    expect(items[0]?.available).toBe(true)
    expect(items[0]?.kind).toBe("indicacao")
  })

  it("mescla os dois tipos e ordena por data de salvamento", async () => {
    const supabase = makeSupabase({
      recommendation_saves: { data: saves, error: null },
      guide_entry_saves: { data: guideSaves, error: null },
      recommendation_requests: { data: [liveRequest], error: null },
      arrival_guide_entries: { data: [liveEntry], error: null },
    })
    const items = await loadSavedItems(supabase)
    expect(items).toHaveLength(2)
    expect(items[0]?.kind).toBe("guia")
    expect(items[1]?.kind).toBe("indicacao")
  })
})

describe("removeSavedItem", () => {
  it("remove da tabela do tipo: indicação e guia não se confundem", async () => {
    const from = vi.fn(() => ({ delete: () => ({ eq: () => ({ error: null }) }) }))
    expect(await removeSavedItem({ from } as never, "indicacao", "r-1")).toBe(true)
    expect(from).toHaveBeenCalledWith("recommendation_saves")
    expect(await removeSavedItem({ from } as never, "guia", "g-1")).toBe(true)
    expect(from).toHaveBeenCalledWith("guide_entry_saves")
  })

  it("confirma remocao apenas sem erro do servidor", async () => {
    const failing = {
      from: vi.fn(() => ({ delete: () => ({ eq: () => ({ error: { message: "boom" } }) }) })),
    }
    expect(await removeSavedItem(failing as never, "indicacao", "r-1")).toBe(false)
    expect(await removeSavedItem(failing as never, "guia", "g-1")).toBe(false)
  })
})
