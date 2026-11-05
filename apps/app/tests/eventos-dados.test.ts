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
 * tradução da resposta. E as regras que mais importam nesta camada — resposta
 * fora do contrato falha alto em vez de virar lista vazia, e ausência de dado
 * não vira zero.
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

const ENCONTRO = {
  id: "e1",
  titulo: "Café",
  descricao: null,
  local: null,
  comecaEm: "2026-11-10T12:00:00.000Z",
  terminaEm: null,
  situacao: "upcoming",
  cidade: "Manaus",
}

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
      proximo: "2026-11-10T12:00:00.000Z|e1",
    })
    const agenda = await lerAgenda()
    expect(chamada(buscar).caminho).toBe("/api/app/eventos")
    expect(agenda.encontros[0]?.titulo).toBe("Café da manhã")
    expect(agenda.proximo).toBe("2026-11-10T12:00:00.000Z|e1")
  })

  it("devolve o cursor opaco sem interpretar", async () => {
    const buscar = responder({ eventos: [], proximo: null })
    const agenda = await lerAgenda({ depois: "2026-11-10T12:00:00.000Z|e1" })
    expect(chamada(buscar).caminho).toBe(
      "/api/app/eventos?depois=2026-11-10T12%3A00%3A00.000Z%7Ce1",
    )
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
  it("lê a cidade do evento, a presença e a autoria", async () => {
    const buscar = responder({
      evento: ENCONTRO,
      presenca: { confirmados: 3, minha: "going" },
      souOrganizador: false,
      visitante: false,
    })
    const encontro = await buscarEncontro("e1")
    expect(chamada(buscar).caminho).toBe("/api/app/eventos/e1")
    expect(encontro.cidade).toBe("Manaus")
    expect(encontro.presenca).toEqual({ confirmados: 3, minha: "going" })
    expect(encontro.visitante).toBe(false)
  })

  it("de outra cidade vem como visitante e sem presença", async () => {
    responder({
      evento: { ...ENCONTRO, cidade: "Rio de Janeiro" },
      presenca: null,
      souOrganizador: false,
      visitante: true,
    })
    const encontro = await buscarEncontro("e1")
    expect(encontro.visitante).toBe(true)
    expect(encontro.presenca).toBeNull()
    expect(encontro.cidade).toBe("Rio de Janeiro")
  })

  it("confirmados ausente é falha de formato, não zero", async () => {
    responder({
      evento: ENCONTRO,
      presenca: { minha: null },
      souOrganizador: false,
      visitante: false,
    })
    await expect(buscarEncontro("e1")).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("presença desconhecida vira ausência, não erro de tipo", async () => {
    responder({
      evento: ENCONTRO,
      presenca: { confirmados: 0, minha: "talvez" },
      souOrganizador: false,
      visitante: false,
    })
    const encontro = await buscarEncontro("e1")
    expect(encontro.presenca?.minha).toBeNull()
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
    expect(chamada(buscar).init.method).toBe("DELETE")
    expect(presenca).toEqual({ confirmados: 3, minha: null })
  })

  it("falha da escrita não vira presença vazia", async () => {
    responder({ erro: "escrita-indisponivel" }, 503)
    await expect(marcarPresenca("e1", "going")).rejects.toMatchObject({ codigo: "indisponivel" })
  })

  it("recusa de outra cidade chega com o motivo do servidor", async () => {
    responder({ erro: "de-outra-cidade" }, 403)
    await expect(marcarPresenca("e1", "going")).rejects.toMatchObject({
      codigo: "recusado",
      motivoDoServidor: "de-outra-cidade",
    })
  })
})

describe("criar, editar e perguntar", () => {
  const dados = { titulo: "Café", descricao: "", comecaEm: "2026-11-10T12:00:00.000Z", local: "" }

  it("cria pelo POST e devolve o id gravado", async () => {
    const buscar = responder({ evento: { id: "novo" } }, 201)
    await expect(criarEncontro(dados)).resolves.toBe("novo")
    expect(chamada(buscar).caminho).toBe("/api/app/eventos")
    expect(chamada(buscar).init.method).toBe("POST")
  })

  it("edita pelo PATCH no id, sem campo de capa", async () => {
    const buscar = responder({ evento: { id: "e1" } })
    await editarEncontro("e1", dados)
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/eventos/e1")
    expect(init.method).toBe("PATCH")
    // Sem capa no corpo: o servidor não toca no cover_path (item 1 da revisão).
    expect(Object.keys(JSON.parse(String(init.body)))).not.toContain("capa")
  })

  it("pergunta pelo POST e devolve a conversa", async () => {
    const buscar = responder({ conversaId: "c1", mensagemId: "m1" }, 201)
    await expect(perguntarAoOrganizador("e1", "Vai ter estacionamento?")).resolves.toBe("c1")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/eventos/e1/perguntas")
    expect(JSON.parse(String(init.body))).toEqual({ texto: "Vai ter estacionamento?" })
  })
})
