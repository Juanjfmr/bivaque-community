import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import {
  buscarPergunta,
  denunciarPergunta,
  lerPerguntas,
  lerPerguntasSalvas,
  marcarSalvaPergunta,
  mudarResolucao,
  responderPergunta,
  rotuloDoTopico,
  TOPICOS_DAS_PERGUNTAS,
} from "@/lib/dados/perguntas"

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
  autorId: "u-ana",
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
      autorId: "u-ana",
      grupo: null,
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

  it("encaminha o tópico escolhido como filtro; vazio não vai na query", async () => {
    const comTopico = responder({ perguntas: [], proximo: null, cidade: "Manaus", resolvidas: 0 })
    await lerPerguntas({ topico: "moradia" })
    expect(chamada(comTopico).caminho).toBe("/api/app/perguntas?filtro=ajuda&topico=moradia")
    const semTopico = responder({ perguntas: [], proximo: null, cidade: "Manaus", resolvidas: 0 })
    await lerPerguntas({ topico: "" })
    expect(chamada(semTopico).caminho).toBe("/api/app/perguntas?filtro=ajuda")
  })

  it("a lista fechada de tópicos é a mesma régua do banco, com rótulo em português", () => {
    expect(TOPICOS_DAS_PERGUNTAS.map((topico) => topico.id)).toEqual([
      "saude_bem_estar",
      "servicos_locais",
      "educacao",
      "moradia",
      "transporte",
      "alimentacao",
      "esporte_lazer",
      "outros",
    ])
    expect(TOPICOS_DAS_PERGUNTAS.every((topico) => topico.rotulo.length > 0)).toBe(true)
    expect(rotuloDoTopico("moradia")).toBe("Moradia")
    // Tópico fora da lista não ganha rótulo inventado.
    expect(rotuloDoTopico("tópico livre")).toBe("")
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

  it("a origem dupla chega com o grupo, e a pergunta só da cidade com null", async () => {
    responder({
      perguntas: [
        { ...PERGUNTA, grupo: { id: "g1", nome: "Grupo de Corrida" } },
        { ...PERGUNTA, id: "q2", grupo: null },
      ],
      proximo: null,
      cidade: "Manaus",
      resolvidas: 0,
    })
    const lista = await lerPerguntas()
    expect(lista.perguntas[0]?.grupo).toEqual({ id: "g1", nome: "Grupo de Corrida" })
    expect(lista.perguntas[1]?.grupo).toBeNull()
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

  it("lê o marcador de quem segue respostas", async () => {
    responder({ pergunta: { ...PERGUNTA, salva: true }, respostas: [] })
    expect((await buscarPergunta("q1")).pergunta.salva).toBe(true)
  })

  it("sem marcador, o seguimento é falso — nunca inventado", async () => {
    responder({ pergunta: PERGUNTA, respostas: [] })
    expect((await buscarPergunta("q1")).pergunta.salva).toBe(false)
  })
})

describe("seguir respostas", () => {
  it("segue pelo PUT e devolve o estado gravado", async () => {
    const buscar = responder({ salvo: true })
    await expect(marcarSalvaPergunta("q1", true)).resolves.toBe(true)
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/perguntas/q1/salvo")
    expect(init.method).toBe("PUT")
  })

  it("deixa de seguir pelo DELETE", async () => {
    const buscar = responder({ salvo: false })
    await expect(marcarSalvaPergunta("q1", false)).resolves.toBe(false)
    expect(chamada(buscar).init.method).toBe("DELETE")
  })

  it("resposta sem o marcador é falha, não sucesso presumido", async () => {
    responder({ ok: true })
    await expect(marcarSalvaPergunta("q1", true)).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("recusa do servidor chega com o motivo e a frase dele", async () => {
    responder(
      { erro: "recusado", mensagem: "Perguntas de grupo ainda não podem ser seguidas." },
      403,
    )
    await expect(marcarSalvaPergunta("q1", true)).rejects.toMatchObject({
      codigo: "recusado",
      status: 403,
      mensagem: "Perguntas de grupo ainda não podem ser seguidas.",
    })
  })

  it("lista as perguntas seguidas, na ordem do servidor", async () => {
    const buscar = responder({
      perguntas: [
        {
          id: "q1",
          titulo: "Alguém indica pediatra?",
          categoria: "saude_bem_estar",
          criadaEm: "2026-11-01T12:00:00.000Z",
          resolvida: true,
        },
      ],
    })
    const salvas = await lerPerguntasSalvas()
    expect(chamada(buscar).caminho).toBe("/api/app/perguntas/salvas")
    expect(salvas).toEqual([
      {
        id: "q1",
        titulo: "Alguém indica pediatra?",
        assunto: "Saúde",
        criadaEm: "2026-11-01T12:00:00.000Z",
        resolvida: true,
      },
    ])
  })

  it("lista quebrada é falha, não Salvos vazio", async () => {
    responder({ perguntas: [{ id: "q1" }] })
    await expect(lerPerguntasSalvas()).rejects.toBeInstanceOf(FalhaDaApi)
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
      autorId: "",
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

describe("denúncia", () => {
  it("denuncia a pergunta com o motivo e a explicação, e devolve o id gravado", async () => {
    const buscar = responder({ denuncia: { id: "d1" } }, 201)
    const signal = new AbortController().signal
    expect(
      await denunciarPergunta("q1", { motivo: "spam", explicacao: "Repetida" }, { signal }),
    ).toBe("d1")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/perguntas/q1/denuncia")
    expect(init.method).toBe("POST")
    expect(init.signal).toBe(signal)
    expect(JSON.parse(String(init.body))).toEqual({ motivo: "spam", explicacao: "Repetida" })
  })

  it("com resposta, o alvo vai no corpo", async () => {
    const buscar = responder({ denuncia: { id: "d2" } }, 201)
    await denunciarPergunta("q1", { motivo: "outro", explicacao: "", respostaId: "r1" })
    expect(JSON.parse(String(chamada(buscar).init.body))).toEqual({
      motivo: "outro",
      explicacao: "",
      respostaId: "r1",
    })
  })

  it("duplicata chega como 409 com a frase do servidor", async () => {
    responder({ erro: "ja-denunciado", mensagem: "Você já denunciou esta pergunta." }, 409)
    await expect(denunciarPergunta("q1", { motivo: "spam", explicacao: "" })).rejects.toMatchObject(
      { status: 409, mensagem: "Você já denunciou esta pergunta." },
    )
  })

  it("resposta sem o id da denúncia é falha, não sucesso presumido", async () => {
    responder({ denuncia: {} }, 201)
    await expect(
      denunciarPergunta("q1", { motivo: "spam", explicacao: "" }),
    ).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("resolução", () => {
  it("a pergunta diz qual resposta resolveu, quando há uma", async () => {
    responder({
      pergunta: {
        ...PERGUNTA,
        corpo: "",
        cidade: "Manaus",
        resolvida: true,
        resolvidaPorResposta: "r9",
      },
      respostas: [],
    })
    expect((await buscarPergunta("q1")).pergunta.resolvidaPorResposta).toBe("r9")
  })

  it("sem resposta marcada, o campo é nulo", async () => {
    responder({
      pergunta: { ...PERGUNTA, corpo: "", cidade: "Manaus" },
      respostas: [],
    })
    expect((await buscarPergunta("q1")).pergunta.resolvidaPorResposta).toBeNull()
  })

  it("marcar manda a ação e a resposta, e devolve o estado gravado", async () => {
    const buscar = responder({ resolvida: true, resolvidaPorResposta: "r1" })
    const estado = await mudarResolucao("q1", "marcar", "r1")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/perguntas/q1/resolucao")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual({ acao: "marcar", respostaId: "r1" })
    expect(estado).toEqual({ resolvida: true, resolvidaPorResposta: "r1" })
  })

  it("reabrir não manda resposta e devolve a pergunta aberta", async () => {
    const buscar = responder({ resolvida: false, resolvidaPorResposta: null })
    expect(await mudarResolucao("q1", "reabrir")).toEqual({
      resolvida: false,
      resolvidaPorResposta: null,
    })
    expect(JSON.parse(String(chamada(buscar).init.body))).toEqual({ acao: "reabrir" })
  })

  it("recusa do servidor não vira pergunta resolvida", async () => {
    responder({ erro: "recusado", mensagem: "Só quem perguntou pode resolver." }, 403)
    await expect(mudarResolucao("q1", "marcar", "r1")).rejects.toMatchObject({
      codigo: "recusado",
      mensagem: "Só quem perguntou pode resolver.",
    })
  })

  it("falha da escrita é indisponibilidade, não sucesso silencioso", async () => {
    responder({ erro: "escrita-indisponivel" }, 503)
    await expect(mudarResolucao("q1", "resolver")).rejects.toMatchObject({
      codigo: "indisponivel",
    })
  })
})
