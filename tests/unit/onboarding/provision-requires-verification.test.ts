import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "web/app/api/onboarding/route"

// Achado CRITICAL da auditoria de 22/09/2026, reproduzido: `provision` conferia só o
// consentimento, e qualquer conta logada ganhava membership e perfil. Só quem está
// VERIFICADO provisiona; todo o resto recebe 403 e nada é gravado.

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from "web/lib/supabase/server"

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()
// PORT-005: o momento declarado na entrada é gravado por upsert na tabela do
// dono, depois do perfil. O mock registra o que a rota mandou.
const mockMomentUpsert = vi.fn(async () => ({ error: null }))
let verificationStatus: string | null = null

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
    if (name === "provision_member_locality") return { data: null, error: null }
    throw new Error(`unexpected rpc: ${name}`)
  })
  // A tabela de cidades responde como o catálogo: Manaus existe.
  mockFrom.mockImplementation((table: string) => {
    if (table === "localities") {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data: { id: "00000000-0000-4000-8000-000000000001", ibge_code: "1302603" },
          error: null,
        }),
      }
      return query
    }
    if (table === "member_entry_moments") {
      return { upsert: mockMomentUpsert }
    }
    const write = {
      upsert: async () => ({ error: null }),
      select: () => write,
      eq: () => write,
      maybeSingle: async () => ({ data: null, error: null }),
    }
    return write
  })
  ;(createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
    from: mockFrom,
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
      ibge_code: "1302603",
      display_name: "Pessoa",
      moment: "resident",
      ...body,
    }),
  })
}

const provisionCalls = () =>
  mockRpc.mock.calls.filter(([name]) => name === "provision_member_locality").length

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
        ibge_code: "1302603",
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
// e o destino da saída. O momento é obrigatório: uma entrada sem momento chega
// a um membro sem plano, e as boas-vindas ficariam num bloco inventado.
describe("provision exige o momento da entrada", () => {
  it("grava o momento e a data de chegada", async () => {
    verificationStatus = "verified"
    const response = await POST(
      provisionRequest({ arrival_date: "2026-11-04", moment: "arriving" }),
    )
    expect(response.status).toBe(200)
    expect(mockMomentUpsert).toHaveBeenCalledWith({
      arrival_date: "2026-11-04",
      departure_date: null,
      destination_locality_id: null,
      moment: "arriving",
      user_id: "10000000-0000-4000-8000-000000000002",
    })
  })

  it("grava o destino da saída já resolvido no catálogo", async () => {
    verificationStatus = "verified"
    const response = await POST(
      provisionRequest({
        departure_date: "2026-11-20",
        destination_ibge_code: "1302603",
        ibge_code: "5300108",
        moment: "leaving",
      }),
    )
    // A cidade escolhida é Brasília e o destino é Manaus; o mock do catálogo
    // devolve sempre o mesmo id, então o que se prova aqui é que o destino foi
    // resolvido ANTES de gravar, não o id do catálogo.
    expect(response.status).toBe(200)
    expect(mockMomentUpsert).toHaveBeenCalledWith({
      arrival_date: null,
      departure_date: "2026-11-20",
      destination_locality_id: "00000000-0000-4000-8000-000000000001",
      moment: "leaving",
      user_id: "10000000-0000-4000-8000-000000000002",
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
    expect(mockMomentUpsert).not.toHaveBeenCalled()
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
