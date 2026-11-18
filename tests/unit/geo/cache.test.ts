import { describe, expect, it, vi } from "vitest"

// SEC-016 — a validade da linha do cache de CEP. O relógio é injetado em
// `lerCepDoCache`, então a fronteira de 180 dias é provada sem depender do
// horário da máquina.
vi.mock("server-only", () => ({}))

import { lerCepDoCache, VALIDADE_MS } from "web/lib/geo/cache"

const DIA = 24 * 60 * 60 * 1000
const GRAVADA_EM = Date.parse("2026-01-01T00:00:00.000Z")

function clienteComLinha(valor: Record<string, unknown> | null) {
  const consulta: Record<string, unknown> = {}
  consulta["select"] = () => consulta
  consulta["eq"] = () => consulta
  consulta["maybeSingle"] = async () => ({ data: valor, error: null })
  return { from: vi.fn(() => consulta) } as never
}

const linha = {
  latitude: -3.10194,
  longitude: -60.025,
  source: "brasilapi",
  neighborhood: "Flores",
  fetched_at: new Date(GRAVADA_EM).toISOString(),
}

describe("lerCepDoCache e a validade de 180 dias", () => {
  it("179 dias e 23 h ainda é encontrada, com o bairro guardado", async () => {
    const lida = await lerCepDoCache(
      clienteComLinha(linha),
      "69000000",
      GRAVADA_EM + VALIDADE_MS - 60 * 60 * 1000,
    )

    expect(lida).toEqual({
      cep: "69000000",
      latitude: -3.10194,
      longitude: -60.025,
      fonte: "brasilapi",
      bairro: "Flores",
      vencida: false,
    })
  })

  it("180 dias e 1 min já é vencida", async () => {
    const lida = await lerCepDoCache(
      clienteComLinha(linha),
      "69000000",
      GRAVADA_EM + VALIDADE_MS + 60 * 1000,
    )

    expect(lida).toMatchObject({ vencida: true })
  })

  it("exatamente 180 dias ainda vale: vence o que passa da validade", async () => {
    const lida = await lerCepDoCache(clienteComLinha(linha), "69000000", GRAVADA_EM + VALIDADE_MS)

    // Vencida é `> VALIDADE_MS`: no limite exato a linha continua boa e o
    // provedor não é chamado.
    expect(lida).toMatchObject({ vencida: false })
    expect(VALIDADE_MS).toBe(180 * DIA)
  })

  it("CEP fora do cache é nulo", async () => {
    expect(await lerCepDoCache(clienteComLinha(null), "69000000", GRAVADA_EM)).toBeNull()
  })
})
