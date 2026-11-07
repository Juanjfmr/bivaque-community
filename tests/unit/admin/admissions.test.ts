import { beforeEach, describe, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({ rpc: vi.fn(), remove: vi.fn(), getUser: vi.fn() }))
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mock.getUser } }),
}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({
  createServerClient: () => ({
    rpc: mock.rpc,
    storage: { from: () => ({ remove: mock.remove }) },
  }),
}))

import {
  decideDocumentAction,
  purgeDocumentsAction,
  rejectPendingUserAction,
  reprocessUserAction,
} from "web/app/(admin)/admissions/actions"

const ID = "10000000-0000-4000-8000-000000000001"

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-placeholder")
  mock.getUser.mockResolvedValue({ data: { user: { id: ID } } })
  mock.rpc.mockImplementation(async (name: string) => ({
    data: name === "is_current_user_operator" ? true : [],
    error: null,
  }))
  mock.remove.mockResolvedValue({ error: null })
})

describe("admissões do operador", () => {
  it("aprova com identidade da sessão e descarta pela fila durável", async () => {
    mock.rpc.mockImplementation(async (name: string) => ({
      data:
        name === "is_current_user_operator"
          ? true
          : name === "prepare_operator_document_removals"
            ? [{ storage_object_path: "documento.pdf" }]
            : null,
      error: null,
    }))
    expect(await decideDocumentAction(ID, "approved", "")).toEqual({ ok: true })
    expect(mock.rpc).toHaveBeenCalledWith("decide_verification_document", {
      p_document_id: ID,
      p_decision: "approved",
      p_reason: "",
      p_operator_user_id: ID,
    })
    expect(mock.remove).toHaveBeenCalledWith(["documento.pdf"])
    expect(mock.rpc).toHaveBeenCalledWith("complete_verification_document_removal", {
      p_storage_object_path: "documento.pdf",
    })
  })

  it.each([
    () => decideDocumentAction(ID, "approved", ""),
    () => decideDocumentAction(ID, "rejected", "Documento ilegível"),
    () => reprocessUserAction(ID),
    () => rejectPendingUserAction(ID, "Encerramento"),
    () => purgeDocumentsAction(),
  ])("recusa não operador antes da ação privilegiada", async (action) => {
    mock.rpc.mockResolvedValue({ data: false, error: null })
    expect(await action()).toEqual({ ok: false, error: "forbidden" })
    expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual(["is_current_user_operator"])
    expect(mock.remove).not.toHaveBeenCalled()
  })

  it("recusa decisão forjada e recusa sem motivo", async () => {
    expect(await decideDocumentAction(ID, "forged" as "approved", "")).toMatchObject({ ok: false })
    expect(await decideDocumentAction(ID, "rejected", " ")).toMatchObject({ ok: false })
    expect(mock.rpc.mock.calls.every(([name]) => name === "is_current_user_operator")).toBe(true)
  })

  it("mantém remoção pendente sem fingir reverter a decisão", async () => {
    mock.rpc.mockImplementation(async (name: string) => ({
      data: name === "is_current_user_operator" ? true : [{ storage_object_path: "objeto.pdf" }],
      error: null,
    }))
    mock.remove.mockResolvedValue({ error: { message: "storage indispon?vel" } })
    expect(await decideDocumentAction(ID, "rejected", "Ilegível")).toEqual({
      ok: true,
      warning: "purge-pending",
    })
    expect(
      mock.rpc.mock.calls.some(([name]) => name === "complete_verification_document_removal"),
    ).toBe(false)
  })

  it("falha de decisão não dispara descarte", async () => {
    mock.rpc.mockImplementation(async (name: string) => ({
      data: name === "is_current_user_operator" ? true : null,
      error: name === "decide_verification_document" ? { message: "already reviewed" } : null,
    }))
    expect(await decideDocumentAction(ID, "approved", "")).toMatchObject({ ok: false })
    expect(mock.remove).not.toHaveBeenCalled()
  })
})
