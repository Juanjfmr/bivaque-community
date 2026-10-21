import { beforeEach, describe, expect, it, vi } from "vitest"
import { uploadServiceRequestPhotoAction } from "web/app/(shell)/pedidos/novo/actions"

// SEC-006 (reparo 2026-10-19, tentativa 2) — o mesmo contrato do Mercado vale
// para o anexo do pedido: recusa SQL definitiva (erro com código) limpa apenas o
// objeto desta chamada; erro de transporte/erro sem código é inconclusivo e
// preserva os bytes. Não há SELECT imediato, porque ele não prova rollback.

const mocks = vi.hoisted(() => {
  const state = {
    requestOwned: true,
    rpcError: null as null | { message: string; code?: string },
    rpcThrows: false,
    previous: null as string | null,
    removeError: null as null | { message: string },
    removeThrows: false,
  }
  const upload = vi.fn()
  const remove = vi.fn()
  const rpc = vi.fn()
  const getUser = vi.fn()
  const from = vi.fn()

  function chain(name: string) {
    const result = () =>
      name === "service_requests"
        ? { data: state.requestOwned ? { id: "fixture-request" } : null, error: null }
        : { data: null, error: null }
    const builder = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      upsert: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      maybeSingle: async () => result(),
      single: async () => result(),
      // biome-ignore lint/suspicious/noThenProperty: PostgREST query builders are intentionally thenable.
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    }
    return builder
  }

  const user = {
    auth: { getUser },
    rpc,
    from: vi.fn((name: string) => {
      from(name)
      return chain(name)
    }),
  }
  const service = {
    from: vi.fn((name: string) => {
      from(name)
      return chain(name)
    }),
    storage: { from: vi.fn(() => ({ upload, remove })) },
  }
  return { state, upload, remove, rpc, getUser, from, user, service }
})

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("@supabase/ssr", () => ({ createServerClient: () => mocks.user }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => mocks.service }))
vi.mock("web/lib/storage/sanitize-image", () => ({
  sanitizeImage: vi.fn(async () => Buffer.from("sanitized")),
}))

const MB = 1024 * 1024

function jpeg(name = "foto.jpg"): File {
  return new File([new Uint8Array(MB)], name, { type: "image/jpeg" })
}

function png(name = "foto.png"): File {
  return new File([new Uint8Array(MB)], name, { type: "image/png" })
}

function form(file: File, position = "0"): FormData {
  const data = new FormData()
  data.set("requestId", "fixture-request")
  data.set("position", position)
  data.set("photo", file)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-anon-key")
  mocks.state.requestOwned = true
  mocks.state.rpcError = null
  mocks.state.rpcThrows = false
  mocks.state.previous = null
  mocks.state.removeError = null
  mocks.state.removeThrows = false
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null })
  mocks.upload.mockResolvedValue({ error: null })
  mocks.remove.mockImplementation(async () => {
    if (mocks.state.removeThrows) throw new Error("storage indisponível")
    return { error: mocks.state.removeError }
  })
  mocks.rpc.mockImplementation(async () => {
    if (mocks.state.rpcThrows) throw new Error("resposta perdida")
    return { data: mocks.state.previous, error: mocks.state.rpcError }
  })
})

describe("SEC-006 vínculo do anexo do pedido", () => {
  it("grava o objeto e registra a linha pela RPC transacional", async () => {
    const result = await uploadServiceRequestPhotoAction(form(jpeg()))

    expect(result).toEqual({ ok: true })
    const [uploadedPath] = mocks.upload.mock.calls[0] as [string]
    expect(uploadedPath).toMatch(/^fixture-request\/0-.*\.jpg$/)
    expect(mocks.rpc).toHaveBeenCalledWith("register_service_request_photo", {
      p_request_id: "fixture-request",
      p_path: uploadedPath,
      p_position: 0,
    })
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it("recusa SQL definitiva compensa somente o objeto desta chamada", async () => {
    mocks.state.rpcError = { message: "linha recusada", code: "23505" }

    const result = await uploadServiceRequestPhotoAction(form(jpeg()))

    const [uploadedPath] = mocks.upload.mock.calls[0] as [string]
    expect(result).toEqual({
      error: "Não foi possível registrar a foto.",
      definite: true,
      cleanupFailed: false,
      indeterminate: false,
    })
    expect(mocks.remove).toHaveBeenCalledWith([uploadedPath])
  })

  it("erro de transporte é inconclusivo e preserva o objeto", async () => {
    mocks.state.rpcThrows = true

    const result = await uploadServiceRequestPhotoAction(form(jpeg()))

    expect(result).toEqual({
      error:
        "Não foi possível confirmar o envio da foto. Recarregue o pedido antes de tentar novamente.",
      definite: false,
      cleanupFailed: false,
      indeterminate: true,
    })
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it("erro sem código SQL é inconclusivo, sem SELECT imediato", async () => {
    mocks.state.rpcError = { message: "gateway timeout" }

    const result = await uploadServiceRequestPhotoAction(form(jpeg()))

    expect(result).toMatchObject({ definite: false, indeterminate: true })
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalledWith("service_request_photos")
  })

  it("commit atrasado depois de throw mantém os bytes e permite retry", async () => {
    let committed = false
    mocks.rpc.mockImplementation(async (_name: string, args: { p_path: string }) => {
      if (!committed) {
        committed = true
        mocks.state.previous = args.p_path
        throw new Error("resposta perdida")
      }
      const old = mocks.state.previous
      mocks.state.previous = args.p_path
      return { data: old, error: null }
    })

    const first = await uploadServiceRequestPhotoAction(form(jpeg("primeira.jpg")))
    const firstPath = mocks.upload.mock.calls[0]?.[0] as string
    expect(first).toMatchObject({ definite: false, indeterminate: true })
    expect(mocks.remove).not.toHaveBeenCalled()

    const second = await uploadServiceRequestPhotoAction(form(png("segunda.png")))
    expect(second).toEqual({ ok: true })
    expect(mocks.remove).toHaveBeenCalledWith([firstPath])
  })

  it("troca JPEG por PNG na mesma posição e remove o anterior só depois do commit", async () => {
    let previous: string | null = null
    mocks.rpc.mockImplementation(async (_name: string, args: { p_path: string }) => {
      const old = previous
      previous = args.p_path
      return { data: old, error: null }
    })

    await uploadServiceRequestPhotoAction(form(jpeg("primeira.jpg")))
    const firstPath = mocks.upload.mock.calls[0]?.[0] as string

    const second = await uploadServiceRequestPhotoAction(form(png("segunda.png")))

    const secondCall = mocks.rpc.mock.calls[1]?.[1] as { p_path: string }
    expect(second).toEqual({ ok: true })
    expect(secondCall.p_path).toMatch(/\.png$/)
    expect(secondCall.p_path).not.toBe(firstPath)
    expect(mocks.remove).toHaveBeenCalledWith([firstPath])
  })

  it("registra falha de limpeza da recusa definitiva", async () => {
    mocks.state.rpcError = { message: "posição inválida", code: "22023" }
    mocks.state.removeError = { message: "storage indisponível" }

    const result = await uploadServiceRequestPhotoAction(form(jpeg()))

    expect(result).toMatchObject({ definite: true, cleanupFailed: true })
  })

  it("não grava nem registra quando o upload falha", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "bucket recusou" } })

    const result = await uploadServiceRequestPhotoAction(form(jpeg()))

    expect(result).toMatchObject({ error: expect.any(String) })
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it("recusa outro dono antes de qualquer gravação", async () => {
    mocks.state.requestOwned = false

    const result = await uploadServiceRequestPhotoAction(form(jpeg()))

    expect(result).toEqual({ error: "O pedido não existe ou não é seu." })
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("recusa posição fora do teto antes de qualquer gravação", async () => {
    const result = await uploadServiceRequestPhotoAction(form(jpeg(), "6"))

    expect(result).toEqual({ error: "Posição de foto inválida." })
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
