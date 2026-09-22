import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "web/app/api/internal/account-deletion/route"

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from "web/lib/supabase/server"

const USER_ID = "00000000-0000-4000-8000-000000000001"
const PAST = "2026-09-01T00:00:00.000Z"
const FUTURE = "2030-01-01T00:00:00.000Z"

const mockMaybeSingle = vi.fn()
const mockGetUserById = vi.fn()
const mockDeleteUser = vi.fn()
const mockRpc = vi.fn()
const mockList = vi.fn()
const mockRemove = vi.fn()

// A rota fala com dois RPCs pelo mesmo cliente. O comportamento é por nome de
// função, como no cliente real — um mock que devolvesse a mesma coisa para os
// dois esconderia justamente a ordem que os testes abaixo provam.
let contactResult: unknown = { data: 2, error: null }
let finalizeResult: unknown = { data: "purged", error: null }

function buildClient() {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
    }),
    auth: { admin: { getUserById: mockGetUserById, deleteUser: mockDeleteUser } },
    storage: { from: () => ({ list: mockList, remove: mockRemove }) },
    rpc: mockRpc,
  } as never
}

function post(body: string, headers: Record<string, string>) {
  return POST(
    new Request("http://localhost/api/internal/account-deletion", {
      method: "POST",
      headers,
      body,
    }),
  )
}

const VALID_HEADERS = {
  "content-type": "application/json",
  "x-account-deletion-secret": "test-secret",
}

async function run(body: string = JSON.stringify({ user_ids: [USER_ID] })) {
  const response = await post(body, VALID_HEADERS)
  return { response, payload: (await response.json()) as { outcomes: Record<string, string> } }
}

beforeEach(() => {
  vi.stubEnv("ACCOUNT_DELETION_WORKER_SECRET", "test-secret")
  ;(createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(buildClient())
  mockMaybeSingle.mockResolvedValue({
    data: { user_id: USER_ID, due_at: PAST, finalized_at: null },
    error: null,
  })
  mockGetUserById.mockResolvedValue({
    data: { user: { email: "titular@example.invalid" } },
    error: null,
  })
  mockDeleteUser.mockResolvedValue({ error: null })
  mockList.mockResolvedValue({ data: [], error: null })
  mockRemove.mockResolvedValue({ error: null })
  contactResult = { data: 2, error: null }
  finalizeResult = { data: "purged", error: null }
  // settle_account_possessions roda ANTES do deleteUser: e a ordem que impede a
  // credencial sumir com posse pendurada (RECON-052-FOLLOWUP).
  mockRpc.mockImplementation((name: string) => {
    if (name === "purge_account_contact_data") return Promise.resolve(contactResult)
    if (name === "settle_account_possessions") return Promise.resolve({ data: null, error: null })
    return Promise.resolve(finalizeResult)
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe("POST /api/internal/account-deletion (RECON-052)", () => {
  it("fails closed with 503 when the worker secret is not configured", async () => {
    vi.unstubAllEnvs()

    const { response } = await run()

    expect(response.status).toBe(503)
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it("rejects a wrong or missing secret with 401", async () => {
    for (const header of [undefined, "wrong-secret"]) {
      const headers: Record<string, string> = { "content-type": "application/json" }
      if (header !== undefined) headers["x-account-deletion-secret"] = header

      const response = await post(JSON.stringify({ user_ids: [USER_ID] }), headers)

      expect(response.status).toBe(401)
    }
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it("rejects malformed bodies with 400", async () => {
    const cases = [
      "{not json",
      JSON.stringify({}),
      JSON.stringify({ user_ids: "not-an-array" }),
      JSON.stringify({ user_ids: [] }),
      JSON.stringify({ user_ids: Array.from({ length: 21 }, (_, index) => String(index)) }),
    ]

    for (const body of cases) {
      const response = await post(body, VALID_HEADERS)
      expect(response.status).toBe(400)
    }
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it("touches nothing when the request is not due yet", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { user_id: USER_ID, due_at: FUTURE, finalized_at: null },
      error: null,
    })

    const { payload } = await run()

    expect(payload.outcomes[USER_ID]).toBe("not_due")
    // O prazo é checado antes do passo destrutivo: nem credencial, nem mídia.
    expect(mockDeleteUser).not.toHaveBeenCalled()
    expect(mockList).not.toHaveBeenCalled()
    expect(mockGetUserById).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("touches nothing for an unknown or already purged request", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    expect((await run()).payload.outcomes[USER_ID]).toBe("not_found")

    mockMaybeSingle.mockResolvedValueOnce({
      data: { user_id: USER_ID, due_at: PAST, finalized_at: PAST },
      error: null,
    })
    expect((await run()).payload.outcomes[USER_ID]).toBe("already_purged")

    expect(mockDeleteUser).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("aborts before anything destructive when the request lookup fails", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "db offline" } })

    const { payload } = await run()

    expect(payload.outcomes[USER_ID]).toBe("lookup_failed")
    expect(mockGetUserById).not.toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it("aborts before anything destructive when the contact lookup fails", async () => {
    mockGetUserById.mockResolvedValue({ data: null, error: { message: "gotrue offline" } })

    const { payload } = await run()

    expect(payload.outcomes[USER_ID]).toBe("lookup_failed")
    // Sem endereço não há limpeza por endereço, e sem ela a purga seria parcial.
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it("aborts before the credential purge when the contact cleanup fails", async () => {
    contactResult = { data: null, error: { message: "deadlock detected" } }

    const { payload } = await run()

    expect(payload.outcomes[USER_ID]).toBe("contact_failed")
    expect(mockDeleteUser).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalledWith("finalize_account_deletion", expect.anything())
  })

  it("deduplicates the batch before touching anything", async () => {
    await run(JSON.stringify({ user_ids: [USER_ID, USER_ID, USER_ID] }))

    expect(mockGetUserById).toHaveBeenCalledTimes(1)
    expect(mockDeleteUser).toHaveBeenCalledTimes(1)
  })

  it("purges a due request: contact data, media, soft delete, finalize", async () => {
    mockList.mockResolvedValueOnce({ data: [{ name: "avatar.png" }], error: null })
    mockList.mockResolvedValueOnce({ data: [{ name: "documento.pdf" }], error: null })

    const { response, payload } = await run()

    expect(response.status).toBe(200)
    expect(payload.outcomes[USER_ID]).toBe("purged")

    expect(mockRemove).toHaveBeenCalledWith([`${USER_ID}/avatar.png`])
    expect(mockRemove).toHaveBeenCalledWith([`${USER_ID}/documento.pdf`])

    // Soft delete, nunca hard delete: o conteúdo público depende da linha de
    // auth.users sobreviver (posts/comments são ON DELETE CASCADE).
    expect(mockDeleteUser).toHaveBeenCalledWith(USER_ID, true)

    // A limpeza por endereço vem ANTES do soft delete, que troca o e-mail.
    expect(mockRpc).toHaveBeenCalledWith("purge_account_contact_data", {
      p_user_id: USER_ID,
      p_contact_email: "titular@example.invalid",
    })
    expect(mockRpc).toHaveBeenCalledWith("finalize_account_deletion", { p_user_id: USER_ID })

    // A posse e resolvida ANTES de a credencial sumir: comunidade sem dono,
    // anuncio de telefone que nao existe e pedido com uma ponta muda nascem
    // exatamente de apagar primeiro (RECON-052-FOLLOWUP).
    expect(mockRpc).toHaveBeenCalledWith("settle_account_possessions", { p_user_id: USER_ID })

    const contactOrder = mockRpc.mock.invocationCallOrder[0] ?? 0
    const settleOrder = mockRpc.mock.invocationCallOrder[1] ?? 0
    const deleteOrder = mockDeleteUser.mock.invocationCallOrder[0] ?? 0
    const finalizeOrder = mockRpc.mock.invocationCallOrder[2] ?? 0
    expect(contactOrder).toBeLessThan(settleOrder)
    expect(settleOrder).toBeLessThan(deleteOrder)
    expect(deleteOrder).toBeLessThan(finalizeOrder)
  })

  it("keeps paginating the bucket instead of stopping at the first page", async () => {
    const fullPage = Array.from({ length: 100 }, (_, index) => ({ name: "f" + index }))
    mockList.mockResolvedValueOnce({ data: fullPage, error: null })
    mockList.mockResolvedValueOnce({ data: [{ name: "resto.png" }], error: null })
    mockList.mockResolvedValue({ data: [], error: null })

    const { payload } = await run()

    expect(payload.outcomes[USER_ID]).toBe("purged")
    expect(mockList).toHaveBeenCalledWith(USER_ID, { limit: 100, offset: 100 })
    expect(mockRemove).toHaveBeenCalledWith([`${USER_ID}/resto.png`])
  })

  it("does not finalize when a bucket page fails", async () => {
    mockList.mockResolvedValue({ data: null, error: { message: "storage offline" } })

    const { payload } = await run()

    expect(payload.outcomes[USER_ID]).toBe("media_failed")
    expect(mockDeleteUser).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalledWith("finalize_account_deletion", expect.anything())
  })

  it("does not touch the credential when the personal media purge fails", async () => {
    mockList.mockResolvedValue({ data: null, error: { message: "storage offline" } })

    const { payload } = await run()

    expect(payload.outcomes[USER_ID]).toBe("media_failed")
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it("records the finalize failure on the request row instead of purging", async () => {
    finalizeResult = { data: null, error: { message: "deadlock detected" } }
    let failureRecorded: unknown = null
    mockRpc.mockImplementation((name: string, args: Record<string, unknown>) => {
      if (name === "purge_account_contact_data") return Promise.resolve(contactResult)
      if (name === "settle_account_possessions") return Promise.resolve({ data: null, error: null })
      if (args["p_error"]) {
        failureRecorded = args
        return Promise.resolve({ data: "failed", error: null })
      }
      return Promise.resolve(finalizeResult)
    })

    const { payload } = await run()

    expect(payload.outcomes[USER_ID]).toBe("finalize_failed")
    expect(failureRecorded).toEqual({ p_user_id: USER_ID, p_error: "deadlock detected" })
  })

  it("never logs the contact address", async () => {
    const info = vi.spyOn(console, "log").mockImplementation(() => {})
    const error = vi.spyOn(console, "error").mockImplementation(() => {})

    await run()

    const logged = [...info.mock.calls, ...error.mock.calls].flat().join(" ")
    expect(logged).not.toContain("titular@example.invalid")
    info.mockRestore()
    error.mockRestore()
  })
})
