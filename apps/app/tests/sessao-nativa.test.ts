import { beforeEach, describe, expect, it, vi } from "vitest"

const cofre = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  setSynchronize: vi.fn(),
  setDefaultKeychainAccess: vi.fn(),
  setKeyPrefix: vi.fn(),
}))
vi.mock("@aparajita/capacitor-secure-storage", () => ({
  SecureStorage: cofre,
  KeychainAccess: { afterFirstUnlockThisDeviceOnly: 3 },
}))
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }))
const app = vi.hoisted(() => ({ addListener: vi.fn() }))
vi.mock("@capacitor/app", () => ({ App: app }))

import { enviar, ler } from "@/lib/api/cliente"
import { iniciarCicloDaSessao } from "@/lib/nativo/ciclo"
import { aceitarPar, acessoAtual, limparMemoria, renovarSessao } from "@/lib/nativo/sessao"
import { verificarCodigo } from "@/src/entrada/servidor"

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
    cofre.get.mockResolvedValue("token-sintetico")
    cofre.set.mockResolvedValue(undefined)
    cofre.remove.mockResolvedValue(true)
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

it("tenta novamente em outra renovação após falha de rede", async () => {
  vi.useFakeTimers()
  vi.stubEnv("VITE_API_BASE", "https://api.example.invalid")
  limparMemoria()
  cofre.get.mockResolvedValue("renovacao")
  cofre.set.mockResolvedValue(undefined)
  const buscar = vi.fn().mockRejectedValue(new Error("rede"))
  vi.stubGlobal("fetch", buscar)
  const primeira = renovarSessao().catch(() => null)
  await vi.runAllTimersAsync()
  await primeira
  await vi.advanceTimersByTimeAsync(11_000)
  buscar.mockResolvedValue(par())
  expect(await renovarSessao()).toBe("acesso-sintetico")
  vi.useRealTimers()
})

it("descarta renovação concluída após a limpeza", async () => {
  limparMemoria()
  cofre.get.mockResolvedValue("renovacao")
  let resolver: (resposta: Response) => void = () => undefined
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolver = resolve
        }),
    ),
  )
  const promessa = renovarSessao()
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
  limparMemoria()
  cofre.get.mockResolvedValue(null)
  resolver(par())
  expect(await promessa).toBeNull()
  expect(await acessoAtual()).toBeNull()
})

it("falha transitoria preserva sessao e nao redireciona", async () => {
  vi.useFakeTimers()
  limparMemoria()
  cofre.set.mockResolvedValue(undefined)
  await aceitarPar({
    access_token: "anterior",
    refresh_token: "renovacao",
    expires_at: Math.floor(Date.now() / 1000) + 20,
  })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
  const resultado = ler("/api/app/exemplo").catch((erro: unknown) => erro)
  await vi.runAllTimersAsync()
  expect(await resultado).toMatchObject({ codigo: "indisponivel" })
  expect(cofre.remove).not.toHaveBeenCalled()
  vi.useRealTimers()
})

it("respeita Retry-After e inclui o timeout na janela", async () => {
  vi.useFakeTimers()
  limparMemoria()
  cofre.get.mockResolvedValue("renovacao")
  const instantes: number[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => {
      instantes.push(Date.now())
      await new Promise((resolve) => setTimeout(resolve, 3000))
      return new Response(null, { status: 429, headers: { "retry-after": "1" } })
    }),
  )
  const resultado = renovarSessao().catch(() => null)
  await vi.runAllTimersAsync()
  await resultado
  expect(instantes).toHaveLength(2)
  expect((instantes[1] ?? 0) - (instantes[0] ?? 0)).toBe(4000)
  vi.useRealTimers()
})

it("guarda o par devolvido pela verificação de código nativa", async () => {
  limparMemoria()
  vi.stubEnv("VITE_API_BASE", "https://api.example.invalid")
  cofre.set.mockResolvedValue(undefined)
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(par()))
  expect(await verificarCodigo("pessoa@example.invalid", "123456")).toEqual({
    estado: "autenticado",
  })
  expect(await acessoAtual()).toBe("acesso-sintetico")
  expect(cofre.set).toHaveBeenCalledWith("sessao.renovacao", "renovacao-sintetica")
})

it("não bloqueia pedido público por falha na renovação", async () => {
  limparMemoria()
  vi.stubEnv("VITE_API_BASE", "https://api.example.invalid")
  const buscar = vi.fn().mockResolvedValue(new Response("{}"))
  vi.stubGlobal("fetch", buscar)
  await ler("/api/localities")
  expect(buscar).toHaveBeenCalledTimes(1)
  expect(String(buscar.mock.calls[0]?.[0])).toContain("/api/localities")
})

it("401 de renovação limpa e encaminha ? entrada com retorno", async () => {
  limparMemoria()
  vi.stubEnv("VITE_API_BASE", "https://api.example.invalid")
  cofre.get.mockResolvedValue("renovacao")
  cofre.remove.mockResolvedValue(true)
  const assign = vi.fn()
  vi.stubGlobal("window", {
    location: { pathname: "/app/mercado", search: "?f=1", origin: "https://local.invalid", assign },
  })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })))
  expect(await renovarSessao()).toBeNull()
  expect(cofre.remove).toHaveBeenCalled()
  expect(assign).toHaveBeenCalledWith(
    "https://local.invalid/app/entrar?redirect=%2Fapp%2Fmercado%3Ff%3D1",
  )
  vi.unstubAllGlobals()
})

it("envia a sessão em memória nas rotas públicas autenticadas", async () => {
  limparMemoria()
  vi.stubEnv("VITE_API_BASE", "https://api.example.invalid")
  cofre.set.mockResolvedValue(undefined)
  await aceitarPar({
    access_token: "acesso",
    refresh_token: "renovacao",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  })
  const buscar = vi.fn().mockResolvedValue(new Response("{}"))
  vi.stubGlobal("fetch", buscar)
  await ler("/api/app/entry/progress")
  expect(buscar.mock.calls[0]?.[1].headers.get("Authorization")).toBe("Bearer acesso")
})

it("401 da leitura seguido de falha transitoria nao encerra sessao", async () => {
  vi.useFakeTimers()
  limparMemoria()
  cofre.remove.mockClear()
  cofre.set.mockResolvedValue(undefined)
  await aceitarPar({
    access_token: "valido",
    refresh_token: "renovacao",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  })
  const assign = vi.fn()
  vi.stubGlobal("window", {
    location: { pathname: "/app/mercado", search: "", origin: "https://local.invalid", assign },
  })
  const buscar = vi
    .fn()
    .mockResolvedValueOnce(new Response("{}", { status: 401 }))
    .mockResolvedValue(new Response(null, { status: 503 }))
  vi.stubGlobal("fetch", buscar)
  const resultado = ler("/api/app/exemplo").catch((erro: unknown) => erro)
  await vi.runAllTimersAsync()
  expect(await resultado).toMatchObject({ codigo: "indisponivel" })
  expect(assign).not.toHaveBeenCalled()
  expect(cofre.remove).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
