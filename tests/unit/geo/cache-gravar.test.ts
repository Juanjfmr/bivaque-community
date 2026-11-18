import { describe, expect, it, vi } from "vitest"
import { gravarCepNoCache } from "../../../apps/web/lib/geo/cache"

vi.mock("server-only", () => ({}))

// SEC-016: a renovação sem bairro não pode apagar o bairro que já estava na linha,
// nem o que uma requisição concorrente acabou de gravar. O upsert só atualiza as
// colunas enviadas, então "sem bairro" é "sem a coluna", nunca `neighborhood: null`.

function clienteFalso() {
  const upsert = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn().mockReturnValue({ upsert })
  // biome-ignore lint/suspicious/noExplicitAny: cliente mínimo do teste
  return { client: { from } as any, upsert, from }
}

const COORDENADA = { latitude: -3.1, longitude: -60.02, fonte: "brasilapi" as const }

describe("gravarCepNoCache", () => {
  it("sem bairro, o upsert não leva a coluna neighborhood", async () => {
    const { client, upsert, from } = clienteFalso()
    await gravarCepNoCache(client, "69000000", COORDENADA, null)
    expect(from).toHaveBeenCalledWith("cep_geocodes")
    const linha = upsert.mock.calls[0]?.[0] as Record<string, unknown>
    expect(Object.keys(linha)).not.toContain("neighborhood")
    expect(linha).toMatchObject({ cep: "69000000", latitude: -3.1, longitude: -60.02 })
  })

  it("sem o argumento de bairro, também não leva a coluna", async () => {
    const { client, upsert } = clienteFalso()
    await gravarCepNoCache(client, "69000000", COORDENADA)
    const linha = upsert.mock.calls[0]?.[0] as Record<string, unknown>
    expect(Object.keys(linha)).not.toContain("neighborhood")
  })

  it("com bairro, grava o bairro", async () => {
    const { client, upsert } = clienteFalso()
    await gravarCepNoCache(client, "69000000", COORDENADA, "Compensa")
    const linha = upsert.mock.calls[0]?.[0] as Record<string, unknown>
    expect(linha["neighborhood"]).toBe("Compensa")
  })

  it("erro do banco sobe", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: new Error("falhou") })
    // biome-ignore lint/suspicious/noExplicitAny: cliente mínimo do teste
    const client = { from: () => ({ upsert }) } as any
    await expect(gravarCepNoCache(client, "69000000", COORDENADA, null)).rejects.toThrow("falhou")
  })
})
