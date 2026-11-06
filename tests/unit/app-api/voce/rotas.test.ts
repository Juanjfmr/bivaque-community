import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as apagar } from "web/app/api/app/voce/apagar-conta/route"
import { DELETE as desbloquear } from "web/app/api/app/voce/bloqueados/[id]/route"
import { GET as bloqueados } from "web/app/api/app/voce/bloqueados/route"
import { DELETE as desocultar } from "web/app/api/app/voce/ocultados/[id]/route"
import { GET as ocultados } from "web/app/api/app/voce/ocultados/route"
import { GET as publicacoes } from "web/app/api/app/voce/publicacoes/route"
import { PATCH as editar, GET as perfil } from "web/app/api/app/voce/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const USER = "20000000-0000-4000-8000-000000000001"
const OUTRO = "30000000-0000-4000-8000-00000000001a"
const PERGUNTA = "50000000-0000-4000-8000-000000000001"
const SUMIDA = "50000000-0000-4000-8000-000000000002"
const GRUPO = "60000000-0000-4000-8000-000000000001"
const BASE = "http://localhost:3000/api/app/voce"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const context = (id: string) => ({ params: Promise.resolve({ id }) })

const CONTAGENS: Record<string, number> = {
  listing_saves: 2,
  listings: 3,
  recommendation_requests: 2,
  group_memberships: 1,
}

/**
 * O banco dos testes: uma tabela responde pelo que a rota pede — contagem,
 * lista, atualização ou remoção. `erro` derruba a tabela escolhida para provar
 * que falha de banco vira 503, nunca lista vazia.
 */
function cliente(opcoes: { erro?: string; semPerfil?: boolean; semLinhas?: boolean } = {}) {
  const escritas: { tabela: string; metodo: string; valor: unknown }[] = []
  const chamadasRpc: string[] = []

  const from = vi.fn((tabela: string) => {
    let contagem = false
    let atualizacao: Record<string, unknown> | null = null
    let apagando = false

    const resolver = () => {
      if (opcoes.erro === tabela) {
        return { data: null, count: null, error: { code: "XX000", message: "segredo do banco" } }
      }
      if (contagem) return { data: null, count: CONTAGENS[tabela] ?? 0, error: null }
      if (apagando) return { data: opcoes.semLinhas ? [] : [{ id: "x" }], error: null }
      if (tabela === "profiles") {
        if (opcoes.semPerfil) return { data: null, error: null }
        if (atualizacao !== null) {
          return {
            data: {
              display_name: (atualizacao["display_name"] as string | undefined) ?? "Ana Verificada",
              bio: (atualizacao["bio"] as string | null | undefined) ?? null,
            },
            error: null,
          }
        }
        return {
          data: opcoes.semPerfil ? null : { display_name: "Ana Verificada", bio: null },
          error: null,
        }
      }
      if (tabela === "locality_memberships") {
        return {
          data: { locality_id: "l1", localities: { city_name: "Manaus" } },
          error: null,
        }
      }
      if (tabela === "dm_blocks") {
        return {
          data: [{ blocked_user_id: OUTRO, created_at: "2026-11-03T12:00:00Z" }],
          error: null,
        }
      }
      if (tabela === "hidden_questions") {
        return {
          data: [
            { request_id: PERGUNTA, hidden_at: "2026-11-02T08:00:00Z" },
            { request_id: SUMIDA, hidden_at: "2026-11-01T08:00:00Z" },
          ],
          error: null,
        }
      }
      if (tabela === "posts") {
        return {
          data: [
            {
              id: "p1",
              content: "A padaria abriu",
              group_id: GRUPO,
              created_at: "2026-11-01T12:00:00Z",
            },
          ],
          error: null,
        }
      }
      if (tabela === "groups") return { data: [{ id: GRUPO, name: "Vila Ajuricaba" }], error: null }
      if (tabela === "recommendation_requests") {
        return {
          data: [
            {
              id: PERGUNTA,
              title: "Alguém indica pediatra?",
              is_resolved: false,
              created_at: "2026-10-30T10:00:00Z",
            },
          ],
          error: null,
        }
      }
      if (tabela === "recommendation_replies") {
        return { data: [{ request_id: PERGUNTA }], error: null }
      }
      return { data: null, error: null }
    }

    const q: Record<string, unknown> = {}
    q["select"] = (_colunas?: string, opcoesDoSelect?: { count?: string }) => {
      if (opcoesDoSelect?.count === "exact") contagem = true
      return q
    }
    for (const metodo of ["eq", "order", "limit", "in"]) q[metodo] = () => q
    q["update"] = (valor: Record<string, unknown>) => {
      atualizacao = valor
      escritas.push({ tabela, metodo: "update", valor })
      return q
    }
    q["delete"] = () => {
      apagando = true
      escritas.push({ tabela, metodo: "delete", valor: null })
      return q
    }
    q["maybeSingle"] = async () => resolver()
    q["single"] = async () => resolver()
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder aguardável do PostgREST
    Object.defineProperty(q, "then", {
      value: (resolve: (valor: unknown) => unknown) => Promise.resolve(resolve(resolver())),
    })
    return q
  })

  const rpc = vi.fn(async (nome: string) => {
    chamadasRpc.push(nome)
    if (opcoes.erro === "rpc")
      return { data: null, error: { code: "XX000", message: "segredo do banco" } }
    if (nome === "request_account_deletion") {
      return {
        data: { requested_at: "2026-11-06T12:00:00Z", due_at: "2026-12-06T12:00:00Z" },
        error: null,
      }
    }
    return { data: false, error: null }
  })

  return { client: { from, rpc } as never, escritas, chamadasRpc }
}

function autenticar(opcoes: Parameters<typeof cliente>[0] = {}) {
  const mock = cliente(opcoes)
  vi.mocked(resolverSessaoDaRequisicao).mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
  return mock
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

const ROTAS = [
  ["perfil", () => perfil(req("GET"))],
  ["edição", () => editar(req("PATCH", "", '{"nome":"Ana"}'))],
  ["publicações", () => publicacoes(req("GET", "/publicacoes"))],
  ["bloqueados", () => bloqueados(req("GET", "/bloqueados"))],
  ["desbloqueio", () => desbloquear(req("DELETE", `/bloqueados/${OUTRO}`), context(OUTRO))],
  ["ocultados", () => ocultados(req("GET", "/ocultados"))],
  ["desocultar", () => desocultar(req("DELETE", `/ocultados/${PERGUNTA}`), context(PERGUNTA))],
  ["exclusão", () => apagar(req("POST", "/apagar-conta"))],
] as const

describe("área Você do app", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolverSessaoDaRequisicao).mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it.each(ROTAS)("%s exige sessão", async (_, chamar) => {
    expect((await chamar()).status).toBe(401)
  })

  it("lê o perfil, as contagens e o estado da conta", async () => {
    autenticar()
    const resposta = await perfil(req("GET"))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      perfil: { nome: "Ana Verificada", bio: null, cidade: "Manaus" },
      contagens: { salvos: 2, anuncios: 3, perguntas: 2, grupos: 1 },
      conta: { exclusaoPendente: false },
    })
  })

  it("sessão sem perfil é 404, não perfil vazio", async () => {
    autenticar({ semPerfil: true })
    expect((await perfil(req("GET"))).status).toBe(404)
  })

  it("grava nome e apresentação e devolve o estado gravado", async () => {
    const mock = autenticar()
    const resposta = await editar(
      req("PATCH", "", JSON.stringify({ nome: "  Ana   Editada ", bio: "", user_id: OUTRO })),
    )
    expect(resposta.status).toBe(200)
    // O dono vem da sessão: `user_id` no corpo não entra na escrita.
    expect(mock.escritas).toEqual([
      { tabela: "profiles", metodo: "update", valor: { display_name: "Ana Editada", bio: null } },
    ])
    expect(await resposta.json()).toMatchObject({
      perfil: { nome: "Ana Editada", bio: null, cidade: "Manaus" },
    })
  })

  it.each(["{}", "[]", '{"nome":"a"}', '{"bio":5}'])("recusa corpo inválido %s", async (body) => {
    autenticar()
    expect((await editar(req("PATCH", "", body))).status).toBe(400)
  })

  it("recusa apresentação acima do teto ou com CPF", async () => {
    autenticar()
    const longa = JSON.stringify({ bio: "x".repeat(301) })
    expect((await editar(req("PATCH", "", longa))).status).toBe(400)
    const cpf = JSON.stringify({ bio: "meu cpf 123.456.789-09" })
    expect((await editar(req("PATCH", "", cpf))).status).toBe(400)
  })

  it.each([headers.origin, "https://fora.example"])("recusa porta incorreta %s", async (origem) => {
    autenticar()
    const cabecalhos =
      origem === headers.origin
        ? { ...headers, "x-bivaque-app": "errado" }
        : { ...headers, origin: origem }
    expect((await editar(req("PATCH", "", '{"nome":"Ana"}', cabecalhos))).status).toBe(403)
    expect(
      (
        await desbloquear(
          req("DELETE", `/bloqueados/${OUTRO}`, undefined, cabecalhos),
          context(OUTRO),
        )
      ).status,
    ).toBe(403)
    expect((await apagar(req("POST", "/apagar-conta", undefined, cabecalhos))).status).toBe(403)
  })

  it("edição de perfil ausente é 404", async () => {
    autenticar({ semPerfil: true })
    expect((await editar(req("PATCH", "", '{"nome":"Ana"}'))).status).toBe(404)
  })

  it("lista publicações e perguntas com grupo e respostas", async () => {
    autenticar()
    const resposta = await publicacoes(req("GET", "/publicacoes"))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      publicacoes: [
        {
          id: "p1",
          texto: "A padaria abriu",
          criadaEm: "2026-11-01T12:00:00Z",
          grupo: "Vila Ajuricaba",
        },
      ],
      perguntas: [
        {
          id: PERGUNTA,
          titulo: "Alguém indica pediatra?",
          criadaEm: "2026-10-30T10:00:00Z",
          resolvida: false,
          respostas: 1,
        },
      ],
    })
  })

  it("lista bloqueados com nome nulo quando a RLS não devolve o perfil", async () => {
    autenticar({ semPerfil: true })
    const resposta = await bloqueados(req("GET", "/bloqueados"))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      bloqueados: [{ id: OUTRO, nome: null, bloqueadoEm: "2026-11-03T12:00:00Z" }],
    })
  })

  it("desfaz o bloqueio da própria lista", async () => {
    const mock = autenticar()
    const resposta = await desbloquear(req("DELETE", `/bloqueados/${OUTRO}`), context(OUTRO))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ removido: true })
    expect(mock.escritas).toEqual([{ tabela: "dm_blocks", metodo: "delete", valor: null }])
  })

  it.each([OUTRO, "nao-e-uuid"])("bloqueio inexistente é 404 (%s)", async (id) => {
    autenticar({ semLinhas: true })
    expect((await desbloquear(req("DELETE", `/bloqueados/${id}`), context(id))).status).toBe(404)
  })

  it("lista só o que ainda é legível entre os ocultados", async () => {
    autenticar()
    const resposta = await ocultados(req("GET", "/ocultados"))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      ocultados: [
        { id: PERGUNTA, titulo: "Alguém indica pediatra?", ocultadoEm: "2026-11-02T08:00:00Z" },
      ],
    })
  })

  it.each([
    ["ocultados", () => ocultados(req("GET", "/ocultados")), "hidden_questions"],
    ["bloqueados", () => bloqueados(req("GET", "/bloqueados")), "dm_blocks"],
    ["publicações", () => publicacoes(req("GET", "/publicacoes")), "recommendation_requests"],
    ["perfil", () => perfil(req("GET")), "listing_saves"],
    ["edição", () => editar(req("PATCH", "", '{"nome":"Ana"}')), "profiles"],
    [
      "desbloqueio",
      () => desbloquear(req("DELETE", `/bloqueados/${OUTRO}`), context(OUTRO)),
      "dm_blocks",
    ],
    [
      "desocultar",
      () => desocultar(req("DELETE", `/ocultados/${PERGUNTA}`), context(PERGUNTA)),
      "hidden_questions",
    ],
    ["exclusão", () => apagar(req("POST", "/apagar-conta")), "rpc"],
  ] as const)("%s informa falha do banco sem ecoar detalhes", async (_, chamar, tabela) => {
    autenticar({ erro: tabela })
    const resposta = await chamar()
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo do banco")
  })

  it("desfaz a ocultação da própria linha", async () => {
    const mock = autenticar()
    const resposta = await desocultar(req("DELETE", `/ocultados/${PERGUNTA}`), context(PERGUNTA))
    expect(resposta.status).toBe(200)
    expect(mock.escritas).toEqual([{ tabela: "hidden_questions", metodo: "delete", valor: null }])
  })

  it("ocultação inexistente é 404", async () => {
    autenticar({ semLinhas: true })
    expect(
      (await desocultar(req("DELETE", `/ocultados/${PERGUNTA}`), context(PERGUNTA))).status,
    ).toBe(404)
  })

  it("registra o pedido de exclusão e devolve o prazo do banco", async () => {
    const mock = autenticar()
    const resposta = await apagar(req("POST", "/apagar-conta"))
    expect(resposta.status).toBe(200)
    expect(mock.chamadasRpc).toContain("request_account_deletion")
    expect(await resposta.json()).toEqual({
      pedido: { solicitadoEm: "2026-11-06T12:00:00Z", prazoEm: "2026-12-06T12:00:00Z" },
      pendente: true,
    })
  })
})
