import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import {
  lerGuia,
  lerMinhasCorrecoes,
  lerVerbete,
  marcarNoGuia,
  sugerirAtualizacao,
  sugerirLugar,
} from "@/lib/dados/guia"

/**
 * A porta do Guia (F08), no molde de `eventos-dados.test.ts`: caminho, método,
 * corpo e tradução. O que mais importa aqui é a regra da casa — resposta fora
 * do contrato falha alto em vez de virar diretório vazio, e o marcador devolve
 * o que o servidor gravou, não o que a tela pediu.
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

const ENTRADA = {
  id: "a1",
  categoria: "school",
  nome: "Escola Modelo",
  descricao: "Turno integral.",
  site: null,
  telefone: null,
  salvo: false,
}

describe("diretório do guia", () => {
  it("envia sugestão de lugar novo pela rota do app", async () => {
    const buscar = responder({ enviada: true }, 201)
    await sugerirLugar({ nome: "Escola Modelo", categoria: "school", descricao: "Boa referência" })
    expect(chamada(buscar)).toMatchObject({
      caminho: "/api/app/guia/sugestao",
      init: { method: "POST" },
    })
  })
  it("preserva a mensagem fixa de limite enviada pela rota", async () => {
    const buscar = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            erro: "limite",
            mensagem: "Você já tem cinco sugestões aguardando revisão.",
          }),
          { status: 429 },
        ),
    )
    vi.stubGlobal("fetch", buscar)
    await expect(
      sugerirLugar({ nome: "Escola Modelo", categoria: "school", descricao: "" }),
    ).rejects.toMatchObject({ mensagem: "Você já tem cinco sugestões aguardando revisão." })
  })
  it("traduz a lista, a cidade e o cursor", async () => {
    const buscar = responder({
      entradas: [ENTRADA],
      proximo: "Escola Modelo|a1",
      cidade: "Manaus",
    })
    const guia = await lerGuia()
    expect(chamada(buscar).caminho).toBe("/api/app/guia")
    expect(guia.entradas[0]).toMatchObject({ nome: "Escola Modelo", categoria: "school" })
    expect(guia.cidade).toBe("Manaus")
    expect(guia.proximo).toBe("Escola Modelo|a1")
  })

  it("leva busca, categoria e cursor na query", async () => {
    const buscar = responder({ entradas: [], proximo: null, cidade: "Manaus" })
    await lerGuia({ q: "  escola ", categoria: "school", depois: "Escola Modelo|a1" })
    expect(chamada(buscar).caminho).toBe(
      "/api/app/guia?q=escola&categoria=school&depois=Escola+Modelo%7Ca1",
    )
  })

  it("recusa corpo fora do contrato em vez de fingir diretório vazio", async () => {
    responder({ itens: [] })
    await expect(lerGuia()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("recusa categoria desconhecida e entrada sem nome", async () => {
    responder({ entradas: [{ ...ENTRADA, categoria: "padaria" }], proximo: null })
    await expect(lerGuia()).rejects.toBeInstanceOf(FalhaDaApi)
    responder({ entradas: [{ ...ENTRADA, nome: "" }], proximo: null })
    await expect(lerGuia()).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("verbete", () => {
  it("lê a entrada e se há artigo para sugerir", async () => {
    const buscar = responder({ entrada: ENTRADA, podeSugerir: true })
    const verbete = await lerVerbete("a1")
    expect(chamada(buscar).caminho).toBe("/api/app/guia/a1")
    expect(verbete.entrada.salvo).toBe(false)
    expect(verbete.podeSugerir).toBe(true)
  })

  it("entrada ausente é falha de formato, não verbete vazio", async () => {
    responder({ podeSugerir: false })
    await expect(lerVerbete("a1")).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("minhas sugestões", () => {
  const SUGESTAO = {
    id: "s1",
    status: "Recebida",
    descricao: "O telefone do balcão mudou.",
    decisao: null,
    criadaEm: "2026-11-14T10:00:00.000Z",
  }

  it("lê o acompanhamento do verbete no caminho dele", async () => {
    const buscar = responder({ sugestoes: [SUGESTAO] })
    const sugestoes = await lerMinhasCorrecoes("a1")
    expect(chamada(buscar).caminho).toBe("/api/app/guia/a1/correcoes")
    expect(sugestoes).toEqual([SUGESTAO])
  })

  it("lista vazia é resposta legítima, não falha", async () => {
    responder({ sugestoes: [] })
    expect(await lerMinhasCorrecoes("a1")).toEqual([])
  })

  it("status vazio é falha de formato, não etiqueta em branco", async () => {
    responder({ sugestoes: [{ ...SUGESTAO, status: "" }] })
    await expect(lerMinhasCorrecoes("a1")).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("mostra o rótulo que o servidor mandou, sem traduzir de novo", async () => {
    // O vocabulário do banco é do servidor (`correctionStatusLabel`): um status
    // novo chega aqui como "Status desconhecido", nunca como palavra crua.
    responder({ sugestoes: [{ ...SUGESTAO, status: "Status desconhecido" }] })
    expect((await lerMinhasCorrecoes("a1"))[0]?.status).toBe("Status desconhecido")
  })

  it("resposta sem a lista é falha de formato", async () => {
    responder({ sugestoes: null })
    await expect(lerMinhasCorrecoes("a1")).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("marcador", () => {
  it("grava com PUT e desgrava com DELETE, devolvendo o estado do servidor", async () => {
    const buscar = responder({ salvo: true })
    expect(await marcarNoGuia("a1", true)).toBe(true)
    expect(chamada(buscar).init.method).toBe("PUT")

    const desmarcar = responder({ salvo: false })
    expect(await marcarNoGuia("a1", false)).toBe(false)
    expect(chamada(desmarcar).init.method).toBe("DELETE")
  })

  it("resposta sem o estado gravado não vira otimismo local", async () => {
    responder({ ok: true })
    await expect(marcarNoGuia("a1", true)).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("sugestão", () => {
  it("manda o texto e devolve o id criado", async () => {
    const buscar = responder({ sugestao: { id: "s1" } }, 201)
    const id = await sugerirAtualizacao("a1", { descricao: "Mudou.", referencia: "balcão" })
    expect(chamada(buscar).caminho).toBe("/api/app/guia/a1/sugestao")
    expect(JSON.parse(chamada(buscar).init.body as string)).toEqual({
      descricao: "Mudou.",
      referencia: "balcão",
    })
    expect(id).toBe("s1")
  })

  it("resposta sem id é falha de formato", async () => {
    responder({}, 201)
    await expect(
      sugerirAtualizacao("a1", { descricao: "Mudou.", referencia: "" }),
    ).rejects.toBeInstanceOf(FalhaDaApi)
  })
})
