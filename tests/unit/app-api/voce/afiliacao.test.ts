import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET, OPTIONS, PUT } from "web/app/api/app/voce/afiliacao/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

// Força Armada e OM no app (F10 / RUN-170, ADR-20261116): autodeclaração
// PRIVADA. O que este teste guarda:
//
//   1. `is_visible` é false SEMPRE, mesmo quando o corpo não fala de
//      visibilidade — e um corpo que fala é recusado (400), porque o app não
//      tem toggle e o ADR aposentou o da web;
//   2. limpar o campo apaga a linha (D3), que é o único "remover" que existe;
//   3. a regra de valor é a compartilhada (`web/lib/profile/affiliation.ts`):
//      enum fechado, OM de até 80 com varredura de CPF e CEP;
//   4. a posse é do banco: a leitura não filtra dono nesta camada, e o
//      `user_id` gravado é o da sessão.

const PESSOA = "20000000-0000-4000-8000-000000000001"
const ORIGEM = "http://localhost:3200"
const URL_DA_ROTA = "http://localhost:3000/api/app/voce/afiliacao"

type Opcoes = {
  /** Linhas que a RLS devolve para o dono. */
  linhas?: readonly { field: string; value: string }[]
  /** Erro do banco na leitura. */
  erroNaLeitura?: { code: string; message: string }
  /** Erro do banco na escrita (upsert ou delete). */
  erroNaEscrita?: { code: string; message: string }
}

function cliente(opcoes: Opcoes = {}) {
  const upserts: { field: string; value: string; is_visible: boolean; user_id: string }[][] = []
  const apagados: { campos: string[]; user_id: string | null }[] = []
  const filtros: Record<string, string> = {}

  const from = vi.fn((tabela: string) => {
    if (tabela !== "profile_affiliations") throw new Error(`tabela inesperada: ${tabela}`)
    const q: Record<string, unknown> = {}
    q["select"] = () => q
    q["eq"] = (coluna: string, valor: string) => {
      filtros[coluna] = valor
      return q
    }
    q["in"] = (_coluna: string, valores: string[]) => {
      apagados.push({ campos: valores, user_id: filtros["user_id"] ?? null })
      return Promise.resolve({ error: opcoes.erroNaEscrita ?? null })
    }
    q["upsert"] = (linhas: Record<string, unknown>[]) => {
      upserts.push(linhas as never)
      return Promise.resolve({ error: opcoes.erroNaEscrita ?? null })
    }
    q["delete"] = () => q
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder aguardável do PostgREST
    Object.defineProperty(q, "then", {
      value: (resolve: (valor: unknown) => unknown) =>
        Promise.resolve(
          resolve(
            opcoes.erroNaLeitura === undefined
              ? { data: opcoes.linhas ?? [], error: null }
              : { data: null, error: opcoes.erroNaLeitura },
          ),
        ),
    })
    return q
  })

  return { client: { from } as never, upserts, apagados }
}

function autenticar(opcoes: Opcoes = {}) {
  const mock = cliente(opcoes)
  vi.mocked(resolverSessaoDaRequisicao).mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: PESSOA },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
  return mock
}

function gravacao(corpo: unknown, opcoes: { cabecalho?: boolean; origem?: string } = {}) {
  const headers: Record<string, string> = { origin: opcoes.origem ?? ORIGEM }
  if (opcoes.cabecalho !== false) headers["x-bivaque-app"] = "bivaque-spa"
  headers["content-type"] = "application/json"
  return new NextRequest(URL_DA_ROTA, {
    method: "PUT",
    headers,
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  })
}

function leitura() {
  return new NextRequest(URL_DA_ROTA, { method: "GET", headers: { origin: ORIGEM } })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  vi.mocked(resolverSessaoDaRequisicao).mockResolvedValue({
    estado: "recusada",
    sessao: { estado: "recusada", motivo: "sem-credencial" },
  } as never)
})

describe("GET /api/app/voce/afiliacao", () => {
  it("sem nada declarado devolve os dois campos vazios", async () => {
    autenticar()
    const resposta = await GET(leitura())
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ afiliacao: { armedForce: null, om: null } })
  })

  it("devolve o que a RLS de dono entregou, sem is_visible no corpo", async () => {
    autenticar({
      linhas: [
        { field: "armed_force", value: "marinha" },
        { field: "om", value: "12º BIS" },
      ],
    })
    const resposta = await GET(leitura())
    const corpo = await resposta.json()
    expect(corpo).toEqual({ afiliacao: { armedForce: "marinha", om: "12º BIS" } })
    // O app não recebe `is_visible`: a visibilidade não é uma decisão da tela
    // (ADR-20261116), e o corpo só tem os dois campos.
    expect(JSON.stringify(corpo)).not.toContain("is_visible")
  })

  it("linha fora dos dois campos aprovados é ignorada, nunca exibida", async () => {
    autenticar({ linhas: [{ field: "posto", value: "coronel" }] })
    expect(await (await GET(leitura())).json()).toEqual({
      afiliacao: { armedForce: null, om: null },
    })
  })

  it("sem sessão responde 401", async () => {
    expect((await GET(leitura())).status).toBe(401)
  })

  it("falha de leitura é 503 sem eco", async () => {
    autenticar({ erroNaLeitura: { code: "XX000", message: "segredo do banco" } })
    const resposta = await GET(leitura())
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo do banco")
  })
})

describe("PUT /api/app/voce/afiliacao", () => {
  it("grava com is_visible false mesmo sem o corpo falar de visibilidade", async () => {
    const mock = autenticar({
      linhas: [
        { field: "armed_force", value: "exercito" },
        { field: "om", value: "1º BIS" },
      ],
    })
    const resposta = await PUT(gravacao({ armedForce: "exercito", om: "  1º BIS  " }))
    expect(resposta.status).toBe(200)
    expect(mock.upserts).toEqual([
      [
        {
          user_id: PESSOA,
          field: "armed_force",
          value: "exercito",
          is_visible: false,
          updated_at: expect.any(String),
        },
        {
          user_id: PESSOA,
          field: "om",
          value: "1º BIS",
          is_visible: false,
          updated_at: expect.any(String),
        },
      ],
    ])
    expect(mock.apagados).toEqual([])
    expect(await resposta.json()).toEqual({
      afiliacao: { armedForce: "exercito", om: "1º BIS" },
    })
  })

  it.each([
    ["is_visible no corpo", { armedForce: "marinha", is_visible: true }],
    ["armedForceVisible", { armedForce: "marinha", armedForceVisible: true }],
    ["omVisible", { om: "1º BIS", omVisible: true }],
    ["visibilidade com outro nome", { om: "1º BIS", visivel: true }],
  ])("corpo com %s é 400 e não grava nada", async (_, corpo) => {
    const mock = autenticar()
    expect((await PUT(gravacao(corpo))).status).toBe(400)
    expect(mock.upserts).toEqual([])
    expect(mock.apagados).toEqual([])
  })

  it("campo vazio apaga a linha: é o remover que existe (D3)", async () => {
    const mock = autenticar({ linhas: [{ field: "armed_force", value: "marinha" }] })
    const resposta = await PUT(gravacao({ om: null }))
    expect(resposta.status).toBe(200)
    expect(mock.upserts).toEqual([])
    expect(mock.apagados).toEqual([{ campos: ["om"], user_id: PESSOA }])
    expect(await resposta.json()).toEqual({ afiliacao: { armedForce: "marinha", om: null } })
  })

  it("limpar os dois campos apaga as duas linhas", async () => {
    const mock = autenticar()
    await PUT(gravacao({ armedForce: null, om: "" }))
    expect(mock.upserts).toEqual([])
    expect(mock.apagados).toEqual([{ campos: ["armed_force", "om"], user_id: PESSOA }])
  })

  it.each([
    ["força fora do enum", { armedForce: "fuzileiros" }],
    ["OM com CPF", { om: "52998224725" }],
    ["OM acima do teto", { om: "x".repeat(81) }],
  ])("%s é 400 e não grava nada", async (_, corpo) => {
    const mock = autenticar()
    const resposta = await PUT(gravacao(corpo))
    expect(resposta.status).toBe(400)
    expect((await resposta.json()).erro).toBe("dados-invalidos")
    expect(mock.upserts).toEqual([])
    expect(mock.apagados).toEqual([])
  })

  it.each([{}, "[]", { armedForce: 3 }, { om: 12 }])("corpo inválido %s é 400", async (corpo) => {
    autenticar()
    expect((await PUT(gravacao(corpo))).status).toBe(400)
  })

  it("sem sessão responde 401", async () => {
    expect((await PUT(gravacao({ om: "1º BIS" }))).status).toBe(401)
  })

  it("sem o cabeçalho do app e com origem fora da lista responde 403", async () => {
    const mock = autenticar()
    expect((await PUT(gravacao({ om: "1º BIS" }, { cabecalho: false }))).status).toBe(403)
    expect((await PUT(gravacao({ om: "1º BIS" }, { origem: "https://fora.example" }))).status).toBe(
      403,
    )
    expect(mock.upserts).toEqual([])
  })

  it("falha desconhecida do banco vira 503 sem eco", async () => {
    autenticar({ erroNaEscrita: { code: "XX000", message: "segredo do banco" } })
    const resposta = await PUT(gravacao({ om: "1º BIS" }))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo do banco")
  })

  it("check do banco (23514) vira 400 com frase segura", async () => {
    autenticar({ erroNaEscrita: { code: "23514", message: "violates check constraint" } })
    const resposta = await PUT(gravacao({ om: "1º BIS" }))
    expect(resposta.status).toBe(400)
    expect(await resposta.text()).not.toContain("constraint")
  })
})

describe("OPTIONS /api/app/voce/afiliacao", () => {
  it("responde o preflight da origem do app", () => {
    expect(
      OPTIONS(new NextRequest(URL_DA_ROTA, { method: "OPTIONS", headers: { origin: ORIGEM } }))
        .status,
    ).toBe(204)
  })

  it("origem fora da lista não ganha preflight", () => {
    expect(
      OPTIONS(
        new NextRequest(URL_DA_ROTA, {
          method: "OPTIONS",
          headers: { origin: "https://fora.example" },
        }),
      ).status,
    ).toBe(403)
  })
})
