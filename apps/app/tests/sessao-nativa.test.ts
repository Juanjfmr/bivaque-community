import { beforeEach, describe, expect, it, vi } from "vitest"

const cofre = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() }))
vi.mock("capacitor-secure-storage-plugin", () => ({ SecureStoragePlugin: cofre }))
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }))
const app = vi.hoisted(() => ({ addListener: vi.fn() }))
vi.mock("@capacitor/app", () => ({ App: app }))

import { enviar, ler } from "@/lib/api/cliente"
import { iniciarCicloDaSessao } from "@/lib/nativo/ciclo"
import { limparMemoria, renovarSessao } from "@/lib/nativo/sessao"

const par = () =>
  new Response(
    JSON.stringify({
      access_token: "acesso-sintetico",
      refresh_token: "renovacao-sintetica",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    }),
  )

describe("sessão nativa", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    limparMemoria()
    vi.stubEnv("VITE_API_BASE", "https://api.example.invalid")
    cofre.get.mockResolvedValue({ value: "token-sintetico" })
    cofre.set.mockResolvedValue({ value: true })
    cofre.remove.mockResolvedValue({ value: true })
    app.addListener.mockResolvedValue({ remove: vi.fn() })
  })

  it("renova uma vez para concorrentes antes de liberar os pedidos", async () => {
    const buscar = vi.fn().mockResolvedValue(par())
    vi.stubGlobal("fetch", buscar)
    const valores = await Promise.all([renovarSessao(), renovarSessao()])
    expect(valores).toEqual(["acesso-sintetico", "acesso-sintetico"])
    expect(buscar).toHaveBeenCalledTimes(1)
    expect(cofre.set).toHaveBeenCalledTimes(1)
  })

  it("mantém o novo par em memória se a gravação falha", async () => {
    cofre.set.mockRejectedValue(new Error("cofre"))
    const buscar = vi.fn().mockImplementation(async () => par())
    vi.stubGlobal("fetch", buscar)
    await renovarSessao()
    await renovarSessao()
    expect(JSON.parse(buscar.mock.calls[1]?.[1].body).refresh_token).toBe("renovacao-sintetica")
  })

  it("limpa o cofre somente na recusa definitiva", async () => {
    for (const status of [429, 503]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })))
      await expect(renovarSessao()).rejects.toThrow()
      expect(cofre.remove).not.toHaveBeenCalled()
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })))
    expect(await renovarSessao()).toBeNull()
    expect(cofre.remove).toHaveBeenCalledTimes(1)
  })

  it("não apaga o cofre quando falta rede", async () => {
    vi.useFakeTimers()
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede")))
    const resultado = renovarSessao().catch(() => null)
    await vi.runAllTimersAsync()
    await resultado
    expect(cofre.remove).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it("repete leitura após 401, mas nunca escrita", async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(par())
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(par())
      .mockResolvedValueOnce(new Response("{}"))
    vi.stubGlobal("fetch", buscar)
    await ler("/api/app/exemplo")
    expect(buscar).toHaveBeenCalledTimes(4)
    buscar.mockResolvedValueOnce(new Response("{}", { status: 401 }))
    await expect(enviar("POST", "/api/app/exemplo")).rejects.toMatchObject({ status: 401 })
    expect(buscar).toHaveBeenCalledTimes(5)
  })

  it("renova ao abrir e só renova na volta perto do vencimento", async () => {
    const buscar = vi.fn().mockResolvedValue(par())
    vi.stubGlobal("fetch", buscar)
    await iniciarCicloDaSessao()
    const ouvinte = app.addListener.mock.calls[0]?.[1]
    ouvinte({ isActive: true })
    expect(buscar).toHaveBeenCalledTimes(1)
    limparMemoria()
    ouvinte({ isActive: true })
    await vi.waitFor(() => expect(buscar).toHaveBeenCalledTimes(2))
  })
  it("renova na volta quando faltam menos de cinco minutos", async () => {
    const buscar = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "acesso-sintetico",
            refresh_token: "renovacao-sintetica",
            expires_at: Math.floor(Date.now() / 1000) + 299,
          }),
        ),
    )
    vi.stubGlobal("fetch", buscar)
    await iniciarCicloDaSessao()
    app.addListener.mock.calls[0]?.[1]({ isActive: true })
    await vi.waitFor(() => expect(buscar).toHaveBeenCalledTimes(2))
  })
})
