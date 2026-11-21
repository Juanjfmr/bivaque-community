import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import {
  GET as atendimento,
  PATCH as salvarAtendimento,
} from "web/app/api/app/prestador/atendimento/route"
import { GET as conta, PATCH as salvarConta } from "web/app/api/app/prestador/conta/route"
import { GET as mensagens, POST as responder } from "web/app/api/app/pedidos/[id]/mensagens/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app"
const FICHA = "10000000-0000-4000-8000-000000000001"
const USER = "10000000-0000-4000-8000-000000000010"
const PEDIDO = "10000000-0000-4000-8000-0000000000b1"
const CONVERSA = "10000000-0000-4000-8000-0000000000b3"
const COMUNIDADE = "10000000-0000-4000-8000-0000000000c1"
const CIDADE = "10000000-0000-4000-8000-0000000000d1"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

type Opcoes = {
  semFicha?: boolean
  semPedido?: boolean
  semContaDePrestador?: boolean
  erroDeTabela?: string
  erroRpc?: { nome: string; code: string }
  recusaDaResposta?: string
}

function pedidoDoBanco(situacao: string) {
  return {
    id: PEDIDO,
    provider_id: FICHA,
    requester_user_id: USER,
    provider_user_id: USER,
    category: "assistencia_tecnica",
    description: "Limpar o ar-condicionado",
    when_text: "Nesta semana",
    status: situacao,
    region: "Centro",
    created_at: "2026-11-05T12:00:00Z",
    updated_at: "2026-11-05T12:00:00Z",
    conversation_id: CONVERSA,
    provider_profiles: { display_name: "Climatiza Manaus" },
  }
}

function cliente(opcoes: Opcoes = {}) {
  const gravacoes: { tabela: string; metodo: string; valores?: unknown }[] = []
  const filtros: { tabela: string; coluna: string; valor: unknown }[] = []
  let situacao = "open"
  const mensagensDoBanco = [
    {
      id: "10000000-0000-4000-8000-0000000000e1",
      sender_id: USER,
      content: "Resposta do prestador",
      created_at: "2026-11-05T12:10:00Z",
    },
    {
      id: "10000000-0000-4000-8000-0000000000e2",
      sender_id: "10000000-0000-4000-8000-000000000011",
      content: "Pedido do membro",
      created_at: "2026-11-05T12:00:00Z",
    },
  ]

  const resposta = (tabela: string, unico: boolean) => {
    if (opcoes.erroDeTabela === tabela) {
      return { data: null, error: { code: "XX000", message: "segredo do Postgres" } }
    }
    if (tabela === "provider_profiles")
      return {
        data: unico
          ? opcoes.semFicha === true
            ? null
            : { id: FICHA, contact_is_public: true }
          : [{ id: FICHA }],
        error: null,
        count: null,
      }
    if (tabela === "provider_accounts")
      return {
        data:
          opcoes.semContaDePrestador === true
            ? null
            : { community_id: COMUNIDADE, locality_id: CIDADE },
        error: null,
        count: null,
      }
    if (tabela === "provider_reach") return { data: { active: true }, error: null, count: null }
    if (tabela === "communities") return { data: { name: "Comunidade Manaus" }, error: null }
    if (tabela === "localities")
      return { data: { city_name: "Manaus", state_code: "AM" }, error: null }
    if (tabela === "service_requests")
      return {
        data: opcoes.semPedido === true ? null : pedidoDoBanco(situacao),
        error: null,
        count: null,
      }
    if (tabela === "dm_messages") return { data: mensagensDoBanco, error: null, count: null }
    throw new Error(`Tabela inesperada: ${tabela}`)
  }

  const rpc = vi.fn(async (nome: string) => {
    if (opcoes.erroRpc?.nome === nome) {
      return { data: null, error: { code: opcoes.erroRpc.code, message: "segredo do banco" } }
    }
    if (nome === "get_provider_contact_phone") return { data: "92999990000", error: null }
    if (nome === "service_request_distance") return { data: null, error: null }
    if (nome === "send_conversation_message") {
      if (opcoes.recusaDaResposta) {
        return { data: null, error: { code: opcoes.recusaDaResposta, message: "segredo" } }
      }
      situacao = "in_conversation"
      return { data: { id: "10000000-0000-4000-8000-0000000000e3" }, error: null }
    }
    if (nome === "close_service_request") {
      situacao = "closed"
      return { data: null, error: null }
    }
    return { data: null, error: null }
  })

  const from = vi.fn((tabela: string) => {
    const consulta: Record<string, unknown> = {}
    for (const metodo of ["select", "order", "limit", "is", "or", "in", "range", "gte"]) {
      consulta[metodo] = () => consulta
    }
    consulta["eq"] = (coluna: string, valor: unknown) => {
      filtros.push({ tabela, coluna, valor })
      return consulta
    }
    consulta["insert"] = (valores: unknown) => {
      gravacoes.push({ tabela, metodo: "insert", valores })
      return consulta
    }
    consulta["update"] = (valores: unknown) => {
      gravacoes.push({ tabela, metodo: "update", valores })
      return consulta
    }
    consulta["upsert"] = (valores: unknown) => {
      gravacoes.push({ tabela, metodo: "upsert", valores })
      return consulta
    }
    consulta["maybeSingle"] = async () => resposta(tabela, true)
    consulta["single"] = async () => resposta(tabela, true)
    // biome-ignore lint/suspicious/noThenProperty: o builder PostgREST é awaitable
    Object.defineProperty(consulta, "then", {
      value: (resolver: (valor: unknown) => unknown) =>
        Promise.resolve(resolver(resposta(tabela, false))),
    })
    return consulta
  })

  return { client: { from, rpc } as never, from, rpc, gravacoes, filtros }
}

function autenticar(mock: ReturnType<typeof cliente>) {
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "prestador@example.invalid", appMetadata: {} },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}

function req(caminho: string, metodo = "GET", body?: BodyInit, cabecalhos = headers) {
  return new NextRequest(`${BASE}/${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    ...(body === undefined ? {} : { body }),
  })
}

const rotas = [
  ["conta lida", () => conta(req("prestador/conta"))],
  [
    "conta salva",
    () => salvarConta(req("prestador/conta", "PATCH", '{"telefone":null,"telefonePublico":false}')),
  ],
  ["atendimento lido", () => atendimento(req("prestador/atendimento"))],
  [
    "atendimento salvo",
    () => salvarAtendimento(req("prestador/atendimento", "PATCH", '{"ativo":true}')),
  ],
  ["conversa lida", () => mensagens(req("pedidos/x/mensagens"), contexto(PEDIDO))],
  [
    "resposta enviada",
    () => responder(req("pedidos/x/mensagens", "POST", '{"conteudo":"Olá"}'), contexto(PEDIDO)),
  ],
] as const

beforeEach(() => {
  vi.clearAllMocks()
})

describe("TROCA-005 — a área do prestador exige sessão", () => {
  beforeEach(() => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it.each(rotas)("%s sem sessão é 401", async (_nome, chamar) => {
    expect((await chamar()).status).toBe(401)
  })

  it("sessão indisponível é 503, não 500", async () => {
    resolver.mockResolvedValue({ estado: "indisponivel" } as never)
    expect((await conta(req("prestador/conta"))).status).toBe(503)
  })
})

describe("TROCA-005 — escrita do prestador pela porta", () => {
  it.each([
    { ...headers, origin: "https://fora.example.invalid" },
    { ...headers, "x-bivaque-app": "errado" },
    { "content-type": "application/json", origin: headers.origin },
  ])("recusa escrita sem a porta correta antes do banco", async (cabecalhos) => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await salvarConta(
      req("prestador/conta", "PATCH", '{"telefone":null,"telefonePublico":false}', cabecalhos),
    )
    expect(resposta.status).toBe(403)
    expect(mock.from).not.toHaveBeenCalled()
  })
})

describe("TROCA-005 — conta do prestador", () => {
  it("lê o e-mail da sessão e o telefone da ficha", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await conta(req("prestador/conta"))
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).conta).toEqual({
      email: "prestador@example.invalid",
      temFicha: true,
      telefone: "92999990000",
      telefonePublico: true,
    })
    expect(mock.rpc).toHaveBeenCalledWith("get_provider_contact_phone", { p_provider_id: FICHA })
  })

  it("quem não tem ficha lê conta sem telefone, não erro", async () => {
    const mock = cliente({ semFicha: true })
    autenticar(mock)
    const resposta = await conta(req("prestador/conta"))
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).conta.temFicha).toBe(false)
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it.each([
    '{"telefone":"123","telefonePublico":true}',
    '{"telefone":"+55 92 99999-0000","telefonePublico":true}',
  ])("telefone fora do formato é 400 com frase (%s)", async (body) => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await salvarConta(req("prestador/conta", "PATCH", body))
    expect(resposta.status).toBe(400)
    expect((await resposta.json()).mensagem).toContain("números")
    expect(mock.gravacoes).toHaveLength(0)
  })

  it("grava pelo dono da sessão e devolve a conta relida", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await salvarConta(
      req("prestador/conta", "PATCH", '{"telefone":"92999990000","telefonePublico":true}'),
    )
    expect(resposta.status).toBe(200)
    expect(mock.gravacoes).toContainEqual({
      tabela: "provider_profiles",
      metodo: "update",
      valores: { contact_phone: "92999990000", contact_is_public: true },
    })
    expect(mock.filtros).toContainEqual({
      tabela: "provider_profiles",
      coluna: "owner_user_id",
      valor: USER,
    })
  })

  it("sem ficha, salvar conta é 404 e não cria ficha", async () => {
    const mock = cliente({ semFicha: true })
    autenticar(mock)
    const resposta = await salvarConta(
      req("prestador/conta", "PATCH", '{"telefone":"92999990000","telefonePublico":true}'),
    )
    expect(resposta.status).toBe(404)
    expect(mock.gravacoes).toHaveLength(0)
  })

  it("falha do banco é 503 sem eco", async () => {
    const mock = cliente({ erroDeTabela: "provider_profiles" })
    autenticar(mock)
    const resposta = await conta(req("prestador/conta"))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })
})

describe("TROCA-005 — área de atendimento", () => {
  it("lê alcance, comunidade e cidade da própria conta", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await atendimento(req("prestador/atendimento"))
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).atendimento).toEqual({
      temFicha: true,
      alcanceAtivo: true,
      comunidade: "Comunidade Manaus",
      cidade: "Manaus, AM",
    })
    expect(mock.filtros).toContainEqual({
      tabela: "provider_accounts",
      coluna: "auth_user_id",
      valor: USER,
    })
  })

  it("liga o alcance na comunidade da CONTA, não num id do corpo", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await salvarAtendimento(
      req("prestador/atendimento", "PATCH", `{"ativo":true,"community_id":"${USER}"}`),
    )
    expect(resposta.status).toBe(200)
    expect(mock.gravacoes).toContainEqual({
      tabela: "provider_reach",
      metodo: "upsert",
      valores: {
        provider_id: FICHA,
        scope_type: "community",
        scope_id: COMUNIDADE,
        source: "free",
        active: true,
      },
    })
  })

  it("conta de prestador sem comunidade é 403, sem gravar", async () => {
    const mock = cliente({ semContaDePrestador: true })
    autenticar(mock)
    const resposta = await salvarAtendimento(
      req("prestador/atendimento", "PATCH", '{"ativo":true}'),
    )
    expect(resposta.status).toBe(403)
    expect(mock.gravacoes).toHaveLength(0)
  })

  it("corpo sem booleano é 400", async () => {
    const mock = cliente()
    autenticar(mock)
    expect(
      (await salvarAtendimento(req("prestador/atendimento", "PATCH", '{"ativo":"sim"}'))).status,
    ).toBe(400)
    expect(mock.gravacoes).toHaveLength(0)
  })
})

describe("TROCA-005 — conversa do pedido", () => {
  it("lê a conversa do pedido e marca as mensagens da sessão", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await mensagens(req("pedidos/x/mensagens"), contexto(PEDIDO))
    expect(resposta.status).toBe(200)
    const dados = await resposta.json()
    expect(dados.pedido.id).toBe(PEDIDO)
    expect(dados.mensagens).toEqual([
      {
        id: "10000000-0000-4000-8000-0000000000e1",
        minha: true,
        conteudo: "Resposta do prestador",
        criadoEm: "2026-11-05T12:10:00Z",
      },
      {
        id: "10000000-0000-4000-8000-0000000000e2",
        minha: false,
        conteudo: "Pedido do membro",
        criadoEm: "2026-11-05T12:00:00Z",
      },
    ])
    expect(mock.filtros).toContainEqual({
      tabela: "dm_messages",
      coluna: "conversation_id",
      valor: CONVERSA,
    })
  })

  it.each(["pedido inexistente", "pedido de outra pessoa"])(
    "pedido alheio ou inexistente é 404 (%s)",
    async () => {
      const mock = cliente({ semPedido: true })
      autenticar(mock)
      const resposta = await mensagens(req("pedidos/x/mensagens"), contexto(PEDIDO))
      expect(resposta.status).toBe(404)
    },
  )

  it("responde usando a conversa do PEDIDO, não um id do corpo", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await responder(
      req(
        "pedidos/x/mensagens",
        "POST",
        JSON.stringify({ conteudo: "Olá", conversationId: "10000000-0000-4000-8000-0000000000ff" }),
      ),
      contexto(PEDIDO),
    )
    expect(resposta.status).toBe(200)
    expect(mock.rpc).toHaveBeenCalledWith("send_conversation_message", {
      p_conversation_id: CONVERSA,
      p_content: "Olá",
    })
    const dados = await resposta.json()
    expect(dados.pedido.situacao).toBe("in_conversation")
  })

  it.each([
    ['{"conteudo":"   "}', 400],
    [JSON.stringify({ conteudo: "a".repeat(2001) }), 400],
    ['{"conteudo":5}', 400],
  ])("recusa resposta inválida antes do banco (%s)", async (body, status) => {
    const mock = cliente()
    autenticar(mock)
    expect(
      (await responder(req("pedidos/x/mensagens", "POST", body), contexto(PEDIDO))).status,
    ).toBe(status)
    expect(mock.rpc).not.toHaveBeenCalledWith("send_conversation_message", expect.anything())
  })

  it("pedido de outra pessoa na resposta é 404 antes da RPC", async () => {
    const mock = cliente({ semPedido: true })
    autenticar(mock)
    const resposta = await responder(
      req("pedidos/x/mensagens", "POST", '{"conteudo":"Olá"}'),
      contexto(PEDIDO),
    )
    expect(resposta.status).toBe(404)
    expect(mock.rpc).not.toHaveBeenCalledWith("send_conversation_message", expect.anything())
  })

  it("recusa da RPC é 403 sem eco do Postgres", async () => {
    const mock = cliente({ recusaDaResposta: "42501" })
    autenticar(mock)
    const resposta = await responder(
      req("pedidos/x/mensagens", "POST", '{"conteudo":"Olá"}'),
      contexto(PEDIDO),
    )
    expect(resposta.status).toBe(403)
    expect(await resposta.text()).not.toContain("segredo")
  })

  it("id fora do formato é 404", async () => {
    autenticar(cliente())
    expect((await mensagens(req("pedidos/x/mensagens"), contexto("nao-e-uuid"))).status).toBe(404)
  })
})
