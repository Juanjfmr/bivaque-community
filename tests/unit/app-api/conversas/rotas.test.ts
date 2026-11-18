import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as marcarLida } from "web/app/api/app/conversas/[id]/lida/route"
import { POST as enviar } from "web/app/api/app/conversas/[id]/mensagens/route"
import { GET as detalhe } from "web/app/api/app/conversas/[id]/route"
import { GET as listar } from "web/app/api/app/conversas/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const ID = "41000000-0000-4000-8000-000000000051"
const USER = "20000000-0000-4000-8000-000000000001"
const OUTRO = "20000000-0000-4000-8000-00000000000a"
const BASE = "http://localhost:3000/api/app/conversas"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const context = { params: Promise.resolve({ id: ID }) }
const conversa = {
  id: ID,
  participant_a: USER,
  participant_b: OUTRO,
  context_type: "provider",
  context_id: OUTRO,
  created_at: "2026-11-01T12:00:00Z",
}
const mensagem = {
  id: ID,
  conversation_id: ID,
  content: "Olá",
  sender_id: USER,
  created_at: "2026-11-02T12:00:00Z",
}
const recebida = { ...mensagem, sender_id: OUTRO }
type Linha = Record<string, unknown>
type Filtro = { op: "eq" | "neq" | "gt" | "in"; coluna: string; valor: unknown }
function filtrar(linhas: Linha[], filtros: Filtro[]): Linha[] {
  return linhas.filter((linha) =>
    filtros.every(({ op, coluna, valor }) => {
      const atual = linha[coluna]
      if (op === "eq") return atual === valor
      if (op === "neq") return atual !== valor
      if (op === "gt") return String(atual) > String(valor)
      return (valor as unknown[]).includes(atual)
    }),
  )
}

type ChamadaDaRpc = { funcao: string; argumentos: Record<string, unknown> }
type OpcoesDoCliente = {
  ausente?: boolean
  erro?: string
  erroDoEnvio?: { code: string; message: string }
  dadoDoEnvio?: unknown
  erroDaLeitura?: { code: string; message: string }
  erroDaContagem?: boolean
  mensagens?: Linha[]
  leituras?: Linha[]
}

function cliente(opcoes: OpcoesDoCliente = {}) {
  const insercoes: unknown[] = []
  const chamadas: ChamadaDaRpc[] = []
  const from = vi.fn((tabela: string) => {
    let insert = false
    let limite: number | undefined
    const filtros: Filtro[] = []
    const linhas = (base: Linha[]) => filtrar(base, filtros).slice(0, limite)
    const resultado = (single = false) => {
      if (opcoes.erro === tabela)
        return { data: null, error: { code: "XX000", message: "segredo do banco" } }
      if (tabela === "dm_conversations")
        return { data: single ? (opcoes.ausente ? null : conversa) : [conversa], error: null }
      if (tabela === "profiles")
        return {
          data: single ? { display_name: "Maria" } : [{ user_id: OUTRO, display_name: "Maria" }],
          error: null,
        }
      if (tabela === "dm_read_states") {
        const lidas = linhas(opcoes.leituras ?? [])
        return { data: single ? (lidas[0] ?? null) : lidas, error: null }
      }
      if (tabela === "dm_messages") {
        const achadas = linhas(opcoes.mensagens ?? [mensagem])
        return { data: single ? (achadas[0] ?? null) : achadas, error: null }
      }
      return { data: null, error: null }
    }
    const q: Record<string, unknown> = {}
    for (const metodo of ["select", "lt", "or", "order"]) q[metodo] = () => q
    for (const op of ["eq", "neq", "gt", "in"] as const)
      q[op] = (coluna: string, valor: unknown) => {
        filtros.push({ op, coluna, valor })
        return q
      }
    q["limit"] = (n: number) => {
      limite = n
      return q
    }
    q["insert"] = (valor: unknown) => {
      insert = true
      insercoes.push(valor)
      return q
    }
    q["maybeSingle"] = async () => resultado(true)
    q["single"] = async () => resultado(true)
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder aguardável do PostgREST
    Object.defineProperty(q, "then", {
      value: (resolve: (valor: unknown) => unknown) => Promise.resolve(resolve(resultado(insert))),
    })
    return q
  })
  const rpc = vi.fn(async (funcao: string, argumentos: Record<string, unknown> = {}) => {
    chamadas.push({ funcao, argumentos })
    if (funcao === "unread_conversation_count")
      return opcoes.erroDaContagem
        ? { data: null, error: { code: "XX000", message: "segredo do banco" } }
        : { data: 1, error: null }
    if (funcao === "mark_conversation_read")
      return { data: null, error: opcoes.erroDaLeitura ?? null }
    if (funcao === "send_conversation_message") {
      if (opcoes.erroDoEnvio) return { data: null, error: opcoes.erroDoEnvio }
      return { data: "dadoDoEnvio" in opcoes ? opcoes.dadoDoEnvio : mensagem, error: null }
    }
    return { data: "Maria", error: null }
  })
  return { client: { from, rpc } as never, insercoes, chamadas }
}
function autenticar(c = cliente()) {
  vi.mocked(resolverSessaoDaRequisicao).mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER },
    cliente: c.client,
    cabecalhos: {},
  } as never)
  return c
}
function req(
  method: string,
  path = "",
  body?: string,
  cabecalhos: Record<string, string> = headers,
) {
  return new NextRequest(`${BASE}${path}`, {
    method,
    headers: cabecalhos,
    ...(body === undefined ? {} : { body }),
  })
}

describe("conversas do app", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolverSessaoDaRequisicao).mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })
  it.each([
    ["caixa", () => listar(req("GET"))],
    ["marcar lida", () => marcarLida(req("POST", `/${ID}/lida`), context)],
    ["detalhe", () => detalhe(req("GET", `/${ID}`), context)],
    ["envio", () => enviar(req("POST", `/${ID}/mensagens`, '{"texto":"Olá"}'), context)],
  ])("%s exige sessão", async (_, chamar) => expect((await chamar()).status).toBe(401))
  it("recusa cursor inválido antes da consulta", async () => {
    autenticar()
    expect((await listar(req("GET", "?depois=invalido"))).status).toBe(400)
    expect((await detalhe(req("GET", `/${ID}?antes=invalido`), context)).status).toBe(400)
  })
  it("lista a caixa real com nome e última mensagem", async () => {
    autenticar(cliente({ mensagens: [recebida] }))
    const resposta = await listar(req("GET"))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toMatchObject({
      porLer: 1,
      conversas: [{ porLer: true, id: ID, nome: "Maria", outroId: OUTRO, ultima: "Olá" }],
    })
  })
  it("não marca por ler a própria mensagem nem a já lida", async () => {
    autenticar(cliente({ mensagens: [mensagem] }))
    let corpo = await (await listar(req("GET"))).json()
    expect(corpo.conversas[0].porLer).toBe(false)
    const leitura = { conversation_id: ID, user_id: USER, last_read_at: "2026-11-03T12:00:00Z" }
    autenticar(cliente({ mensagens: [recebida], leituras: [leitura] }))
    corpo = await (await listar(req("GET"))).json()
    expect(corpo.conversas[0].porLer).toBe(false)
    const antiga = { ...leitura, last_read_at: "2026-11-01T12:00:00Z" }
    autenticar(cliente({ mensagens: [recebida], leituras: [antiga] }))
    corpo = await (await listar(req("GET"))).json()
    expect(corpo.conversas[0].porLer).toBe(true)
  })
  it("falha da contagem ou da leitura vira 503 sem eco do banco", async () => {
    autenticar(cliente({ erroDaContagem: true }))
    let resposta = await listar(req("GET"))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
    autenticar(cliente({ erro: "dm_read_states" }))
    resposta = await listar(req("GET"))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })
  it("marca leitura e recusa erros", async () => {
    const mock = autenticar()
    expect((await marcarLida(req("POST", `/${ID}/lida`), context)).status).toBe(204)
    expect(mock.chamadas).toEqual([
      { funcao: "mark_conversation_read", argumentos: { p_conversation_id: ID } },
    ])
    expect(
      (await marcarLida(req("POST", "/x/lida"), { params: Promise.resolve({ id: "x" }) })).status,
    ).toBe(400)
    expect((await marcarLida(req("POST", `/${ID}/lida`, undefined, {}), context)).status).toBe(403)
    autenticar(cliente({ erroDaLeitura: { code: "42501", message: "segredo" } }))
    expect((await marcarLida(req("POST", `/${ID}/lida`), context)).status).toBe(404)
    autenticar(cliente({ erroDaLeitura: { code: "XX000", message: "segredo" } }))
    expect((await marcarLida(req("POST", `/${ID}/lida`), context)).status).toBe(503)
  })
  it("detalha mensagens visíveis e identifica as próprias", async () => {
    autenticar()
    const resposta = await detalhe(req("GET", `/${ID}`), context)
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toMatchObject({
      conversa: { id: ID, nome: "Maria", outroId: OUTRO },
      mensagens: [{ conteudo: "Olá", minha: true }],
    })
  })
  it("envia pela RPC com autoria da sessão e devolve o resultado", async () => {
    const mock = autenticar()
    const resposta = await enviar(
      req("POST", `/${ID}/mensagens`, JSON.stringify({ texto: " Olá ", sender_id: OUTRO })),
      context,
    )
    expect(resposta.status).toBe(201)
    expect(mock.insercoes).toEqual([])
    expect(mock.chamadas).toEqual([
      {
        funcao: "send_conversation_message",
        argumentos: { p_conversation_id: ID, p_content: "Olá" },
      },
    ])
    expect(await resposta.json()).toMatchObject({
      mensagem: { id: ID, conteudo: "Olá", minha: true },
    })
  })
  it("manda a clientKey aparada e o replay devolve o mesmo id", async () => {
    const mock = autenticar()
    const body = JSON.stringify({ texto: "Olá", clientKey: "  chave-1  " })
    const primeira = await enviar(req("POST", `/${ID}/mensagens`, body), context)
    const segunda = await enviar(req("POST", `/${ID}/mensagens`, body), context)
    expect(primeira.status).toBe(201)
    expect(segunda.status).toBe(201)
    expect((await primeira.json()).mensagem.id).toBe(ID)
    expect((await segunda.json()).mensagem.id).toBe(ID)
    expect(mock.insercoes).toEqual([])
    expect(mock.chamadas).toEqual([
      {
        funcao: "send_conversation_message",
        argumentos: { p_conversation_id: ID, p_content: "Olá", p_client_key: "chave-1" },
      },
      {
        funcao: "send_conversation_message",
        argumentos: { p_conversation_id: ID, p_content: "Olá", p_client_key: "chave-1" },
      },
    ])
  })
  it("aceita clientKey de 120 caracteres", async () => {
    const mock = autenticar()
    const chave = "k".repeat(120)
    const resposta = await enviar(
      req("POST", `/${ID}/mensagens`, JSON.stringify({ texto: "Oi", clientKey: chave })),
      context,
    )
    expect(resposta.status).toBe(201)
    expect(mock.chamadas[0]?.argumentos["p_client_key"]).toBe(chave)
  })
  it.each([
    ['{"texto":"Oi","clientKey":""}'],
    ['{"texto":"Oi","clientKey":"   "}'],
    [JSON.stringify({ texto: "Oi", clientKey: "x".repeat(121) })],
    ['{"texto":"Oi","clientKey":42}'],
    ['{"texto":"Oi","clientKey":null}'],
    ['{"texto":"Oi","clientKey":{}}'],
  ])("recusa clientKey inválida sem chamar a RPC", async (body) => {
    const mock = autenticar()
    expect((await enviar(req("POST", `/${ID}/mensagens`, body), context)).status).toBe(400)
    expect(mock.chamadas).toEqual([])
  })
  it("responde 404 antes da RPC e não grava", async () => {
    const mock = autenticar(cliente({ ausente: true }))
    expect((await enviar(req("POST", `/${ID}/mensagens`, '{"texto":"Oi"}'), context)).status).toBe(
      404,
    )
    expect(mock.chamadas).toEqual([])
    expect(mock.insercoes).toEqual([])
  })
  it.each([
    ["22023", 400, "corpo-invalido"],
    ["23514", 400, "corpo-invalido"],
    ["42501", 403, "recusado"],
    ["XX000", 503, "escrita-indisponivel"],
  ] as const)("mapeia o erro %s da RPC para %i", async (code, status, erro) => {
    autenticar(cliente({ erroDoEnvio: { code, message: "segredo do banco" } }))
    const resposta = await enviar(req("POST", `/${ID}/mensagens`, '{"texto":"Oi"}'), context)
    expect(resposta.status).toBe(status)
    const corpo = await resposta.text()
    expect(JSON.parse(corpo)).toEqual({ erro })
    expect(corpo).not.toContain("segredo do banco")
  })
  it("resposta da RPC fora do contrato não vira mensagem", async () => {
    autenticar(cliente({ dadoDoEnvio: null }))
    expect((await enviar(req("POST", `/${ID}/mensagens`, '{"texto":"Oi"}'), context)).status).toBe(
      503,
    )
  })
  it.each([headers.origin, "https://fora.example"])("recusa porta incorreta %s", async (origem) => {
    autenticar()
    const cabecalhos =
      origem === headers.origin
        ? { ...headers, "x-bivaque-app": "errado" }
        : { ...headers, origin: origem }
    expect(
      (await enviar(req("POST", `/${ID}/mensagens`, '{"texto":"Oi"}', cabecalhos), context)).status,
    ).toBe(403)
  })
  it.each(["{}", '{"texto":"  "}', JSON.stringify({ texto: "x".repeat(2001) }), "["])(
    "recusa conteúdo inválido",
    async (body) => {
      autenticar()
      expect((await enviar(req("POST", `/${ID}/mensagens`, body), context)).status).toBe(400)
    },
  )
  it.each([
    ["detalhe", () => detalhe(req("GET", `/${ID}`), context)],
    ["envio", () => enviar(req("POST", `/${ID}/mensagens`, '{"texto":"Oi"}'), context)],
  ])("%s não revela conversa fora do alcance", async (_, chamar) => {
    autenticar(cliente({ ausente: true }))
    expect((await chamar()).status).toBe(404)
  })
  const falhas: [string, OpcoesDoCliente, () => Promise<Response>][] = [
    ["caixa", { erro: "dm_conversations" }, () => listar(req("GET"))],
    ["detalhe", { erro: "dm_messages" }, () => detalhe(req("GET", `/${ID}`), context)],
    [
      "envio",
      { erroDoEnvio: { code: "XX000", message: "segredo do banco" } },
      () => enviar(req("POST", `/${ID}/mensagens`, '{"texto":"Oi"}'), context),
    ],
  ]
  it.each(falhas)("%s informa falha do banco sem ecoar detalhes", async (_, opcoes, chamar) => {
    autenticar(cliente(opcoes))
    const resposta = await chamar()
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo do banco")
  })
})
