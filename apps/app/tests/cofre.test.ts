import { beforeEach, describe, expect, it, vi } from "vitest"

const plataforma = vi.hoisted(() => ({ nativa: true }))
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => plataforma.nativa } }))

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

import {
  apagarRenovacao,
  gravarPkce,
  gravarRenovacao,
  lerPkce,
  lerRenovacao,
} from "@/lib/nativo/cofre"

describe("cofre nativo", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    plataforma.nativa = true
  })

  it("configura as proteções antes da primeira leitura", async () => {
    cofre.get.mockResolvedValue(null)
    await lerRenovacao()
    expect(cofre.setSynchronize).toHaveBeenCalledWith(false)
    expect(cofre.setDefaultKeychainAccess).toHaveBeenCalledWith(3)
    expect(cofre.setKeyPrefix).toHaveBeenCalledWith("bivaque.")
    const configuracao = cofre.setSynchronize.mock.invocationCallOrder[0] ?? 0
    const leitura = cofre.get.mock.invocationCallOrder[0] ?? 0
    expect(leitura).toBeGreaterThan(configuracao)
  })

  it("trata falha de leitura como ausência de sessão", async () => {
    cofre.get.mockRejectedValue(new Error())
    expect(await lerRenovacao()).toBeNull()
    expect(await lerPkce()).toBeNull()
  })

  it("guarda e lê o fluxo pelo plugin", async () => {
    cofre.set.mockResolvedValue(undefined)
    await gravarPkce({ verificador: "sintetico", criadoEm: 42 })
    const valor = cofre.set.mock.calls[0]?.[1]
    cofre.get.mockResolvedValue(valor)
    expect(await lerPkce()).toEqual({ verificador: "sintetico", criadoEm: 42 })
  })

  it("recusa o plugin web que gravaria em localStorage", async () => {
    plataforma.nativa = false
    const armazenamento = new Map<string, string>()
    vi.stubGlobal("localStorage", {
      setItem: (chave: string, valor: string) => armazenamento.set(chave, valor),
    })
    cofre.set.mockImplementation((chave: string, valor: string) =>
      localStorage.setItem(chave, valor),
    )
    expect(await lerRenovacao()).toBeNull()
    await expect(gravarRenovacao("sintetico")).rejects.toThrow()
    await expect(apagarRenovacao()).rejects.toThrow()
    expect(armazenamento.size).toBe(0)
    expect(cofre.get).not.toHaveBeenCalled()
    expect(cofre.set).not.toHaveBeenCalled()
    expect(cofre.remove).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it("propaga falha de gravação", async () => {
    cofre.set.mockRejectedValue(new Error("falha"))
    await expect(gravarRenovacao("sintetico")).rejects.toThrow()
  })
})
