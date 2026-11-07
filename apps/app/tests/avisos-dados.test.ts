import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import {
  chaveDaPreferencia,
  comTipo,
  destinoEmRota,
  lerAvisos,
  lerPreferenciasDeAviso,
  marcarLido,
  marcarTodosLidos,
  type PreferenciasDeAviso,
  salvarPreferenciasDeAviso,
  TIPOS_DO_AVISO,
} from "@/lib/dados/avisos"

const aviso = {
  id: "a1",
  tipo: "comment",
  texto: "comentou na sua publicação",
  destino: "/app/publicacao/90000000-0000-4000-8000-000000000001",
  lida: false,
  criadaEm: "2026-11-06T12:00:00.000Z",
}

function responder(corpo: unknown, status = 200) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(corpo), { status }))
  vi.stubGlobal("fetch", fetch)
  return fetch
}

function preferencias(): PreferenciasDeAviso {
  return {
    comments: true,
    events: false,
    productNews: false,
    indications: true,
    resumoCidade: "off",
    channels: [
      { notificationType: "comments", channel: "in_app", enabled: true },
      { notificationType: "comments", channel: "email", enabled: true },
      { notificationType: "comments", channel: "push", enabled: false },
    ],
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("porta de avisos", () => {
  it("lê a lista com filtro, limite e cursor", async () => {
    const fetch = responder({ avisos: [aviso], proximo: "20", naoLidos: 3 })
    const signal = new AbortController().signal
    expect(await lerAvisos({ filtro: "nao-lidas", limite: "1", signal })).toEqual({
      avisos: [aviso],
      proximo: "20",
      naoLidos: 3,
    })
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/avisos?filtro=nao-lidas&limite=1",
      expect.objectContaining({ signal }),
    )
  })

  it("resposta fora do contrato é falha, não caixa vazia", async () => {
    responder({ avisos: [{ id: "a1" }], proximo: null, naoLidos: 0 })
    await expect(lerAvisos()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("falha de leitura sobe com o código do servidor", async () => {
    responder({ erro: "leitura-indisponivel" }, 503)
    await expect(lerAvisos()).rejects.toMatchObject({ codigo: "indisponivel" })
  })

  it("marca um aviso e todos os não lidos", async () => {
    const um = responder({ atualizados: 1 })
    expect(await marcarLido("a1")).toBe(1)
    expect(um).toHaveBeenCalledWith(
      "/api/app/avisos/lidos",
      expect.objectContaining({ method: "POST", body: '{"id":"a1"}' }),
    )

    const todos = responder({ atualizados: 4 })
    expect(await marcarTodosLidos()).toBe(4)
    expect(todos).toHaveBeenCalledWith(
      "/api/app/avisos/lidos",
      expect.objectContaining({ method: "POST", body: '{"todos":true}' }),
    )
  })

  it.each(["off", "daily", "weekly"] as const)(
    "grava a frequência %s e lê o resultado",
    async (resumoCidade) => {
      const escolha = { ...preferencias(), resumoCidade }
      const escrita = responder({ preferencias: escolha })
      expect(await salvarPreferenciasDeAviso(escolha)).toEqual(escolha)
      expect(escrita).toHaveBeenCalledWith(
        "/api/app/avisos/preferencias",
        expect.objectContaining({ body: expect.stringContaining(JSON.stringify(resumoCidade)) }),
      )
    },
  )

  it("lê e grava preferências no formato da matriz", async () => {
    responder({ preferencias: preferencias() })
    expect(await lerPreferenciasDeAviso()).toEqual(preferencias())

    const escrita = responder({ preferencias: preferencias() })
    const gravadas = await salvarPreferenciasDeAviso({
      comments: true,
      events: false,
      productNews: false,
      indications: true,
      resumoCidade: "off",
      channels: preferencias().channels.map((canal) => ({
        notificationType: canal.notificationType as "comments",
        channel: canal.channel as "in_app",
        enabled: canal.enabled,
      })),
    })
    expect(gravadas.comments).toBe(true)
    expect(escrita).toHaveBeenCalledWith(
      "/api/app/avisos/preferencias",
      expect.objectContaining({ method: "PATCH" }),
    )
  })

  it("liga e desliga cada tipo, inclusive novidades, e manda a chave certa no PATCH", async () => {
    for (const tipo of TIPOS_DO_AVISO) {
      const chave = chaveDaPreferencia(tipo)
      const antes = preferencias()[chave]
      const ligado = comTipo(preferencias(), tipo, !antes)
      expect(ligado[chave], tipo).toBe(!antes)
      expect(comTipo(ligado, tipo, antes)[chave], tipo).toBe(antes)

      const escrita = responder({ preferencias: { ...preferencias(), [chave]: !antes } })
      await salvarPreferenciasDeAviso(ligado)
      expect(escrita).toHaveBeenCalledWith(
        "/api/app/avisos/preferencias",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining(`"${chave}":${String(!antes)}`),
        }),
      )
    }
  })

  it("preferência com canal desconhecido é falha de contrato", async () => {
    responder({
      preferencias: {
        ...preferencias(),
        channels: [{ notificationType: "comments", channel: "fax", enabled: true }],
      },
    })
    await expect(lerPreferenciasDeAviso()).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("destino do aviso no app", () => {
  it("separa a rota do parâmetro", () => {
    expect(destinoEmRota("/app/publicacao/90000000-0000-4000-8000-000000000001")).toEqual({
      nome: "publicacao",
      parametros: { id: "90000000-0000-4000-8000-000000000001" },
    })
    expect(destinoEmRota("/app/voce")).toEqual({ nome: "voce", parametros: undefined })
    expect(destinoEmRota("/app/chamados")).toEqual({ nome: "chamados", parametros: undefined })
  })

  it("decodifica id com caractere escapado", () => {
    expect(destinoEmRota("/app/conversa/a%7Cb")).toEqual({
      nome: "conversa",
      parametros: { id: "a|b" },
    })
  })

  it("rota fora do app é nula — quem chama escolhe a tela segura", () => {
    expect(destinoEmRota("/community?post=1")).toBeNull()
    expect(destinoEmRota("/app/nao-existe/1")).toBeNull()
    expect(destinoEmRota("")).toBeNull()
  })
})
