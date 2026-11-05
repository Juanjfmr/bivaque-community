import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import { lerGuia, lerVerbete, marcarNoGuia, sugerirAtualizacao } from "@/lib/dados/guia"

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
