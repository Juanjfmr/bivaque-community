import { describe, expect, it, vi } from "vitest"
import {
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

function makeSupabase(handlers: Record<string, unknown>) {
  const table = (name: string) => ({
    select: () => {
      const builder: Record<string, unknown> = {
        order: () => handlers[name],
        in: () => handlers[name],
        eq: () => ({
          delete: undefined,
        }),
      }
      return builder
    },
    delete: () => ({
      eq: () => handlers[name],
    }),
  })
  return { from: vi.fn(table) } as unknown as Parameters<typeof loadSavedItems>[0]
}

describe("loadSavedItems", () => {
  it("falha de leitura de salvamentos nao vira lista vazia", async () => {
    const supabase = makeSupabase({
      recommendation_saves: { data: null, error: { message: "boom" } },
    })
    await expect(loadSavedItems(supabase)).rejects.toThrow("saves-query-failed")
  })

  it("falha de leitura dos pedidos nao vira lista vazia", async () => {
    const supabase = makeSupabase({
      recommendation_saves: { data: saves, error: null },
      recommendation_requests: { data: null, error: { message: "boom" } },
    })
    await expect(loadSavedItems(supabase)).rejects.toThrow("requests-query-failed")
  })

  it("carrega e hidrata o caminho feliz", async () => {
    const supabase = makeSupabase({
      recommendation_saves: { data: saves, error: null },
      recommendation_requests: { data: [liveRequest], error: null },
    })
    const items = await loadSavedItems(supabase)
    expect(items).toHaveLength(1)
    expect(items[0]?.available).toBe(true)
  })
})

describe("removeSavedItem", () => {
  it("confirma remocao apenas sem erro do servidor", async () => {
    const ok = { from: vi.fn(() => ({ delete: () => ({ eq: () => ({ error: null }) }) })) }
    expect(await removeSavedItem(ok as never, "r-1")).toBe(true)

    const failing = {
      from: vi.fn(() => ({ delete: () => ({ eq: () => ({ error: { message: "boom" } }) }) })),
    }
    expect(await removeSavedItem(failing as never, "r-1")).toBe(false)
  })
})
