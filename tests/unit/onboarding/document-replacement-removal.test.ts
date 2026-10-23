import { beforeEach, describe, expect, it, vi } from "vitest"
import { uploadVerificationDocumentAction } from "web/app/(preauth)/onboarding/document-actions"

// PORT-004, P2 da revisão (terceira correção): o arquivo substituído não pode
// ficar para sempre no bucket. A fila nasce na MESMA transação da troca, dentro
// de replace_verification_document; a action só apaga o objeto do bucket (duas
// tentativas) e, quando a remoção funciona, apaga a linha da fila por
// complete_verification_document_removal. Se a remoção falha, a linha fica para
// o processador da fila. Estes testes fixam as três saídas — remoção na
// primeira tentativa, na segunda e o resto na fila — sem depender do Storage
// nem do banco.

const SUPERSEDED_PATH = "fixture-user/superseded-document.pdf"
const NEW_PATH_PREFIX = "fixture-user/"

const mocks = vi.hoisted(() => {
  const rpc = vi.fn()
  const upload = vi.fn()
  const remove = vi.fn()
  const storageFrom = vi.fn(() => ({
    upload,
    remove,
    list: async () => ({ data: [], error: null }),
  }))
  const getUser = vi.fn()
  const membership = {
    select: () => membership,
    eq: () => membership,
    limit: () => membership,
    maybeSingle: async () => ({ data: null, error: null }),
  }
  const service = {
    auth: { getUser },
    from: vi.fn(() => membership),
    rpc,
    storage: { from: storageFrom },
  }
  return { rpc, upload, remove, storageFrom, getUser, service }
})

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => mocks.service }))
vi.mock("web/lib/onboarding/document-status", () => ({
  readDocumentPaths: async () => [],
  readDocumentStatus: async () => ({ situation: "in_review", uploadedAt: null }),
}))

const PDF = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`

function identityDocument() {
  return new File([PDF], "identity.pdf", { type: "application/pdf" })
}

function formWithDocument() {
  const form = new FormData()
  form.set("document", identityDocument())
  return form
}

function replacementRpc() {
  return {
    data: [{ document_id: "fixture-document", replaced_storage_object_path: SUPERSEDED_PATH }],
    error: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-anon-key")
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null })
  mocks.upload.mockResolvedValue({ error: null })
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === "has_accepted_consent") return { data: true, error: null }
    if (name === "replace_verification_document") return replacementRpc()
    return { data: null, error: null }
  })
})

function completionCalls() {
  return mocks.rpc.mock.calls.filter(([name]) => name === "complete_verification_document_removal")
}

describe("troca do documento em análise: remoção do arquivo substituído", () => {
  it("remove o arquivo antigo na primeira tentativa e fecha a linha da fila", async () => {
    mocks.remove.mockResolvedValue({ error: null })

    await expect(uploadVerificationDocumentAction(formWithDocument())).resolves.toEqual({
      ok: true,
    })

    expect(mocks.storageFrom).toHaveBeenCalledWith("verification-documents")
    expect(mocks.remove).toHaveBeenCalledOnce()
    expect(mocks.remove).toHaveBeenCalledWith([SUPERSEDED_PATH])
    expect(completionCalls()).toHaveLength(1)
    expect(completionCalls()[0]?.[1]).toEqual({ p_storage_object_path: SUPERSEDED_PATH })
    expect(mocks.upload.mock.calls[0]?.[0]).toMatch(NEW_PATH_PREFIX)
  })

  it("tenta a remoção de novo e fecha a fila quando a segunda tentativa funciona", async () => {
    mocks.remove
      .mockResolvedValueOnce({ error: { message: "storage unavailable" } })
      .mockResolvedValueOnce({ error: null })

    await expect(uploadVerificationDocumentAction(formWithDocument())).resolves.toEqual({
      ok: true,
    })

    expect(mocks.remove).toHaveBeenCalledTimes(2)
    expect(completionCalls()).toHaveLength(1)
  })

  it("deixa o caminho na fila depois de duas falhas e mantém o envio", async () => {
    mocks.remove.mockResolvedValue({ error: { message: "storage unavailable" } })

    await expect(uploadVerificationDocumentAction(formWithDocument())).resolves.toEqual({
      ok: true,
    })

    expect(mocks.remove).toHaveBeenCalledTimes(2)
    expect(completionCalls()).toHaveLength(0)
  })

  it("registra o envio mesmo quando a conclusão da fila falha", async () => {
    mocks.remove.mockResolvedValue({ error: null })
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "has_accepted_consent") return { data: true, error: null }
      if (name === "replace_verification_document") return replacementRpc()
      return { data: null, error: { message: "queue unavailable", code: "PGRST202" } }
    })

    await expect(uploadVerificationDocumentAction(formWithDocument())).resolves.toEqual({
      ok: true,
    })

    expect(completionCalls()).toHaveLength(1)
  })

  it("não tenta remover nem fechar a fila quando não houve arquivo substituído", async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "has_accepted_consent") return { data: true, error: null }
      if (name === "replace_verification_document") {
        return {
          data: [{ document_id: "fixture-document", replaced_storage_object_path: null }],
          error: null,
        }
      }
      return { data: null, error: null }
    })

    await expect(uploadVerificationDocumentAction(formWithDocument())).resolves.toEqual({
      ok: true,
    })

    expect(mocks.remove).not.toHaveBeenCalled()
    expect(completionCalls()).toHaveLength(0)
  })
})
