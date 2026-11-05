import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import { buscarPergunta, lerPerguntas, responderPergunta } from "@/lib/dados/perguntas"

/**
 * A porta da jornada de perguntas (ADR-20261105 §2): caminho, filtro, corpo e
 * tradução da resposta. Resposta fora do contrato falha alto em vez de virar
 * lista vazia — "ninguém perguntou nada" é uma afirmação, não um erro.
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

afterEach(() => vi.unstubAllGlobals())

const PERGUNTA = {
  id: "q1",
  titulo: "Alguém indica pediatra?",
  categoria: "saude_bem_estar",
  criadaEm: "2026-11-01T12:00:00.000Z",
  resolvida: false,
  respostas: 2,
  propria: false,
  autor: "Ana",
}

describe("lista de perguntas", () => {
  it("pede o filtro padrão e traduz a página", async () => {
    const buscar = responder({
      perguntas: [PERGUNTA],
      proximo: "20",
      cidade: "Manaus",
      resolvidas: 4,
    })
    const lista = await lerPerguntas()
    expect(chamada(buscar).caminho).toBe("/api/app/perguntas?filtro=ajuda")
    expect(lista.perguntas[0]).toEqual({
      id: "q1",
      titulo: "Alguém indica pediatra?",
      assunto: "Saúde",
      criadaEm: "2026-11-01T12:00:00.000Z",
      resolvida: false,
      respostas: 2,
      propria: false,
      autor: "Ana",
    })
    expect(lista.proximo).toBe("20")
    expect(lista.cidade).toBe("Manaus")
    expect(lista.resolvidas).toBe(4)
  })

  it("encaminha filtro e posição da próxima página", async () => {
    const buscar = responder({ perguntas: [], proximo: null, cidade: "Manaus", resolvidas: 0 })
    await lerPerguntas({ filtro: "minhas", depois: "40" })
    expect(chamada(buscar).caminho).toBe("/api/app/perguntas?filtro=minhas&depois=40")
  })

  it("categoria desconhecida vira vazio, não chute", async () => {
    responder({
      perguntas: [{ ...PERGUNTA, categoria: "categoria_nova" }],
      proximo: null,
      cidade: "Manaus",
      resolvidas: 0,
    })
    expect((await lerPerguntas()).perguntas[0]?.assunto).toBe("")
  })

  it("recusa corpo fora do contrato em vez de fingir lista vazia", async () => {
    responder({ itens: [] })
    await expect(lerPerguntas()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("recusa linha sem contagem de respostas", async () => {
    responder({
      perguntas: [{ id: "q1", titulo: "Sem contagem" }],
      proximo: null,
      cidade: "Manaus",
      resolvidas: 0,
    })
    await expect(lerPerguntas()).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("pergunta e respostas", () => {
  it("lê a pergunta com a cidade do servidor", async () => {
    const buscar = responder({
      pergunta: { ...PERGUNTA, corpo: "Detalhe", cidade: "Manaus" },
      respostas: [],
    })
    const lida = await buscarPergunta("q1")
    expect(chamada(buscar).caminho).toBe("/api/app/perguntas/q1")
    expect(lida.pergunta.cidade).toBe("Manaus")
    expect(lida.pergunta.assunto).toBe("Saúde")
    expect(lida.respostas).toEqual([])
  })

  it("a resposta removida chega sem texto e sem autor", async () => {
    responder({
      pergunta: { ...PERGUNTA, corpo: "", cidade: "Manaus" },
      respostas: [
        {
          id: "r1",
          corpo: "",
          autor: "",
          propria: false,
          criadaEm: "2026-11-01T12:00:00.000Z",
          removida: true,
        },
      ],
    })
    const lida = await buscarPergunta("q1")
    expect(lida.respostas[0]).toMatchObject({ removida: true, corpo: "", autor: "" })
  })

  it("pergunta que sumiu chega com o status do servidor", async () => {
    responder({ erro: "pergunta-nao-encontrada" }, 404)
    await expect(buscarPergunta("q1")).rejects.toMatchObject({
      codigo: "nao-encontrado",
      status: 404,
    })
  })

  it("resposta quebrada é falha, não conversa vazia", async () => {
    responder({ pergunta: PERGUNTA })
    await expect(buscarPergunta("q1")).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("responder", () => {
  it("manda o texto pelo POST e devolve o que ficou gravado", async () => {
    const buscar = responder(
      {
        resposta: { id: "r1", corpo: "A mesma equipe atendeu.", criadaEm: "2026-11-01T12:00:00Z" },
      },
      201,
    )
    const gravada = await responderPergunta("q1", "A mesma equipe atendeu.")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/perguntas/q1/respostas")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual({ texto: "A mesma equipe atendeu." })
    expect(gravada).toEqual({
      id: "r1",
      corpo: "A mesma equipe atendeu.",
      autor: "",
      propria: true,
      criadaEm: "2026-11-01T12:00:00Z",
      removida: false,
    })
  })

  it("falha da escrita não vira resposta vazia", async () => {
    responder({ erro: "escrita-indisponivel" }, 503)
    await expect(responderPergunta("q1", "Uma resposta")).rejects.toMatchObject({
      codigo: "indisponivel",
    })
  })

  it("recusa do servidor chega com a frase pronta", async () => {
    responder(
      { erro: "dados-invalidos", mensagem: "Escreva uma resposta com pelo menos 5 caracteres." },
      400,
    )
    await expect(responderPergunta("q1", "ok")).rejects.toMatchObject({
      codigo: "invalido",
      mensagem: "Escreva uma resposta com pelo menos 5 caracteres.",
    })
  })
})
