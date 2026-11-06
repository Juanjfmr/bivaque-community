import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import { convidarFamiliar, lerFamilia, revogarConvite } from "@/lib/dados/voce"

/**
 * A família na porta da área "Você" (RUN-018): caminho, método, corpo e
 * tradução. Resposta fora do contrato falha alto — lista vazia só quando o
 * servidor diz que está vazia.
 */

function responder(corpo: unknown, status = 200) {
  const buscar = vi.fn(async () => new Response(JSON.stringify(corpo), { status }))
  vi.stubGlobal("fetch", buscar)
  return buscar
}

function chamada(buscar: ReturnType<typeof responder>) {
  const [caminho, init] = buscar.mock.calls[0] as unknown as [string, RequestInit]
  return { caminho, init }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const CONVITE = {
  id: "c1",
  emailMascarado: "jo***@gm***.com",
  criadoEm: "2026-11-06T12:00:00Z",
  expiraEm: "2026-11-13T12:00:00Z",
}

describe("convites de família", () => {
  it("lê os pendentes e a permissão de convidar", async () => {
    const buscar = responder({ familia: { podeConvidar: true, pendentes: [CONVITE] } })
    const familia = await lerFamilia()
    expect(chamada(buscar).caminho).toBe("/api/app/voce/familia")
    expect(familia.podeConvidar).toBe(true)
    expect(familia.pendentes[0]?.emailMascarado).toBe("jo***@gm***.com")
  })

  it("lista vazia é resposta legítima", async () => {
    responder({ familia: { podeConvidar: false, pendentes: [] } })
    await expect(lerFamilia()).resolves.toEqual({ podeConvidar: false, pendentes: [] })
  })

  it("pendente sem data falha alto, nunca vira linha em branco", async () => {
    responder({ familia: { podeConvidar: true, pendentes: [{ id: "c1" }] } })
    await expect(lerFamilia()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("envia o convite pelo POST e devolve o gravado", async () => {
    const buscar = responder({ convite: CONVITE }, 201)
    const convite = await convidarFamiliar("  Joao.Silva@gmail.com ")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/voce/familia")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual({ email: "  Joao.Silva@gmail.com " })
    expect(convite.emailMascarado).toBe("jo***@gm***.com")
  })

  it("recusa do servidor sobe com o motivo e a frase", async () => {
    responder({ erro: "teto-de-convites", mensagem: "Máximo de 5 convites ativos." }, 409)
    await expect(convidarFamiliar("familiar@example.invalid")).rejects.toMatchObject({
      codigo: "conflito",
      motivoDoServidor: "teto-de-convites",
      mensagem: "Máximo de 5 convites ativos.",
    })
  })

  it("revoga pelo DELETE no id", async () => {
    const buscar = responder({ removido: true })
    await revogarConvite("c1")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/voce/familia/c1")
    expect(init.method).toBe("DELETE")
  })

  it("revogação não confirmada é falha, não sucesso silencioso", async () => {
    responder({ removido: false })
    await expect(revogarConvite("c1")).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("convite alheio sobe como não encontrado", async () => {
    responder({ erro: "nao-encontrado" }, 404)
    await expect(revogarConvite("c1")).rejects.toMatchObject({ codigo: "nao-encontrado" })
  })
})
