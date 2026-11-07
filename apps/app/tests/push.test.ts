import { afterEach, describe, expect, it, vi } from "vitest"

import {
  aplicarChave,
  comPushEmTodos,
  desinscreverPush,
  deveOferecerPush,
  estadoDoInterruptorDePush,
  inscreverPush,
  type NavegadorDePush,
  saiuDoApp,
} from "@/lib/dados/push"

const DESTINO = "https://updates.push.services.mozilla.com/wpush/v2/abc"
const CHAVE_PUBLICA = "BOr3D2k9_1x2y3z4"

function navegador(overrides: Partial<NavegadorDePush> = {}): NavegadorDePush {
  return {
    suportado: () => true,
    pedirPermissao: async () => "granted",
    inscrever: async () => ({
      endpoint: DESTINO,
      keys: { p256dh: "chave-publica", auth: "segredo" },
    }),
    inscricaoAtual: async () => ({
      endpoint: DESTINO,
      keys: { p256dh: "chave-publica", auth: "segredo" },
    }),
    cancelar: async () => undefined,
    rotulo: () => "Navegador",
    ...overrides,
  }
}

type Resposta = { status?: number; corpo: unknown }

function respostas(opcoes: { configurado?: boolean; get?: Resposta; escrita?: Resposta } = {}) {
  const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
    const metodo = init?.method ?? "GET"
    if (metodo === "GET") {
      const resposta = opcoes.get ?? {
        status: 200,
        corpo: {
          configurado: opcoes.configurado ?? true,
          chavePublica: opcoes.configurado === false ? null : CHAVE_PUBLICA,
        },
      }
      return new Response(JSON.stringify(resposta.corpo), { status: resposta.status ?? 200 })
    }
    const resposta = opcoes.escrita ?? { status: 200, corpo: { removidos: 1 } }
    return new Response(JSON.stringify(resposta.corpo), { status: resposta.status ?? 200 })
  })
  vi.stubGlobal("fetch", fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("interruptor de push", () => {
  it("só aparece com suporte do navegador e chave configurada", () => {
    expect(deveOferecerPush(true, true)).toBe(true)
    expect(deveOferecerPush(true, false)).toBe(false)
    expect(deveOferecerPush(false, true)).toBe(false)
  })

  it("decodifica a chave VAPID base64url", () => {
    expect([...aplicarChave("AQID")]).toEqual([1, 2, 3])
    expect([...aplicarChave("-_8")]).toEqual([251, 255])
  })

  it("sem suporte não pede permissão", async () => {
    const pedirPermissao = vi.fn(async () => "granted" as const)
    const fetch = respostas()
    const resultado = await inscreverPush({
      navegador: navegador({ suportado: () => false, pedirPermissao }),
    })
    expect(resultado).toEqual({ estado: "indisponivel" })
    expect(pedirPermissao).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("sem chave no servidor não inscreve nem grava", async () => {
    const inscrever = vi.fn(async () => ({
      endpoint: DESTINO,
      keys: { p256dh: "p", auth: "a" },
    }))
    respostas({ configurado: false })
    const resultado = await inscreverPush({ navegador: navegador({ inscrever }) })
    expect(resultado).toEqual({ estado: "indisponivel" })
    expect(inscrever).not.toHaveBeenCalled()
  })

  it("permissão negada mantém desligado e não grava", async () => {
    const fetch = respostas()
    const resultado = await inscreverPush({
      navegador: navegador({ pedirPermissao: async () => "denied" }),
    })
    expect(resultado).toEqual({ estado: "negado" })
    expect(fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false)
  })

  it("permissão concedida inscreve e grava pela rota", async () => {
    const fetch = respostas()
    const resultado = await inscreverPush({ navegador: navegador() })
    expect(resultado).toEqual({ estado: "inscrito" })

    const post = fetch.mock.calls.find(([, init]) => init?.method === "POST")
    expect(post?.[0]).toBe("/api/app/push")
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      kind: "web",
      destination: DESTINO,
      keys: { p256dh: "chave-publica", auth: "segredo" },
      label: "Navegador",
    })
  })

  it("falha de rede ao gravar mantém desligado", async () => {
    respostas({ escrita: { status: 503, corpo: { erro: "escrita-indisponivel" } } })
    expect(await inscreverPush({ navegador: navegador() })).toEqual({ estado: "falhou" })
  })

  it("desligar apaga a inscrição e cancela no navegador", async () => {
    const fetch = respostas()
    const cancelar = vi.fn(async () => undefined)
    const removidos = await desinscreverPush({ navegador: navegador({ cancelar }) })
    expect(removidos).toBe(1)
    expect(cancelar).toHaveBeenCalled()
    const apagar = fetch.mock.calls.find(([, init]) => init?.method === "DELETE")
    expect(JSON.parse(String(apagar?.[1]?.body))).toEqual({ destination: DESTINO })
  })

  it("estado do interruptor reflete a configuração e a inscrição do aparelho", async () => {
    respostas({ configurado: true })
    expect(await estadoDoInterruptorDePush(navegador())).toEqual({
      disponivel: true,
      ligado: true,
    })
    expect(
      await estadoDoInterruptorDePush(navegador({ inscricaoAtual: async () => null })),
    ).toEqual({ disponivel: true, ligado: false })
    expect(await estadoDoInterruptorDePush(navegador({ suportado: () => false }))).toEqual({
      disponivel: false,
      ligado: false,
    })
  })

  it("abrir as preferências regrava a inscrição que o navegador já tem", async () => {
    const fetch = respostas({ configurado: true })
    await estadoDoInterruptorDePush(navegador())

    // A retenção de 90 dias pode ter apagado a linha; o aparelho já autorizou,
    // então o servidor volta a saber deste destino sem pedir permissão de novo.
    const post = fetch.mock.calls.find(([, init]) => init?.method === "POST")
    expect(post?.[0]).toBe("/api/app/push")
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      kind: "web",
      destination: DESTINO,
      keys: { p256dh: "chave-publica", auth: "segredo" },
      label: "Navegador",
    })
  })

  it("só a entrada sem sessão é saída do app", () => {
    expect(saiuDoApp("entrar", false)).toBe(true)
    expect(saiuDoApp("entrar", true)).toBe(false)
    expect(saiuDoApp("inicio", false)).toBe(false)
  })
})

describe("preferência do push", () => {
  it("liga e desliga o canal push em todos os tipos", () => {
    const base = {
      comments: true,
      events: true,
      productNews: false,
      indications: true,
      resumoCidade: "off" as const,
      channels: [
        { notificationType: "comments" as const, channel: "email" as const, enabled: true },
        { notificationType: "comments" as const, channel: "push" as const, enabled: false },
      ],
    }
    const ligado = comPushEmTodos(base, true)
    expect(ligado.channels.filter((canal) => canal.channel === "push")).toHaveLength(4)
    expect(ligado.channels.every((canal) => canal.channel !== "push" || canal.enabled)).toBe(true)
    expect(ligado.channels.some((canal) => canal.channel === "email" && canal.enabled)).toBe(true)

    const desligado = comPushEmTodos(ligado, false)
    expect(desligado.channels.filter((canal) => canal.channel === "push")).toHaveLength(4)
    expect(desligado.channels.every((canal) => canal.channel !== "push" || !canal.enabled)).toBe(
      true,
    )
  })
})
