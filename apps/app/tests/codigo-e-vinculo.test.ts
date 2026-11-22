import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { verificarCodigoEVinculo } from "../src/entrada/codigo-e-vinculo"

const fetchFalso = vi.fn()
const resposta = (status: number, corpo: unknown = {}) => ({ status, json: async () => corpo })

beforeEach(() => {
  fetchFalso.mockReset()
  vi.stubGlobal("fetch", fetchFalso)
})
afterEach(() => vi.unstubAllGlobals())

describe("código e vínculo", () => {
  it.each([
    [true, "membro"],
    [false, "autenticado"],
  ])("consulta o vínculo depois do código: membro=%s", async (membro, estado) => {
    fetchFalso
      .mockResolvedValueOnce(resposta(200))
      .mockResolvedValueOnce(resposta(200, { membroDaCidade: membro }))
    expect(await verificarCodigoEVinculo("pessoa@example.invalid", "123456")).toEqual({ estado })
    expect(fetchFalso.mock.calls.map(([url]) => url)).toEqual([
      "/api/app/entry/otp/verify",
      "/api/app/entry/verification",
    ])
  })

  it("não confunde falha na consulta com cadastro novo", async () => {
    fetchFalso.mockResolvedValueOnce(resposta(200)).mockRejectedValueOnce(new Error("rede"))
    expect(await verificarCodigoEVinculo("pessoa@example.invalid", "123456")).toEqual({
      estado: "verificacao-indisponivel",
    })
  })

  it("não consulta vínculo quando o código é inválido", async () => {
    fetchFalso.mockResolvedValueOnce(resposta(400))
    expect(await verificarCodigoEVinculo("pessoa@example.invalid", "000000")).toEqual({
      estado: "codigo-invalido",
    })
    expect(fetchFalso).toHaveBeenCalledTimes(1)
  })
})
