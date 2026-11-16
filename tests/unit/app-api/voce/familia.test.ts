import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

// SEC-011: a janela do Upstash é a primeira barreira do envio e falha FECHADA —
// sem ela a rota responde 503. Aqui ela é simulada; os testes de recusa provam
// que a 429 vem antes de o banco ser tocado.
const janela = vi.hoisted(() => ({ recusando: false }))

vi.mock("web/lib/limits", () => ({
  createLimiterStore: () => ({ record: async () => (janela.recusando ? 11 : 1) }),
}))

import { DELETE as revogar } from "web/app/api/app/voce/familia/[id]/route"
import { POST as convidar, GET as familia } from "web/app/api/app/voce/familia/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { createServerClient } from "web/lib/supabase/server"

const USER = "20000000-0000-4000-8000-000000000001"
const OUTRO = "30000000-0000-4000-8000-00000000001a"
const CONVITE = "70000000-0000-4000-8000-000000000001"
const NOVO = "70000000-0000-4000-8000-000000000002"
const BASE = "http://localhost:3000/api/app/voce/familia"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const context = (id: string) => ({ params: Promise.resolve({ id }) })

type Linha = {
  id: string
  invitee_email_hint: string | null
  created_at: string
  expires_at: string
}

/**
 * Dois bancos, de propósito: o cliente da SESSÃO (JWT do usuário) é quem chama
 * as funções de posse derivada — criar e revogar —, e o cliente de SERVIÇO só
 * lê as pendências e enfileira o e-mail. Os dois são espiões separados para que
 * a prova seja de qual cliente fez o quê, não de "alguém chamou".
 *
 * `erro` derruba a chamada escolhida para provar que falha de banco vira 503
 * sem ecoar a mensagem do Postgres.
 */
function banco(
  opcoes: {
    verificado?: boolean
    pendentes?: Linha[]
    erro?: "is_verified_holder" | "list_pending_invites_with_hint" | "create" | "revoke"
    mensagem?: string
    outboxFalha?: boolean
  } = {},
) {
  const daSessao: { nome: string; args: Record<string, unknown> }[] = []
  const doServico: string[] = []
  const enfileirados: Record<string, unknown>[] = []
  const linhas: Linha[] = [...(opcoes.pendentes ?? [])]

  const rpcDaSessao = vi.fn(async (nome: string, args: Record<string, unknown> = {}) => {
    daSessao.push({ nome, args })
    if (nome === "create_family_invitation") {
      if (opcoes.erro === "create") {
        return { data: null, error: { code: "P0001", message: opcoes.mensagem ?? "segredo" } }
      }
      linhas.push({
        id: NOVO,
        invitee_email_hint: (args["p_invitee_email_hint"] as string | undefined) ?? null,
        created_at: "2026-11-06T12:00:00Z",
        expires_at: "2026-11-13T12:00:00Z",
      })
      return { data: NOVO, error: null }
    }
    if (nome === "revoke_family_invitation") {
      if (opcoes.erro === "revoke") {
        return { data: null, error: { code: "P0001", message: opcoes.mensagem ?? "segredo" } }
      }
      return { data: null, error: null }
    }
    throw new Error(`rpc de sessão inesperado: ${nome}`)
  })

  const rpcDoServico = vi.fn(async (nome: string) => {
    doServico.push(nome)
    if (nome === "is_verified_holder") {
      if (opcoes.erro === nome) return { data: null, error: { code: "XX000", message: "segredo" } }
      return { data: opcoes.verificado ?? true, error: null }
    }
    if (nome === "list_pending_invites_with_hint") {
      if (opcoes.erro === nome) return { data: null, error: { code: "XX000", message: "segredo" } }
      return { data: linhas, error: null }
    }
    throw new Error(`rpc de serviço inesperado: ${nome}`)
  })

  const from = vi.fn((tabela: string) => {
    if (tabela !== "outbox") throw new Error(`tabela inesperada: ${tabela}`)
    return {
      insert: vi.fn(async (valor: Record<string, unknown>) => {
        enfileirados.push(valor)
        return opcoes.outboxFalha
          ? { error: { code: "XX000", message: "segredo do banco" } }
          : { error: null }
      }),
    }
  })

  return {
    client: { rpc: rpcDaSessao, from } as never,
    servico: { rpc: rpcDoServico, from } as never,
    daSessao,
    doServico,
    enfileirados,
  }
}

function autenticar(opcoes: Parameters<typeof banco>[0] = {}) {
  const mock = banco(opcoes)
  vi.mocked(createServerClient).mockReturnValue(mock.servico)
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

const PENDENTE: Linha = {
  id: CONVITE,
  invitee_email_hint: "jo***@gm***.com",
  created_at: "2026-11-01T10:00:00Z",
  expires_at: "2026-11-08T10:00:00Z",
}

describe("família do titular no app", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.invalid")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token-de-teste")
    janela.recusando = false
    vi.mocked(resolverSessaoDaRequisicao).mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it.each([
    ["leitura", () => familia(req("GET"))],
    ["envio", () => convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))],
    ["revogação", () => revogar(req("DELETE", `/${CONVITE}`), context(CONVITE))],
  ] as const)("%s exige sessão", async (_, chamar) => {
    expect((await chamar()).status).toBe(401)
  })

  it.each([
    [
      "envio",
      (cabecalhos: Record<string, string>) =>
        convidar(req("POST", "", '{"email":"familiar@example.invalid"}', cabecalhos)),
    ],
    [
      "revogação",
      (cabecalhos: Record<string, string>) =>
        revogar(req("DELETE", `/${CONVITE}`, undefined, cabecalhos), context(CONVITE)),
    ],
  ] as const)("%s recusa porta incorreta", async (_, chamar) => {
    autenticar()
    expect((await chamar({ ...headers, "x-bivaque-app": "errado" })).status).toBe(403)
    expect((await chamar({ ...headers, origin: "https://fora.example" })).status).toBe(403)
  })

  it("lê os pendentes com o e-mail mascarado e a permissão de convidar", async () => {
    autenticar({ pendentes: [PENDENTE] })
    const resposta = await familia(req("GET"))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      familia: {
        podeConvidar: true,
        pendentes: [
          {
            id: CONVITE,
            emailMascarado: "jo***@gm***.com",
            criadoEm: "2026-11-01T10:00:00Z",
            expiraEm: "2026-11-08T10:00:00Z",
          },
        ],
      },
    })
  })

  it("não titular lê a lista e recebe podeConvidar falso", async () => {
    autenticar({ verificado: false, pendentes: [] })
    const resposta = await familia(req("GET"))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      familia: { podeConvidar: false, pendentes: [] },
    })
  })

  it("envia pelo cliente da SESSÃO e devolve só o convite gravado", async () => {
    const mock = autenticar()
    const resposta = await convidar(
      req("POST", "", `{"email":"  Joao.Silva@gmail.com ","user_id":"${OUTRO}"}`),
    )
    expect(resposta.status).toBe(201)
    const corpo = (await resposta.json()) as { convite: Record<string, unknown> }
    expect(corpo.convite).toEqual({
      id: NOVO,
      emailMascarado: "jo***@gm***.com",
      criadoEm: "2026-11-06T12:00:00Z",
      expiraEm: "2026-11-13T12:00:00Z",
    })
    // Nada de token, hash ou e-mail completo na resposta.
    const texto = JSON.stringify(corpo)
    expect(texto).not.toContain("token")
    expect(texto).not.toContain("codigo")
    expect(texto).not.toContain("joao.silva@gmail.com")
    // A criação foi feita pelo cliente da sessão, e o corpo da chamada NÃO leva
    // id de titular: o dono é derivado de auth.uid() dentro da função.
    const criacao = mock.daSessao.find((chamada) => chamada.nome === "create_family_invitation")
    expect(criacao).toBeDefined()
    expect(Object.keys(criacao?.args ?? {})).not.toContain("p_inviter_user_id")
    expect(criacao?.args["p_invitee_email_hint"]).toBe("jo***@gm***.com")
    // O cliente de serviço só leu a lista e enfileirou: nenhuma escrita de posse.
    expect(mock.doServico).toEqual(["is_verified_holder", "list_pending_invites_with_hint"])
    expect(mock.enfileirados).toHaveLength(1)
    expect(mock.enfileirados[0]).toMatchObject({
      recipient: "joao.silva@gmail.com",
      type: "family_invite",
    })
  })

  it.each(["{}", '{"email":5}', '{"email":"sem-arroba"}', "[]"])(
    "recusa corpo inválido %s",
    async (body) => {
      autenticar()
      expect((await convidar(req("POST", "", body))).status).toBe(400)
    },
  )

  it("recusa quem não é titular verificado, pela guarda do banco", async () => {
    autenticar({ erro: "create", mensagem: "only verified holders can create invitations" })
    const resposta = await convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toMatchObject({ erro: "nao-titular" })
  })

  it("teto de convites ativos é conflito, não erro de banco", async () => {
    autenticar({ erro: "create", mensagem: "maximum 5 active invitations per holder" })
    const resposta = await convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toMatchObject({ erro: "teto-de-convites" })
  })

  it("teto de envios do banco é 429 e não enfileira", async () => {
    const mock = autenticar({
      erro: "create",
      mensagem: "maximum 10 invitations per holder per hour",
    })
    const resposta = await convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))
    expect(resposta.status).toBe(429)
    expect(await resposta.json()).toMatchObject({ erro: "limite" })
    expect(mock.enfileirados).toHaveLength(0)
  })

  it("sem o limitador configurado a rota responde 503 (fail-closed)", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")
    const mock = autenticar()
    const resposta = await convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "limite-indisponivel" })
    // Nem o banco nem o outbox foram tocados.
    expect(mock.daSessao).toHaveLength(0)
    expect(mock.enfileirados).toHaveLength(0)
  })

  it("janela atômica cheia é 429 antes de criar", async () => {
    janela.recusando = true
    const mock = autenticar()
    const resposta = await convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))
    expect(resposta.status).toBe(429)
    expect(await resposta.json()).toMatchObject({ erro: "limite" })
    expect(mock.daSessao).toHaveLength(0)
    expect(mock.enfileirados).toHaveLength(0)
  })

  it.each([
    ["leitura", () => familia(req("GET"))],
    ["envio", () => convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))],
  ] as const)("%s informa falha do banco sem ecoar detalhes", async (_, chamar) => {
    autenticar({ erro: "list_pending_invites_with_hint" })
    const resposta = await chamar()
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })

  it("falha ao criar não ecoa a mensagem do Postgres", async () => {
    autenticar({ erro: "create", mensagem: "segredo do banco" })
    const resposta = await convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))
    expect(resposta.status).toBe(503)
    const texto = await resposta.text()
    expect(texto).not.toContain("segredo")
    expect(texto).not.toContain("P0001")
  })

  it("falha ao enfileirar o convite não vira convite criado", async () => {
    autenticar({ outboxFalha: true })
    const resposta = await convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })

  it("revoga o próprio convite pendente pelo cliente da sessão", async () => {
    const mock = autenticar({ pendentes: [PENDENTE] })
    const resposta = await revogar(req("DELETE", `/${CONVITE}`), context(CONVITE))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ removido: true })
    // Só o id do convite viaja: o titular é derivado de auth.uid().
    expect(mock.daSessao).toEqual([
      { nome: "revoke_family_invitation", args: { p_invitation_id: CONVITE } },
    ])
    // A rota de revogação não abre privilégio nenhum.
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it("convite de outro titular é 404", async () => {
    autenticar({ erro: "revoke", mensagem: "invitation not found or not revocable" })
    const resposta = await revogar(req("DELETE", `/${CONVITE}`), context(CONVITE))
    expect(resposta.status).toBe(404)
    expect(await resposta.json()).toMatchObject({ erro: "nao-encontrado" })
  })

  it("id que não é uuid é 404 sem chamar o banco", async () => {
    const mock = autenticar()
    expect((await revogar(req("DELETE", "/nao-e-uuid"), context("nao-e-uuid"))).status).toBe(404)
    expect(mock.daSessao).toHaveLength(0)
  })

  it("revogação com banco fora é 503 sem eco", async () => {
    autenticar({ erro: "revoke", mensagem: "segredo" })
    const resposta = await revogar(req("DELETE", `/${CONVITE}`), context(CONVITE))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })
})
