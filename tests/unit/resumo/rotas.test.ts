import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { GET } from "web/app/api/app/resumo/descadastro/route"
import { POST } from "web/app/api/internal/resumo/route"
import { createServerClient } from "web/lib/supabase/server"

const rpc = vi.fn()
vi.mocked(createServerClient).mockReturnValue({ rpc } as never)
afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})
describe("job e descadastro do resumo", () => {
  it("job sem configuração e sem segredo não acessa o banco", async () => {
    vi.stubEnv("OUTBOX_WORKER_SECRET", "")
    expect(
      (await POST(new Request("http://localhost/api/internal/resumo", { method: "POST" }))).status,
    ).toBe(503)
    vi.stubEnv("OUTBOX_WORKER_SECRET", "synthetic-worker-secret")
    expect(
      (await POST(new Request("http://localhost/api/internal/resumo", { method: "POST" }))).status,
    ).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
  })
  it("job autenticado chama só a função limitada e falha fechado", async () => {
    vi.stubEnv("OUTBOX_WORKER_SECRET", "synthetic-worker-secret")
    const request = () =>
      new Request("http://localhost/api/internal/resumo", {
        method: "POST",
        headers: { "x-outbox-secret": "synthetic-worker-secret" },
      })
    rpc.mockResolvedValueOnce({ data: 2, error: null })
    expect(await (await POST(request())).json()).toEqual({ enfileirados: 2 })
    expect(rpc).toHaveBeenCalledWith("enqueue_city_digests")
    rpc.mockResolvedValueOnce({ data: null, error: { message: "segredo" } })
    expect((await POST(request())).status).toBe(503)
    rpc.mockRejectedValueOnce(new Error("segredo"))
    expect((await POST(request())).status).toBe(503)
  })
  it("link aleatório desliga sem cookie e não vaza token na página", async () => {
    const token = "a".repeat(64)
    rpc.mockResolvedValue({ data: true, error: null })
    const response = await GET(
      new Request(`http://localhost/api/app/resumo/descadastro?token=${token}`),
    )
    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith("unsubscribe_city_digest", { p_token: token })
    const html = await response.text()
    expect(html).toContain("não receberá mais")
    expect(html).not.toContain(token)
    expect(response.headers.get("referrer-policy")).toBe("no-referrer")
    expect(response.headers.get("cache-control")).toBe("no-store")
  })
  it("token inválido não consulta, expirado é 400 e indisponibilidade é 503", async () => {
    expect((await GET(new Request("http://localhost/?token=ruim"))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
    const url = `http://localhost/?token=${"b".repeat(64)}`
    rpc.mockResolvedValueOnce({ data: false, error: null })
    expect((await GET(new Request(url))).status).toBe(400)
    rpc.mockResolvedValueOnce({ data: null, error: {} })
    expect((await GET(new Request(url))).status).toBe(503)
    rpc.mockRejectedValueOnce(new Error("boom"))
    expect((await GET(new Request(url))).status).toBe(503)
  })
})
