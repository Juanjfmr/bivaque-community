import { beforeEach, describe, expect, it, vi } from "vitest"

const cofre = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() }))
vi.mock("capacitor-secure-storage-plugin", () => ({ SecureStoragePlugin: cofre }))

import { gravarPkce, gravarRenovacao, lerPkce, lerRenovacao } from "@/lib/nativo/cofre"

describe("cofre nativo", () => {
  beforeEach(() => vi.resetAllMocks())

  it("trata falha de leitura como ausência de sessão", async () => {
    cofre.get.mockRejectedValue(new Error())
    expect(await lerRenovacao()).toBeNull()
    expect(await lerPkce()).toBeNull()
  })

  it("guarda e lê o fluxo pelo plugin", async () => {
    cofre.set.mockResolvedValue({ value: true })
    await gravarPkce({ verificador: "sintetico", criadoEm: 42 })
    const valor = cofre.set.mock.calls[0]?.[0].value
    cofre.get.mockResolvedValue({ value: valor })
    expect(await lerPkce()).toEqual({ verificador: "sintetico", criadoEm: 42 })
  })

  it("não grava credenciais no armazenamento local", async () => {
    const setItem = vi.fn()
    vi.stubGlobal("localStorage", { setItem })
    cofre.set.mockResolvedValue({ value: true })
    await gravarRenovacao("sintetico")
    await gravarPkce({ verificador: "sintetico", criadoEm: 42 })
    expect(setItem).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it("propaga falha de gravação", async () => {
    cofre.set.mockResolvedValue({ value: false })
    await expect(gravarRenovacao("sintetico")).rejects.toThrow()
  })
})
