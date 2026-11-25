import { afterEach, describe, expect, it, vi } from "vitest"
import { aceitarConviteDePrestador, lerConviteDePrestador } from "@/lib/dados/prestador-convite"

const TOKEN = "a".repeat(64)

function responder(corpo: unknown, status = 200) {
  const fetch = vi.fn(
    async (_caminho: string, _init: RequestInit) => new Response(JSON.stringify(corpo), { status }),
  )
  vi.stubGlobal("fetch", fetch)
  return fetch
}

afterEach(() => vi.unstubAllGlobals())

describe("TROCA-005 — convite de prestador na entrada", () => {
  it("lê o convite pelo token, com o e-mail da sessão quando há", async () => {
    const fetch = responder({
      convite: { comunidade: "Comunidade Manaus", estado: "pendente" },
      emailDaSessao: "prestador@example.invalid",
    })
    const lido = await lerConviteDePrestador(TOKEN)
    expect(lido).toEqual({
      comunidade: "Comunidade Manaus",
      estado: "pendente",
      emailDaSessao: "prestador@example.invalid",
    })
    expect(fetch).toHaveBeenCalledWith(`/api/app/prestador-convite/${TOKEN}`, expect.anything())
  })

  it("estado desconhecido não vira convite pendente", async () => {
    responder({ convite: { comunidade: "Comunidade Manaus", estado: "sumiu" } })
    await expect(lerConviteDePrestador(TOKEN)).rejects.toMatchObject({
      mensagem: "Resposta do servidor fora do contrato.",
    })
  })

  it("aceita com POST e confirma o aceite do servidor", async () => {
    const fetch = responder({ aceito: true })
    await aceitarConviteDePrestador(TOKEN)
    expect(fetch).toHaveBeenCalledWith(
      `/api/app/prestador-convite/${TOKEN}`,
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("resposta sem aceite é falha, não sucesso presumido", async () => {
    responder({ aceito: false })
    await expect(aceitarConviteDePrestador(TOKEN)).rejects.toMatchObject({
      mensagem: "Resposta do servidor fora do contrato.",
    })
  })

  it("a recusa do servidor sobe com o motivo curto", async () => {
    responder({ erro: "convite-usado", mensagem: "Este convite já foi usado." }, 409)
    await expect(aceitarConviteDePrestador(TOKEN)).rejects.toMatchObject({
      status: 409,
      motivoDoServidor: "convite-usado",
    })
  })
})
