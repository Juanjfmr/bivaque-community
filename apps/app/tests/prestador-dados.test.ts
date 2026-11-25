import { afterEach, describe, expect, it, vi } from "vitest"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  lerAtendimento,
  lerContaDoNegocio,
  lerConversaDoPedido,
  responderAoPedido,
  salvarAtendimento,
  salvarContaDoNegocio,
} from "@/lib/dados/prestador"

const conta = {
  email: "prestador@example.invalid",
  temFicha: true,
  telefone: "92999990000",
  telefonePublico: true,
}
const atendimento = {
  temFicha: true,
  alcanceAtivo: false,
  comunidade: "Comunidade Manaus",
  cidade: "Manaus, AM",
}
const pedido = {
  id: "p1",
  negocioId: "n1",
  negocioNome: "Climatiza",
  categoriaNome: "Assistência técnica",
  descricao: "Limpar o ar",
  quando: "Nesta semana",
  situacao: "open",
  bairro: null,
  distanciaMetros: null,
  criadoEm: "2026-11-05T12:00:00Z",
  atualizadoEm: "2026-11-05T12:00:00Z",
  conversaId: "c1",
  lado: "dono",
}
const mensagem = {
  id: "m1",
  minha: true,
  conteudo: "Olá",
  criadoEm: "2026-11-05T12:10:00Z",
}

function responder(corpo: unknown, status = 200) {
  const fetch = vi.fn(
    async (_caminho: string, _init: RequestInit) => new Response(JSON.stringify(corpo), { status }),
  )
  vi.stubGlobal("fetch", fetch)
  return fetch
}

afterEach(() => vi.unstubAllGlobals())

describe("TROCA-005 — porta da conta e do atendimento", () => {
  it("lê a conta do próprio negócio", async () => {
    const fetch = responder({ conta })
    const lida = await lerContaDoNegocio()
    expect(lida.telefone).toBe("92999990000")
    expect(lida.telefonePublico).toBe(true)
    expect(fetch).toHaveBeenCalledWith("/api/app/prestador/conta", expect.anything())
  })

  it("salva o telefone com o cabeçalho do app", async () => {
    const fetch = responder({ conta })
    await salvarContaDoNegocio({ telefone: "92999990000", telefonePublico: false })
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/prestador/conta",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "x-bivaque-app": "bivaque-spa" }),
      }),
    )
  })

  it("lê e salva a área de atendimento", async () => {
    const fetch = responder({ atendimento })
    expect((await lerAtendimento()).comunidade).toBe("Comunidade Manaus")
    await salvarAtendimento(true)
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/app/prestador/atendimento",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ ativo: true }) }),
    )
  })

  it("resposta fora do contrato é falha, não conta vazia", async () => {
    responder({ conta: { temFicha: "sim" } })
    await expect(lerContaDoNegocio()).rejects.toMatchObject({
      mensagem: "Resposta do servidor fora do contrato.",
    })
  })

  it("recusa do servidor sobe com a frase que ele preparou", async () => {
    responder({ erro: "dados-invalidos", mensagem: "Use apenas números com DDD." }, 400)
    await expect(
      salvarContaDoNegocio({ telefone: "123", telefonePublico: true }),
    ).rejects.toMatchObject({
      codigo: "invalido",
      mensagem: "Use apenas números com DDD.",
    })
  })
})

describe("TROCA-005 — conversa do pedido recebido", () => {
  it("lê o pedido e as mensagens do contrato", async () => {
    const fetch = responder({ pedido, mensagens: [mensagem] })
    const lida = await lerConversaDoPedido("p1")
    expect(lida.pedido.situacao).toBe("open")
    expect(lida.pedido.lado).toBe("dono")
    expect(lida.mensagens).toEqual([mensagem])
    expect(fetch).toHaveBeenCalledWith("/api/app/pedidos/p1/mensagens", expect.anything())
  })

  it("responde e devolve o estado gravado", async () => {
    const fetch = responder({
      pedido: { ...pedido, situacao: "in_conversation" },
      mensagens: [mensagem],
    })
    const lida = await responderAoPedido("p1", "Posso na quinta")
    expect(lida.pedido.situacao).toBe("in_conversation")
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/pedidos/p1/mensagens",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ conteudo: "Posso na quinta" }),
      }),
    )
  })

  it("mensagem fora do contrato não vira lista vazia", async () => {
    responder({ pedido, mensagens: [{ id: "m1" }] })
    await expect(lerConversaDoPedido("p1")).rejects.toBeInstanceOf(FalhaDaApi)
  })
})
