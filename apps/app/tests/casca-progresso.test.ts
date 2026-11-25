import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  lerProgresso: vi.fn(),
  efeitos: [] as Array<() => void>,
  estados: [] as unknown[],
}))

vi.mock("react", async (importar) => {
  const real = await importar<typeof import("react")>()
  return {
    ...real,
    useState: (inicial: unknown) => {
      const indice = mocks.estados.length
      mocks.estados.push(typeof inicial === "function" ? inicial() : inicial)
      return [
        mocks.estados[indice],
        (valor: unknown) => {
          mocks.estados[indice] = typeof valor === "function" ? valor(mocks.estados[indice]) : valor
        },
      ]
    },
    useEffect: (efeito: () => void) => mocks.efeitos.push(efeito),
    useCallback: (funcao: unknown) => funcao,
    useMemo: (funcao: () => unknown) => funcao(),
  }
})
vi.mock("@/src/entrada/servidor", () => ({ lerProgresso: mocks.lerProgresso }))
vi.mock("@/src/modo-de-prova", () => ({ modoDeProvaAtivo: () => false }))

import { ProvedorDaCasca } from "@/src/contexto/casca"

describe("leitura de progresso na casca", () => {
  beforeEach(() => {
    mocks.estados.length = 0
    mocks.efeitos.length = 0
    mocks.lerProgresso.mockReset()
  })

  it("mantém a cidade desconhecida quando a leitura é rejeitada", async () => {
    mocks.lerProgresso.mockRejectedValue(new Error("503"))
    ProvedorDaCasca({ children: null })
    for (const efeito of mocks.efeitos) efeito()
    await new Promise((resolver) => setTimeout(resolver, 0))
    expect(mocks.estados[2]).toMatchObject({ cidade: "", cidadeDeCasa: "" })
  })
})
