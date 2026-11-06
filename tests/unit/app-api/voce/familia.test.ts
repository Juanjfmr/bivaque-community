import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

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
 * O banco dos testes: responde só as quatro funções de família e o outbox.
 * `erro` derruba a função escolhida para provar que falha de banco vira 503
 * sem ecoar a mensagem do Postgres.
 */
function banco(
  opcoes: {
    verificado?: boolean
    pendentes?: Linha[]
    enviadosRecentes?: number
    erro?: "is_verified_holder" | "list_pending_invites_with_hint" | "create" | "revoke"
    mensagem?: string
    outboxFalha?: boolean
  } = {},
) {
  const chamadas: { nome: string; args: Record<string, unknown> }[] = []
  const enfileirados: Record<string, unknown>[] = []
  const linhas: Linha[] = [...(opcoes.pendentes ?? [])]

  type Consulta = {
    eq: () => Consulta
    contains: () => Consulta
    gte: () => Promise<{ count: number; error: null }>
  }
  // O limite de ritmo do módulo conta as linhas de `family_invite` no outbox.
  const consulta: Consulta = {
    eq: () => consulta,
    contains: () => consulta,
    gte: async () => ({ count: opcoes.enviadosRecentes ?? 0, error: null }),
  }

  const rpc = vi.fn(async (nome: string, args: Record<string, unknown> = {}) => {
    chamadas.push({ nome, args })
    if (nome === "is_verified_holder") {
      if (opcoes.erro === nome) return { data: null, error: { code: "XX000", message: "segredo" } }
      return { data: opcoes.verificado ?? true, error: null }
    }
    if (nome === "list_pending_invites_with_hint") {
      if (opcoes.erro === nome) return { data: null, error: { code: "XX000", message: "segredo" } }
      return { data: linhas, error: null }
    }
    if (nome === "create_family_invitation") {
      if (opcoes.erro === "create") {
        return { data: null, error: { code: "XX000", message: opcoes.mensagem ?? "segredo" } }
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
        return { data: null, error: { code: "XX000", message: opcoes.mensagem ?? "segredo" } }
      }
      return { data: null, error: null }
    }
    throw new Error(`rpc inesperado: ${nome}`)
  })

  const from = vi.fn((tabela: string) => {
    if (tabela !== "outbox") throw new Error(`tabela inesperada: ${tabela}`)
    return {
      select: vi.fn(() => consulta),
      insert: vi.fn(async (valor: Record<string, unknown>) => {
        enfileirados.push(valor)
        return opcoes.outboxFalha
          ? { error: { code: "XX000", message: "segredo do banco" } }
          : { error: null }
      }),
    }
  })

  return { client: { rpc, from } as never, chamadas, enfileirados }
}

function autenticar(opcoes: Parameters<typeof banco>[0] = {}) {
  const mock = banco(opcoes)
  vi.mocked(createServerClient).mockReturnValue(mock.client)
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
    vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
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

  it("envia pelo módulo compartilhado e devolve o convite gravado", async () => {
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
    // O dono é a sessão, mesmo com `user_id` no corpo.
    const criacao = mock.chamadas.find((chamada) => chamada.nome === "create_family_invitation")
    expect(criacao?.args["p_inviter_user_id"]).toBe(USER)
    expect(criacao?.args["p_invitee_email_hint"]).toBe("jo***@gm***.com")
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

  it("recusa quem não é titular verificado", async () => {
    autenticar({ verificado: false })
    const resposta = await convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toMatchObject({ erro: "nao-titular" })
  })

  it("teto de convites é conflito, não erro de banco", async () => {
    autenticar({ erro: "create", mensagem: "maximum 5 pending invitations per holder" })
    const resposta = await convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toMatchObject({ erro: "teto-de-convites" })
  })

  it("décimo primeiro envio na hora é 429 de limite", async () => {
    const mock = autenticar({ enviadosRecentes: 10 })
    const resposta = await convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))
    expect(resposta.status).toBe(429)
    expect(await resposta.json()).toMatchObject({ erro: "limite" })
    // Recusa antes de criar: nada foi gravado nem enfileirado.
    expect(mock.chamadas.some((chamada) => chamada.nome === "create_family_invitation")).toBe(false)
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

  it("falha ao enfileirar o convite não vira convite criado", async () => {
    autenticar({ outboxFalha: true })
    const resposta = await convidar(req("POST", "", '{"email":"familiar@example.invalid"}'))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })

  it("revoga o próprio convite pendente", async () => {
    const mock = autenticar({ pendentes: [PENDENTE] })
    const resposta = await revogar(req("DELETE", `/${CONVITE}`), context(CONVITE))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ removido: true })
    const revogacao = mock.chamadas.find((chamada) => chamada.nome === "revoke_family_invitation")
    expect(revogacao?.args).toEqual({ p_invitation_id: CONVITE, p_inviter_user_id: USER })
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
    expect(mock.chamadas).toHaveLength(0)
  })

  it("revogação com banco fora é 503 sem eco", async () => {
    autenticar({ erro: "revoke" })
    const resposta = await revogar(req("DELETE", `/${CONVITE}`), context(CONVITE))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })
})
