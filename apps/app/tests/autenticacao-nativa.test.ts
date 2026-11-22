import { webcrypto } from "node:crypto"
import { beforeEach, expect, it, vi } from "vitest"

const f = vi.hoisted(() => ({
  addListener: vi.fn(),
  getLaunchUrl: vi.fn(),
  close: vi.fn(),
  ler: vi.fn(),
  apagar: vi.fn(),
  requisitar: vi.fn(),
  aceitar: vi.fn(),
}))
vi.mock("@capacitor/app", () => ({ App: f }))
vi.mock("@capacitor/browser", () => ({ Browser: f }))
vi.mock("@/lib/nativo/cofre", () => ({ lerPkce: f.ler, apagarPkce: f.apagar, gravarPkce: vi.fn() }))
vi.mock("@/lib/api/cliente", () => ({ requisitar: f.requisitar }))
vi.mock("@/lib/nativo/sessao", () => ({ aceitarPar: f.aceitar }))

import { rotaDoLink } from "@/lib/nativo/link"
import { desafioPkce } from "@/lib/nativo/pkce"
import { ouvirAutenticacao, receberAutenticacao } from "@/src/nativo/autenticacao"

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal("crypto", webcrypto)
  vi.stubGlobal("PopStateEvent", class {})
  vi.stubGlobal("window", {
    history: { replaceState: vi.fn() },
    location: { reload: vi.fn() },
    dispatchEvent: vi.fn(),
  })
  f.addListener.mockResolvedValue({})
  f.getLaunchUrl.mockResolvedValue(null)
  f.close.mockResolvedValue(undefined)
  f.apagar.mockResolvedValue(undefined)
  f.aceitar.mockResolvedValue(undefined)
  f.requisitar.mockResolvedValue(new Response(JSON.stringify({ ok: true })))
})

it("calcula S256 conforme o vetor conhecido", async () => {
  expect(await desafioPkce("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  )
})

it.each(["evento", "abertura"])("aceita retorno por %s uma única vez", async (modo) => {
  f.ler
    .mockResolvedValueOnce({ verificador: "verificador", criadoEm: Date.now() })
    .mockResolvedValue(null)
  if (modo === "abertura")
    f.getLaunchUrl.mockResolvedValue({ url: "bivaque://auth-callback?code=sintetico" })
  await ouvirAutenticacao()
  if (modo === "evento") {
    f.addListener.mock.calls[0]?.[1]({ url: "bivaque://auth-callback?code=sintetico" })
    await vi.waitFor(() => expect(f.aceitar).toHaveBeenCalledTimes(1))
  }
  await receberAutenticacao("bivaque://auth-callback?code=sintetico")
  expect(f.requisitar).toHaveBeenCalledTimes(1)
  expect(f.apagar).toHaveBeenCalledTimes(2)
  expect(rotaDoLink("bivaque://auth-callback?code=sintetico", undefined)).toBeNull()
})

it.each([null, { verificador: "v", criadoEm: Date.now() - 600001 }])(
  "ignora retorno sem fluxo válido",
  async (fluxo) => {
    f.ler.mockResolvedValue(fluxo)
    await receberAutenticacao("bivaque://auth-callback?code=sintetico")
    expect(f.apagar).toHaveBeenCalled()
    expect(f.requisitar).not.toHaveBeenCalled()
    expect(window.history.replaceState).not.toHaveBeenCalled()
    expect(window.dispatchEvent).not.toHaveBeenCalled()
    expect(f.close).toHaveBeenCalled()
  },
)

it("apaga o fluxo antes da troca mesmo se ela falhar", async () => {
  f.ler.mockResolvedValueOnce({ verificador: "v", criadoEm: Date.now() }).mockResolvedValue(null)
  f.requisitar.mockRejectedValue(new Error("rede"))
  await receberAutenticacao("bivaque://auth-callback?code=sintetico")
  await receberAutenticacao("bivaque://auth-callback?code=sintetico")
  expect(f.requisitar).toHaveBeenCalledTimes(1)
  expect(f.apagar.mock.invocationCallOrder[0]).toBeLessThan(
    f.requisitar.mock.invocationCallOrder[0] ?? 0,
  )
})

it("ignora erro do provedor sem sair da tela", async () => {
  f.ler.mockResolvedValue({ verificador: "v", criadoEm: Date.now() })
  await receberAutenticacao("bivaque://auth-callback?error=cancelado")
  expect(window.history.replaceState).not.toHaveBeenCalled()
  expect(window.dispatchEvent).not.toHaveBeenCalled()
  expect(f.close).toHaveBeenCalled()
})
