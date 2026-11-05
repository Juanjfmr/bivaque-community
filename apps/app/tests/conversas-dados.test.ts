import { afterEach, describe, expect, it, vi } from "vitest"
import { FalhaDaApi } from "@/lib/api/cliente"
import { buscarConversa, enviarMensagem, lerConversas } from "@/lib/dados/conversas"

const conversa = { id: "c1", nome: "Maria", tipo: "provider", contextoId: "p1", ultima: "Oi" }
const mensagem = { id: "m1", conteudo: "Olá", minha: true, criadaEm: "2026-11-05T12:00:00Z" }
function responder(corpo: unknown, status = 200) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(corpo), { status }))
  vi.stubGlobal("fetch", fetch)
  return fetch
}
afterEach(() => vi.unstubAllGlobals())

describe("porta de conversas", () => {
  it("lê a caixa e encaminha cursor e sinal", async () => {
    const fetch = responder({ conversas: [conversa], proximo: "cursor" })
    const signal = new AbortController().signal
    expect(await lerConversas({ depois: "um|dois", signal })).toEqual({
      conversas: [conversa],
      proximo: "cursor",
    })
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/conversas?depois=um%7Cdois",
      expect.objectContaining({ signal }),
    )
  })
  it("lê detalhe e mensagens", async () => {
    responder({ conversa, mensagens: [mensagem], anterior: null })
    expect(await buscarConversa("c1")).toMatchObject({
      conversa,
      mensagens: [mensagem],
      anterior: null,
    })
  })
  it("envia e mostra a mensagem gravada", async () => {
    const fetch = responder({ mensagem }, 201)
    expect(await enviarMensagem("c1", "Olá")).toEqual(mensagem)
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/conversas/c1/mensagens",
      expect.objectContaining({ method: "POST", body: '{"texto":"Olá"}' }),
    )
  })
  it("resposta quebrada é falha, não caixa vazia", async () => {
    responder({})
    await expect(lerConversas()).rejects.toBeInstanceOf(FalhaDaApi)
  })
  it("propaga falha de escrita", async () => {
    responder({ erro: "indisponivel" }, 503)
    await expect(enviarMensagem("c1", "Olá")).rejects.toMatchObject({ codigo: "indisponivel" })
  })
})
