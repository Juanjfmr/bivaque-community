import type { QueryClient } from "@tanstack/react-query"
import { beforeEach, expect, it, vi } from "vitest"

const deps = vi.hoisted(() => ({
  requisitar: vi.fn(),
  renovarSessao: vi.fn(),
  limparMemoria: vi.fn(),
  apagarRenovacao: vi.fn(),
  apagarPkce: vi.fn(),
}))
vi.mock("@/lib/api/cliente", () => ({ requisitar: deps.requisitar }))
vi.mock("@/lib/nativo/sessao", () => ({
  renovarSessao: deps.renovarSessao,
  limparMemoria: deps.limparMemoria,
}))
vi.mock("@/lib/nativo/cofre", () => ({
  apagarRenovacao: deps.apagarRenovacao,
  apagarPkce: deps.apagarPkce,
}))

import { sairNativo } from "@/lib/nativo/sair"

beforeEach(() => {
  vi.resetAllMocks()
  deps.apagarRenovacao.mockResolvedValue(undefined)
  deps.apagarPkce.mockResolvedValue(undefined)
})

it.each([false, true])("limpa os dados ao sair, mesmo sem rede: %s", async (semRede) => {
  const ordem: string[] = []
  deps.requisitar.mockImplementation(async () => {
    ordem.push("sair")
    if (semRede) throw new Error("rede")
    return new Response("{}", { status: ordem.length === 1 ? 401 : 200 })
  })
  deps.renovarSessao.mockImplementation(async () => {
    ordem.push("renovar")
    return "sintetico"
  })
  deps.apagarRenovacao.mockImplementation(async () => {
    ordem.push("cofre")
  })
  const limparCache = vi.fn(() => ordem.push("query"))
  const limparLocal = vi.fn(() => ordem.push("local"))
  const deletarBanco = vi.fn(() => {
    const pedido: { onsuccess?: () => void } = {}
    queueMicrotask(() => pedido.onsuccess?.())
    return pedido
  })
  const apagarCache = vi.fn().mockResolvedValue(true)
  const local = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    clear: () => {
      limparLocal()
      local.clear()
    },
    setItem: (chave: string, valor: string) => local.set(chave, valor),
    getItem: (chave: string) => local.get(chave) ?? null,
  })
  vi.stubGlobal("indexedDB", {
    databases: async () => [{ name: "banco" }],
    deleteDatabase: deletarBanco,
  })
  vi.stubGlobal("caches", { keys: async () => ["cache"], delete: apagarCache })
  await sairNativo({ clear: limparCache } as unknown as QueryClient)
  expect(ordem).toEqual(
    semRede
      ? ["sair", "cofre", "query", "local"]
      : ["sair", "renovar", "sair", "cofre", "query", "local"],
  )
  expect(deletarBanco).toHaveBeenCalledWith("banco")
  expect(apagarCache).toHaveBeenCalledWith("cache")
  expect(local.has("bivaque.saiu")).toBe(false)
  vi.unstubAllGlobals()
})

it("marca a saída se as duas tentativas de apagar o cofre falharem", async () => {
  const local = new Map<string, string>()
  deps.apagarRenovacao.mockRejectedValue(new Error("cofre indisponível"))
  vi.stubGlobal("localStorage", {
    clear: () => local.clear(),
    setItem: (chave: string, valor: string) => local.set(chave, valor),
  })
  vi.stubGlobal("indexedDB", {})
  vi.stubGlobal("caches", { keys: async () => [], delete: vi.fn() })
  await sairNativo({ clear: vi.fn() } as unknown as QueryClient)
  expect(deps.apagarRenovacao).toHaveBeenCalledTimes(2)
  expect(local.get("bivaque.saiu")).toBe("1")
  vi.unstubAllGlobals()
})
