import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "web/app/api/onboarding/route"

// Achado CRITICAL da auditoria de 22/09/2026, reproduzido: `provision` conferia só o
// consentimento, e qualquer conta logada ganhava membership e perfil. Só quem está
// VERIFICADO provisiona; todo o resto recebe 403 e nada é gravado.
//
// PORT-005 (correção do achado P2 da revisão independente): o mock do catálogo
// devolvia o MESMO id para qualquer código, então consultar a cidade errada — ou
// uma cidade que não existe — também passava. Agora ele responde pelo código
// pedido, e os negativos de cidade e de destino têm teste próprio.

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from "web/lib/supabase/server"

const MANAUS = { ibge: "1302603", id: "00000000-0000-4000-8000-000000000001" }
const RIO = { ibge: "3304557", id: "00000000-0000-4000-8000-000000000002" }
// Catálogo do teste: só as duas cidades que os casos usam. Qualquer outro
// código de formato certo é "ausente do catálogo" — o 400 da rota.
const CATALOG = [MANAUS, RIO]

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()
let verificationStatus: string | null = null

interface LocalitiesQuery {
  eq(column: string, value: string): LocalitiesQuery
  maybeSingle(): Promise<{ data: { ibge_code: string; id: string } | null; error: null }>
  select(): LocalitiesQuery
}

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")

  mockGetUser.mockResolvedValue({
    data: { user: { id: "10000000-0000-4000-8000-000000000002" } },
    error: null,
  })
  mockRpc.mockImplementation(async (name: string) => {
    if (name === "has_accepted_consent") return { data: true, error: null }
    if (name === "read_verification_status") {
      return {
        data: verificationStatus === null ? [] : [{ status: verificationStatus }],
        error: null,
      }
    }
    if (name === "provision_member_entry") return { data: null, error: null }
    throw new Error(`unexpected rpc: ${name}`)
  })
  // A tabela de cidades responde pelo ibge_code pedido, como o catálogo.
  mockFrom.mockImplementation((table: string) => {
    if (table !== "localities") throw new Error(`unexpected table: ${table}`)

    let column = ""
    let value = ""
    const query: LocalitiesQuery = {
      eq: (requestedColumn, requestedValue) => {
        column = requestedColumn
        value = requestedValue
        return query
      },
      maybeSingle: async () => {
        const found =
          column === "ibge_code" ? CATALOG.find((city) => city.ibge === value) : undefined
        return { data: found ? { ibge_code: found.ibge, id: found.id } : null, error: null }
      },
      select: () => query,
    }
    return query
  })
  ;(createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  } as never)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  verificationStatus = null
})

function provisionRequest(body: Record<string, unknown> = {}): Request {
  return new Request("http://localhost/api/onboarding", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer token" },
    body: JSON.stringify({
      action: "provision",
      ibge_code: MANAUS.ibge,
      display_name: "Pessoa",
      moment: "resident",
      ...body,
    }),
  })
}

const provisionCalls = () =>
  mockRpc.mock.calls.filter(([name]) => name === "provision_member_entry").length

const provisionArgs = () =>
  mockRpc.mock.calls.find(([name]) => name === "provision_member_entry")?.[1] as
    | Record<string, unknown>
    | undefined

describe("provision exige verificação", () => {
  it.each([
    { status: null, label: "nunca verificou" },
    { status: "pending", label: "pendente" },
    { status: "temporary_error", label: "erro temporário" },
    { status: "rejected", label: "recusada" },
  ])("$label recebe 403 e nada é provisionado", async ({ status }) => {
    verificationStatus = status
    const response = await POST(provisionRequest())
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "verification is required" })
    expect(provisionCalls()).toBe(0)
  })

  it("a situação vem do banco pelo usuário do token, nunca do corpo", async () => {
    verificationStatus = "pending"
    const request = new Request("http://localhost/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer token" },
      body: JSON.stringify({
        action: "provision",
        ibge_code: MANAUS.ibge,
        display_name: "Pessoa",
        status: "verified",
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
    expect(mockRpc).toHaveBeenCalledWith("read_verification_status", {
      p_user_id: "10000000-0000-4000-8000-000000000002",
    })
  })

  it("quem está verificado provisiona", async () => {
    verificationStatus = "verified"
    const response = await POST(provisionRequest())
    expect(response.status).toBe(200)
    expect(provisionCalls()).toBe(1)
  })

  it("falha ao ler a verificação não vira permissão", async () => {
    mockRpc.mockImplementation(async (name: string) => {
      if (name === "has_accepted_consent") return { data: true, error: null }
      if (name === "read_verification_status") return { data: null, error: { message: "boom" } }
      throw new Error(`unexpected rpc: ${name}`)
    })
    const response = await POST(provisionRequest())
    expect(response.status).toBeGreaterThanOrEqual(500)
    expect(provisionCalls()).toBe(0)
  })
})

// PORT-005: o provisionamento recebe o momento da entrada, a data que ele pede
// e o destino da saída, e grava os três numa chamada só (vínculo, perfil e
// momento na mesma transação — ver supabase/tests/entry-provision-atomic.sql).
describe("provision exige o momento da entrada", () => {
  it("grava o momento e a data de chegada na mesma chamada do vínculo e do perfil", async () => {
    verificationStatus = "verified"
    const response = await POST(
      provisionRequest({ arrival_date: "2026-11-04", moment: "arriving" }),
    )
    expect(response.status).toBe(200)
    expect(provisionArgs()).toEqual({
      p_arrival_date: "2026-11-04",
      p_consent_version: 2,
      p_display_name: "Pessoa",
      p_locality_id: MANAUS.id,
      p_moment: "arriving",
      p_user_id: "10000000-0000-4000-8000-000000000002",
    })
  })

  it("grava o destino da saída já resolvido no catálogo", async () => {
    verificationStatus = "verified"
    const response = await POST(
      provisionRequest({
        departure_date: "2026-11-20",
        destination_ibge_code: RIO.ibge,
        ibge_code: MANAUS.ibge,
        moment: "leaving",
      }),
    )
    expect(response.status).toBe(200)
    // A cidade escolhida é Manaus e o destino é o Rio: o mock responde pelo
    // código pedido, então o id abaixo só pode vir do Rio.
    expect(provisionArgs()).toEqual({
      p_consent_version: 2,
      p_departure_date: "2026-11-20",
      p_destination_locality_id: RIO.id,
      p_display_name: "Pessoa",
      p_locality_id: MANAUS.id,
      p_moment: "leaving",
      p_user_id: "10000000-0000-4000-8000-000000000002",
    })
  })

  it("recusa momento ausente, momento desconhecido e saída sem destino", async () => {
    verificationStatus = "verified"

    const missing = await POST(provisionRequest({ moment: undefined }))
    expect(missing.status).toBe(400)
    expect(await missing.json()).toEqual({ error: "moment is required" })

    const unknown = await POST(provisionRequest({ moment: "chegando" }))
    expect(unknown.status).toBe(400)
    expect(await unknown.json()).toEqual({ error: "moment is required" })

    const noDestination = await POST(
      provisionRequest({ departure_date: "2026-11-20", moment: "leaving" }),
    )
    expect(noDestination.status).toBe(400)
    expect(await noDestination.json()).toEqual({ error: "destination is required" })

    expect(provisionCalls()).toBe(0)
  })

  it("recusa data no passado e data de saída em quem chega", async () => {
    verificationStatus = "verified"

    const past = await POST(provisionRequest({ arrival_date: "2020-01-01", moment: "arriving" }))
    expect(past.status).toBe(400)
    expect(await past.json()).toEqual({ error: "date is in the past" })

    const mixed = await POST(
      provisionRequest({
        arrival_date: "2030-01-01",
        departure_date: "2030-02-01",
        moment: "arriving",
      }),
    )
    expect(mixed.status).toBe(400)
    expect(await mixed.json()).toEqual({ error: "departure_date is not allowed" })

    expect(provisionCalls()).toBe(0)
  })
})

// O mock antigo devolvia o mesmo id para qualquer código: consultar a cidade
// errada passava. Estes casos provam que a resolução do destino é a do código
// pedido, e que cidade ou destino ausentes do catálogo são 400, nunca um
// provisionamento com o id de outra cidade.
describe("a cidade e o destino são resolvidos pelo código pedido", () => {
  it("cidade fora do catálogo é 400 e nada é provisionado", async () => {
    verificationStatus = "verified"
    const response = await POST(provisionRequest({ ibge_code: "9999999" }))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "locality is unknown" })
    expect(provisionCalls()).toBe(0)
  })

  it("destino fora do catálogo é 400 e nada é provisionado", async () => {
    verificationStatus = "verified"
    const response = await POST(
      provisionRequest({
        departure_date: "2026-11-20",
        destination_ibge_code: "9999999",
        moment: "leaving",
      }),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "destination is unknown" })
    expect(provisionCalls()).toBe(0)
  })

  it("destino igual à cidade atual é 400 e nada é provisionado", async () => {
    verificationStatus = "verified"
    const response = await POST(
      provisionRequest({
        departure_date: "2026-11-20",
        destination_ibge_code: MANAUS.ibge,
        ibge_code: MANAUS.ibge,
        moment: "leaving",
      }),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: "destination must differ from the current city",
    })
    expect(provisionCalls()).toBe(0)
  })

  it("a cidade escolhida e o destino são cidades diferentes do catálogo", async () => {
    verificationStatus = "verified"
    const response = await POST(
      provisionRequest({
        departure_date: "2026-11-20",
        destination_ibge_code: RIO.ibge,
        ibge_code: MANAUS.ibge,
        moment: "leaving",
      }),
    )
    expect(response.status).toBe(200)
    expect(provisionArgs()?.["p_locality_id"]).toBe(MANAUS.id)
    expect(provisionArgs()?.["p_destination_locality_id"]).toBe(RIO.id)
  })
})
