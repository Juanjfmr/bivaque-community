import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPropertyAction } from "web/lib/listings/actions"

// SEC-006 (reconferência 2026-10-19) — `createPropertyAction` inseria
// `listings` e `property_details` em duas chamadas e, se a segunda falhasse,
// tentava `delete` sem conferir o resultado. A criação passa a ser uma única
// RPC transacional: ou nascem as duas linhas, ou nenhuma. O rollback em si é
// provado no pgTAP; aqui se prova que a action usa a RPC e propaga a recusa.

const mocks = vi.hoisted(() => {
  const rpc = vi.fn()
  const from = vi.fn()
  const getUser = vi.fn()
  const client = { auth: { getUser }, rpc, from }
  return { rpc, from, getUser, client }
})

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("web/lib/listings/ssr-client", () => ({ createListingClient: async () => mocks.client }))
vi.mock("web/lib/supabase/server", () => ({
  createServerClient: () => {
    throw new Error("createPropertyAction não deve abrir o cliente privilegiado")
  },
}))

function form(): FormData {
  const data = new FormData()
  data.set("title", "Casa sintética")
  data.set("deal", "rent")
  data.set("propertyType", "house")
  data.set("rent", "2000")
  data.set("condoFee", "")
  data.set("iptu", "")
  data.set("salePrice", "")
  data.set("bedrooms", "2")
  data.set("suites", "")
  data.set("parkingSpots", "1")
  data.set("areaM2", "62,5")
  data.set("description", "Casa de fixture")
  data.set("neighborhood", "Centro")
  data.set("address", "")
  data.set("availableFrom", "2026-11-01")
  data.set("intent", "publish")
  data.set("localityId", "00000000-0000-4000-8000-000000000001")
  data.set("communityId", "")
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null })
  mocks.rpc.mockResolvedValue({ data: "fixture-listing", error: null })
})

describe("SEC-006 criação transacional de Moradia", () => {
  it("cria anúncio e detalhe numa única RPC", async () => {
    const result = await createPropertyAction(form())

    expect(result).toEqual({
      ok: true,
      message: "Anúncio criado.",
      listingId: "fixture-listing",
    })
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.rpc).toHaveBeenCalledOnce()

    const [name, args] = mocks.rpc.mock.calls[0] as [string, Record<string, unknown>]
    expect(name).toBe("create_property_listing")
    expect(args).toMatchObject({
      p_listing: {
        status: "active",
        title: "Casa sintética",
        locality_id: "00000000-0000-4000-8000-000000000001",
        community_id: null,
      },
      p_details: {
        deal: "rent",
        property_type: "house",
        rent_cents: 200000,
        bedrooms: 2,
        parking_spots: 1,
        area_m2: 62.5,
        available_from: "2026-11-01",
      },
    })
  })

  it("não tenta compensar com delete quando a RPC recusa", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "detalhe inválido" } })

    const result = await createPropertyAction(form())

    expect(result).toMatchObject({ ok: false, message: "detalhe inválido" })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it("devolve erro recuperável quando a RPC lança em vez de deixar a action presa", async () => {
    mocks.rpc.mockRejectedValue(new Error("rede indisponível"))

    await expect(createPropertyAction(form())).resolves.toMatchObject({
      ok: false,
      message: "Não foi possível salvar agora. Tente de novo em instantes.",
    })
  })

  it("recusa antes da RPC quando o rascunho é inválido", async () => {
    const data = form()
    data.set("deal", "sale")
    data.set("rent", "2000")

    const result = await createPropertyAction(data)

    expect(result).toMatchObject({ ok: false, field: "rent" })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
