import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import {
  buscarEncontro,
  cancelarPresenca,
  criarEncontro,
  editarEncontro,
  lerAgenda,
  marcarPresenca,
  perguntarAoOrganizador,
} from "@/lib/dados/eventos"

/**
 * A porta da jornada de eventos (ADR-20261105 §2): caminho, método, corpo e
 * tradução da resposta. E a regra que mais importa nesta camada — resposta fora
 * do contrato falha alto, em vez de virar uma lista vazia bonita.
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

describe("agenda da cidade", () => {
  it("traduz a lista e o cursor", async () => {
    const buscar = responder({
      eventos: [
        {
          id: "e1",
          titulo: "Café da manhã",
          local: "Praça",
          comecaEm: "2026-11-10T12:00:00.000Z",
          situacao: "upcoming",
        },
      ],
      proximo: "2026-11-10T12:00:00.000Z",
    })
    const agenda = await lerAgenda()
    expect(chamada(buscar).caminho).toBe("/api/app/eventos")
    expect(agenda.encontros).toHaveLength(1)
    expect(agenda.encontros[0]).toEqual({
      id: "e1",
      titulo: "Café da manhã",
      local: "Praça",
      comecaEm: "2026-11-10T12:00:00.000Z",
      situacao: "upcoming",
    })
    expect(agenda.proximo).toBe("2026-11-10T12:00:00.000Z")
  })

  it("passa o cursor de paginação e aceita fim de lista", async () => {
    const buscar = responder({ eventos: [], proximo: null })
    const agenda = await lerAgenda({ depois: "2026-11-10T12:00:00.000Z" })
    expect(chamada(buscar).caminho).toBe("/api/app/eventos?depois=2026-11-10T12%3A00%3A00.000Z")
    expect(agenda.proximo).toBeNull()
  })

  it("recusa corpo fora do contrato em vez de fingir lista vazia", async () => {
    responder({ encontros: [] })
    await expect(lerAgenda()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("recusa item sem id ou sem data", async () => {
    responder({ eventos: [{ titulo: "Sem id" }], proximo: null })
    await expect(lerAgenda()).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("detalhe do encontro", () => {
  it("lê o encontro com presença e autoria", async () => {
    const buscar = responder({
      evento: {
        id: "e1",
        titulo: "Café",
        descricao: null,
        local: null,
        comecaEm: "2026-11-10T12:00:00.000Z",
        terminaEm: null,
        situacao: "upcoming",
        capa: null,
      },
      presenca: { confirmados: 3, minha: "going" },
      souOrganizador: false,
    })
    const encontro = await buscarEncontro("e1")
    expect(chamada(buscar).caminho).toBe("/api/app/eventos/e1")
    expect(encontro.presenca).toEqual({ confirmados: 3, minha: "going" })
    expect(encontro.souOrganizador).toBe(false)
    expect(encontro.descricao).toBeNull()
  })

  it("presença desconhecida vira ausência, não erro de tipo", async () => {
    responder({
      evento: {
        id: "e1",
        titulo: "Café",
        comecaEm: "2026-11-10T12:00:00.000Z",
        situacao: "upcoming",
      },
      presenca: { confirmados: 0, minha: "talvez" },
      souOrganizador: false,
    })
    const encontro = await buscarEncontro("e1")
    expect(encontro.presenca.minha).toBeNull()
  })
})

describe("presença", () => {
  it("marca pelo PUT com a situação no corpo e devolve o gravado", async () => {
    const buscar = responder({ presenca: { confirmados: 4, minha: "going" } })
    const presenca = await marcarPresenca("e1", "going")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/eventos/e1/presenca")
    expect(init.method).toBe("PUT")
    expect(JSON.parse(String(init.body))).toEqual({ situacao: "going" })
    expect(presenca).toEqual({ confirmados: 4, minha: "going" })
  })

  it("cancela pelo DELETE e devolve a contagem já sem a pessoa", async () => {
    const buscar = responder({ presenca: { confirmados: 3, minha: null } })
    const presenca = await cancelarPresenca("e1")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/eventos/e1/presenca")
    expect(init.method).toBe("DELETE")
    expect(presenca).toEqual({ confirmados: 3, minha: null })
  })

  it("falha da escrita não vira presença vazia", async () => {
    responder({ erro: "escrita-indisponivel" }, 503)
    await expect(marcarPresenca("e1", "going")).rejects.toMatchObject({ codigo: "indisponivel" })
  })
})

describe("criar, editar e perguntar", () => {
  const dados = { titulo: "Café", descricao: "", comecaEm: "2026-11-10T12:00:00.000Z", local: "" }

  it("cria pelo POST e devolve o id gravado", async () => {
    const buscar = responder({ evento: { id: "novo" } }, 201)
    await expect(criarEncontro(dados)).resolves.toBe("novo")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/eventos")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual(dados)
  })

  it("edita pelo PATCH no id", async () => {
    const buscar = responder({ evento: { id: "e1" } })
    await editarEncontro("e1", dados)
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/eventos/e1")
    expect(init.method).toBe("PATCH")
  })

  it("pergunta pelo POST e devolve a conversa", async () => {
    const buscar = responder({ conversaId: "c1", mensagemId: "m1" }, 201)
    await expect(perguntarAoOrganizador("e1", "Vai ter estacionamento?")).resolves.toBe("c1")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/eventos/e1/perguntas")
    expect(JSON.parse(String(init.body))).toEqual({ texto: "Vai ter estacionamento?" })
  })
})

describe("contrato de erro", () => {
  it("404 do detalhe chega com o código certo para a tela decidir", async () => {
    responder({ erro: "evento-nao-encontrado" }, 404)
    await expect(buscarEncontro("x")).rejects.toMatchObject({ codigo: "nao-encontrado" })
  })
})
