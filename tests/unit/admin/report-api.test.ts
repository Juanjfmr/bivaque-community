import { NextResponse } from "next/server"
import { beforeEach, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({ session: vi.fn(), write: vi.fn(), rpc: vi.fn() }))
vi.mock("web/lib/app-api/rota-do-app", () => ({
  exigirSessao: mock.session,
  conferirEscrita: mock.write,
  lerCorpoJson: async (request: Request) => {
    try {
      return { ok: true, corpo: await request.json() }
    } catch {
      return { ok: false, status: 400 }
    }
  },
  responder: (_request: Request, body: unknown, status: number) =>
    NextResponse.json(body, { status }),
  opcoesDoApp: () => new NextResponse(null, { status: 204 }),
}))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => ({ rpc: mock.rpc }) }))

import { POST } from "web/app/api/admin/reports/[id]/route"

const ID = "24000000-0000-4000-8000-000000000002"
const OP = "10000000-0000-4000-8000-000000000002"
const params = { params: Promise.resolve({ id: ID }) }
function request(action: unknown) {
  return new Request("https://example.invalid", {
    method: "POST",
    body: JSON.stringify({ action, note: "Regra" }),
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  mock.session.mockResolvedValue({ ok: true, sessao: { via: "bearer", usuario: { id: OP } } })
  mock.write.mockReturnValue("ok")
  mock.rpc.mockImplementation(async (name: string) => ({
    data: name === "is_current_user_operator" ? true : null,
    error: null,
  }))
})
it.each(["hide", "resolve", "remove"])("operador decide %s pela API", async (action) => {
  expect((await POST(request(action), params)).status).toBe(200)
  expect(mock.rpc).toHaveBeenCalledWith("resolve_report", {
    p_action: action === "resolve" ? "dismiss" : action,
    p_note: "Regra",
    p_operator_user_id: OP,
    p_report_id: ID,
  })
})
it.each(["hide", "resolve", "remove"])("não operador recebe 403 em %s", async (action) => {
  mock.rpc.mockResolvedValue({ data: false, error: null })
  expect((await POST(request(action), params)).status).toBe(403)
  expect(mock.rpc).toHaveBeenCalledTimes(1)
})
it("sessão recusada e CSRF recusado não chegam ao privilégio", async () => {
  mock.session.mockResolvedValueOnce({
    ok: false,
    resposta: NextResponse.json({}, { status: 401 }),
  })
  expect((await POST(request("hide"), params)).status).toBe(401)
  mock.write.mockReturnValueOnce("origem-recusada")
  expect((await POST(request("hide"), params)).status).toBe(403)
  expect(mock.rpc).not.toHaveBeenCalled()
})
it("não converte array ou objeto em decisão válida", async () => {
  for (const action of [["hide"], {}, null]) {
    expect((await POST(request(action), params)).status).toBe(400)
  }
  expect(mock.rpc.mock.calls.some(([name]) => name === "resolve_report")).toBe(false)
})
