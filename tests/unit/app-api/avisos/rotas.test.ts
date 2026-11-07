import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as marcarLido } from "web/app/api/app/avisos/lidos/route"
import {
  GET as lerPreferencias,
  PATCH as salvarPreferencias,
} from "web/app/api/app/avisos/preferencias/route"
import { GET as listar } from "web/app/api/app/avisos/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app/avisos"
const AVISO = "50000000-0000-4000-8000-000000000001"
const USER = "20000000-0000-4000-8000-000000000001"
const OUTRA_PESSOA = "20000000-0000-4000-8000-000000000002"
const DATA = "2026-11-01T12:00:00.000Z"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}

const linha = {
  id: AVISO,
  type: "comment",
  action: "created",
  target_type: "post",
  target_id: "90000000-0000-4000-8000-000000000001",
  actor_user_id: OUTRA_PESSOA,
  read_at: null as string | null,
  created_at: DATA,
}

const preferenciaGravada = {
  comments: true,
  events: false,
  productNews: false,
  indications: true,
}

// A linha como o banco devolve: nomes de coluna.
const preferenciaLida = {
  comments: true,
  events: false,
  product_news: false,
  indications: true,
  city_digest_frequency: "weekly",
}

const canaisGravados = [
  { notification_type: "comments", channel: "in_app", enabled: true },
  { notification_type: "comments", channel: "email", enabled: false },
]

type Options = {
  avisos?: (typeof linha)[]
  naoLidos?: number
  atualizados?: { id: string }[]
  preferencia?: typeof preferenciaLida | null
  matriz?: { notification_type: string; channel: string; enabled: boolean }[]
  denuncias?: { id: string; target_type: string; target_id: string }[]
  errorTable?: string
  erroNaEscrita?: { code?: string; message: string }
}

type Chamada = {
  table: string
  op: "select" | "update" | "upsert"
  coluna?: string
  valor?: unknown
  corpo?: unknown
}

function mockClient(options: Options = {}) {
  const chamadas: Chamada[] = []

  const from = vi.fn((table: string) => {
    let operacao: Chamada["op"] = "select"
    let contar = false
    const resposta = () => {
      if (options.errorTable === table) {
        return { data: null, count: null, error: { code: "XX000", message: "boom" } }
      }
      if (options.erroNaEscrita !== undefined && operacao !== "select") {
        return { data: null, count: null, error: options.erroNaEscrita }
      }
      if (table === "notifications") {
        if (operacao === "select") {
          return contar
            ? { data: null, count: options.naoLidos ?? 0, error: null }
            : { data: options.avisos ?? [], count: null, error: null }
        }
        return { data: options.atualizados ?? [{ id: AVISO }], count: null, error: null }
      }
      if (table === "reports") {
        return { data: options.denuncias ?? null, count: null, error: null }
      }
      if (table === "notification_preferences") {
        if (operacao === "upsert") return { data: null, count: null, error: null }
        return { data: options.preferencia ?? null, count: null, error: null }
      }
      if (table === "notification_channel_preferences") {
        if (operacao === "upsert") return { data: null, count: null, error: null }
        return { data: options.matriz ?? [], count: null, error: null }
      }
      return { data: null, count: null, error: null }
    }

    const query: Record<string, unknown> = {}
    query["select"] = (_campos: string, args?: { count?: string; head?: boolean }) => {
      contar = args?.count === "exact" && args.head === true
      return query
    }
    query["eq"] = (coluna: string, valor: unknown) => {
      chamadas.push({ table, op: operacao, coluna, valor })
      return query
    }
    query["is"] = (coluna: string, valor: unknown) => {
      chamadas.push({ table, op: operacao, coluna, valor })
      return query
    }
    query["in"] = (coluna: string, valores: unknown[]) => {
      chamadas.push({ table, op: operacao, coluna, valor: valores })
      return query
    }
    query["order"] = () => query
    query["range"] = () => query
    query["limit"] = () => query
    query["update"] = (corpo: unknown) => {
      operacao = "update"
      chamadas.push({ table, op: "update", corpo })
      return query
    }
    query["upsert"] = (corpo: unknown) => {
      operacao = "upsert"
      chamadas.push({ table, op: "upsert", corpo })
      return query
    }
    query["maybeSingle"] = async () => resposta()
    query["single"] = async () => resposta()
    // O builder do PostgREST é awaitable; o stub reproduz esse contrato.
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder fluente do PostgREST
    Object.defineProperty(query, "then", {
      value: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(resposta())),
    })
    return query
  })

  return { client: { from } as never, from, chamadas }
}

function req(method: string, url = BASE, body?: string, requestHeaders = headers) {
  return new NextRequest(url, {
    method,
    headers: requestHeaders,
    ...(body === undefined ? {} : { body }),
  })
}

function autenticar(mock: ReturnType<typeof mockClient>) {
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "pessoa@example.invalid", appMetadata: {} },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

function filtroDe(chamadas: Chamada[], coluna: string, valor: unknown): boolean {
  return chamadas.some((chamada) => chamada.coluna === coluna && chamada.valor === valor)
}

describe("rotas de avisos do app", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it.each([
    ["GET lista", () => listar(req("GET"))],
    ["POST lidos", () => marcarLido(req("POST", `${BASE}/lidos`, '{"todos":true}'))],
    ["GET preferências", () => lerPreferencias(req("GET", `${BASE}/preferencias`))],
    [
      "PATCH preferências",
      () =>
        salvarPreferencias(
          req("PATCH", `${BASE}/preferencias`, JSON.stringify(preferenciaGravada)),
        ),
    ],
  ])("%s recusa ausência de sessão", async (_rotulo, invocar) => {
    expect((await invocar()).status).toBe(401)
  })

  describe("porta do app (CSRF)", () => {
    it("recusa origem fora da lista ao marcar lido", async () => {
      const mock = mockClient()
      autenticar(mock)
      const resposta = await marcarLido(
        req("POST", `${BASE}/lidos`, JSON.stringify({ id: AVISO }), {
          ...headers,
          origin: "https://fora.example",
        }),
      )
      expect(resposta.status).toBe(403)
      expect(mock.chamadas.some((chamada) => chamada.op === "update")).toBe(false)
    })

    it("recusa escrita por cookie sem o cabeçalho do app", async () => {
      const mock = mockClient()
      autenticar(mock)
      const semCabecalho = { origin: "http://localhost:3000", "content-type": "application/json" }
      const resposta = await salvarPreferencias(
        req("PATCH", `${BASE}/preferencias`, JSON.stringify(preferenciaGravada), semCabecalho),
      )
      expect(resposta.status).toBe(403)
      expect(mock.chamadas.some((chamada) => chamada.op === "upsert")).toBe(false)
    })
  })

  describe("lista", () => {
    it("valida os parâmetros antes de consultar o banco", async () => {
      const mock = mockClient()
      autenticar(mock)
      for (const busca of ["?filtro=tudo", "?limite=51", "?limite=0", "?depois=-1", "?depois=x"]) {
        expect((await listar(req("GET", `${BASE}${busca}`))).status).toBe(400)
      }
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("devolve o aviso do próprio membro com texto e destino no app", async () => {
      const mock = mockClient({ avisos: [linha], naoLidos: 1 })
      autenticar(mock)
      const corpo = await json(await listar(req("GET")))
      expect(corpo["avisos"]).toEqual([
        {
          id: AVISO,
          tipo: "comment",
          texto: "comentou na sua publicação",
          destino: `/app/publicacao/${linha.target_id}`,
          lida: false,
          criadaEm: DATA,
          grupo: `comment|created|post|${linha.target_id}`,
          total: 1,
        },
      ])
      expect(corpo["naoLidos"]).toBe(1)
      expect(corpo["proximo"]).toBeNull()
    })

    it("Agrupa avisos do mesmo tipo e alvo: uma linha, contagem e o mais recente", async () => {
      const maisNova = {
        ...linha,
        id: "50000000-0000-4000-8000-000000000002",
        created_at: "2026-11-02T12:00:00.000Z",
      }
      const outroAlvo = {
        ...linha,
        id: "50000000-0000-4000-8000-000000000003",
        type: "group_post",
        target_type: "group",
      }
      const mock = mockClient({ avisos: [maisNova, linha, outroAlvo], naoLidos: 3 })
      autenticar(mock)
      const corpo = await json(await listar(req("GET")))
      const avisos = corpo["avisos"] as Record<string, unknown>[]
      expect(avisos).toHaveLength(2)
      expect(avisos[0]).toMatchObject({
        id: maisNova.id,
        criadaEm: maisNova.created_at,
        total: 2,
        lida: false,
        grupo: `comment|created|post|${linha.target_id}`,
      })
      expect(avisos[1]).toMatchObject({ id: outroAlvo.id, total: 1 })
      // A contagem de não lidos continua sendo a dos avisos, não a das linhas.
      expect(corpo["naoLidos"]).toBe(3)
    })

    it("o grupo só aparece lido quando todos os membros estão lidos", async () => {
      const lidaMaisNova = { ...linha, read_at: DATA }
      const lida = mockClient({ avisos: [lidaMaisNova, { ...linha, read_at: DATA }] })
      autenticar(lida)
      const corpoLido = await json(await listar(req("GET")))
      expect((corpoLido["avisos"] as { total: number; lida: boolean }[])[0]).toMatchObject({
        total: 2,
        lida: true,
      })

      // A mais nova lida, a antiga pendente: o grupo continua não lido.
      const antiga = mockClient({
        avisos: [
          { ...linha, read_at: DATA },
          { ...linha, id: "50000000-0000-4000-8000-000000000009" },
        ],
      })
      autenticar(antiga)
      const corpoAberto = await json(await listar(req("GET")))
      expect((corpoAberto["avisos"] as { total: number; lida: boolean }[])[0]).toMatchObject({
        total: 2,
        lida: false,
      })
    })

    it("a pessoa vem da sessão; user_id na query não muda o recorte", async () => {
      const mock = mockClient({ avisos: [] })
      autenticar(mock)
      await listar(req("GET", `${BASE}?user_id=${OUTRA_PESSOA}&recipient_user_id=${OUTRA_PESSOA}`))
      expect(filtroDe(mock.chamadas, "recipient_user_id", USER)).toBe(true)
      expect(filtroDe(mock.chamadas, "recipient_user_id", OUTRA_PESSOA)).toBe(false)
    })

    it("o filtro de não lidas restringe a consulta, a contagem é sempre da pessoa", async () => {
      const mock = mockClient({ avisos: [], naoLidos: 4 })
      autenticar(mock)
      const corpo = await json(await listar(req("GET", `${BASE}?filtro=nao-lidas`)))
      expect(filtroDe(mock.chamadas, "read_at", null)).toBe(true)
      expect(corpo["naoLidos"]).toBe(4)
    })

    it("só pagina quando a página veio cheia", async () => {
      const cheia = mockClient({ avisos: Array.from({ length: 20 }, () => linha) })
      autenticar(cheia)
      expect((await json(await listar(req("GET"))))["proximo"]).toBe("20")

      const curta = mockClient({ avisos: [linha] })
      autenticar(curta)
      expect((await json(await listar(req("GET"))))["proximo"]).toBeNull()
    })

    it("tipo sem jornada no app cai na tela segura, nunca em 404", async () => {
      const mock = mockClient({
        avisos: [{ ...linha, type: "report_resolved", target_type: "report" }],
      })
      autenticar(mock)
      const corpo = await json(await listar(req("GET")))
      expect((corpo["avisos"] as { destino: string }[])[0]?.destino).toBe("/app/voce")
    })

    it("resposta do suporte abre os chamados da pessoa", async () => {
      const mock = mockClient({
        avisos: [
          {
            ...linha,
            type: "support_answered",
            action: "answered",
            target_type: "support_ticket",
          },
        ],
      })
      autenticar(mock)
      const corpo = await json(await listar(req("GET")))
      expect((corpo["avisos"] as { destino: string }[])[0]?.destino).toBe("/app/chamados")
    })

    it("denúncia analisada abre o conteúdo denunciado quando o alvo é visível", async () => {
      const conteudo = "60000000-0000-4000-8000-000000000001"
      const mock = mockClient({
        avisos: [
          {
            ...linha,
            type: "report_resolved",
            action: "resolved",
            target_type: "report",
            target_id: "60000000-0000-4000-8000-000000000002",
          },
        ],
        denuncias: [{ id: "60000000-0000-4000-8000-000000000002", target_type: "post", target_id: conteudo }],
      })
      autenticar(mock)
      const corpo = await json(await listar(req("GET")))
      expect((corpo["avisos"] as { destino: string; texto: string }[])[0]).toMatchObject({
        destino: `/app/publicacao/${conteudo}`,
        texto: "Sua denúncia foi analisada",
      })
      // A consulta de apoio é pela linha do report do próprio destinatário.
      expect(mock.chamadas).toContainEqual(
        expect.objectContaining({
          table: "reports",
          coluna: "id",
          valor: ["60000000-0000-4000-8000-000000000002"],
        }),
      )
    })

    it("denúncia sem alvo legível cai na tela segura; falha na leitura de apoio também", async () => {
      const semAlvo = {
        ...linha,
        type: "report_resolved",
        action: "resolved",
        target_type: "report",
        target_id: "60000000-0000-4000-8000-000000000003",
      }
      const vazio = mockClient({ avisos: [semAlvo], denuncias: [] })
      autenticar(vazio)
      const corpoVazio = await json(await listar(req("GET")))
      expect((corpoVazio["avisos"] as { destino: string }[])[0]?.destino).toBe("/app/voce")

      const comFalha = mockClient({ avisos: [semAlvo], errorTable: "reports" })
      autenticar(comFalha)
      const resposta = await listar(req("GET"))
      expect(resposta.status).toBe(200)
      const corpoFalha = await json(resposta)
      expect((corpoFalha["avisos"] as { destino: string }[])[0]?.destino).toBe("/app/voce")
      expect(JSON.stringify(corpoFalha)).not.toContain("boom")
    })

    it("convite de família aceito abre Você; entrada recusada abre a situação da entrada", async () => {
      const mock = mockClient({
        avisos: [
          {
            ...linha,
            id: "50000000-0000-4000-8000-000000000011",
            type: "invitation_accepted",
            action: "accepted",
            target_type: "family_invitation",
          },
          {
            ...linha,
            id: "50000000-0000-4000-8000-000000000012",
            type: "admission_rejected",
            action: "rejected",
            target_type: "user",
          },
        ],
      })
      autenticar(mock)
      const corpo = await json(await listar(req("GET")))
      const avisos = corpo["avisos"] as { tipo: string; destino: string; texto: string }[]
      expect(avisos[0]).toMatchObject({
        tipo: "invitation_accepted",
        destino: "/app/voce",
        texto: "aceitou seu convite de família",
      })
      expect(avisos[1]).toMatchObject({
        tipo: "admission_rejected",
        destino: "/app/entrar/analise",
        texto: "Sua participação não foi liberada",
      })
      // Sem denúncia na página, a consulta de apoio nem acontece.
      expect(mock.chamadas.some((chamada) => chamada.table === "reports")).toBe(false)
    })

    it("falha de leitura vira 503, nunca lista vazia", async () => {
      const mock = mockClient({ errorTable: "notifications" })
      autenticar(mock)
      const resposta = await listar(req("GET"))
      expect(resposta.status).toBe(503)
      const corpo = await json(resposta)
      expect(corpo).toEqual({ erro: "leitura-indisponivel" })
      expect(JSON.stringify(corpo)).not.toContain("boom")
    })
  })

  describe("marcar lido", () => {
    it("marca um aviso do próprio membro", async () => {
      const mock = mockClient({ atualizados: [{ id: AVISO }] })
      autenticar(mock)
      const resposta = await marcarLido(req("POST", `${BASE}/lidos`, JSON.stringify({ id: AVISO })))
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ atualizados: 1 })
      expect(filtroDe(mock.chamadas, "recipient_user_id", USER)).toBe(true)
      expect(filtroDe(mock.chamadas, "id", AVISO)).toBe(true)
    })

    it("marca todos os não lidos da sessão quando não há id", async () => {
      const mock = mockClient({ atualizados: [{ id: "a" }, { id: "b" }] })
      autenticar(mock)
      const resposta = await marcarLido(
        req("POST", `${BASE}/lidos`, JSON.stringify({ todos: true })),
      )
      expect(await json(resposta)).toEqual({ atualizados: 2 })
      expect(filtroDe(mock.chamadas, "recipient_user_id", USER)).toBe(true)
      expect(mock.chamadas.some((chamada) => chamada.coluna === "id")).toBe(false)
    })

    it("marca o grupo inteiro pela chave opaca, com todos os filtros do grupo", async () => {
      const mock = mockClient({ atualizados: [{ id: "a" }, { id: "b" }, { id: "c" }] })
      autenticar(mock)
      const resposta = await marcarLido(
        req(
          "POST",
          `${BASE}/lidos`,
          JSON.stringify({ grupo: `comment|created|post|${linha.target_id}` }),
        ),
      )
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ atualizados: 3 })
      expect(filtroDe(mock.chamadas, "recipient_user_id", USER)).toBe(true)
      expect(filtroDe(mock.chamadas, "read_at", null)).toBe(true)
      expect(filtroDe(mock.chamadas, "type", "comment")).toBe(true)
      expect(filtroDe(mock.chamadas, "action", "created")).toBe(true)
      expect(filtroDe(mock.chamadas, "target_type", "post")).toBe(true)
      expect(filtroDe(mock.chamadas, "target_id", linha.target_id)).toBe(true)
    })

    it("uma chave truncada não vira 'marcar todos': os filtros faltam e é 400", async () => {
      const mock = mockClient()
      autenticar(mock)
      const resposta = await marcarLido(
        req("POST", `${BASE}/lidos`, JSON.stringify({ grupo: "comment|created|post" })),
      )
      expect(resposta.status).toBe(400)
      expect(mock.chamadas.some((chamada) => chamada.op === "update")).toBe(false)
    })

    it("o aviso de outra pessoa não é alcançado: zero linhas, sem revelar nada", async () => {
      const mock = mockClient({ atualizados: [] })
      autenticar(mock)
      const corpo = await json(
        await marcarLido(req("POST", `${BASE}/lidos`, JSON.stringify({ id: AVISO }))),
      )
      expect(corpo).toEqual({ atualizados: 0 })
    })

    it.each([
      ["sem id nem todos", {}],
      ["id e todos juntos", { id: AVISO, todos: true }],
      ["id fora do formato", { id: "nao-e-uuid" }],
      ["todos que não é booleano verdadeiro", { todos: "sim" }],
      ["corpo vazio", null],
      ["grupo com alvo que não é uuid", { grupo: "comment|created|post|nao-e-uuid" }],
      ["grupo com parte vazia", { grupo: `comment||post|${linha.target_id}` }],
      ["grupo e id juntos", { id: AVISO, grupo: `comment|created|post|${linha.target_id}` }],
    ])("corpo inválido (%s) é 400", async (_rotulo, corpo) => {
      const mock = mockClient()
      autenticar(mock)
      const resposta = await marcarLido(
        req("POST", `${BASE}/lidos`, corpo === null ? "" : JSON.stringify(corpo)),
      )
      expect(resposta.status).toBe(400)
      expect(mock.chamadas.some((chamada) => chamada.op === "update")).toBe(false)
    })

    it("falha de escrita é 503 sem eco da mensagem do banco", async () => {
      const mock = mockClient({ erroNaEscrita: { message: "boom" } })
      autenticar(mock)
      const resposta = await marcarLido(
        req("POST", `${BASE}/lidos`, JSON.stringify({ todos: true })),
      )
      expect(resposta.status).toBe(503)
      const corpo = await json(resposta)
      expect(corpo).toEqual({ erro: "escrita-indisponivel" })
      expect(JSON.stringify(corpo)).not.toContain("boom")
    })
  })

  describe("preferências", () => {
    it.each(["off", "daily", "weekly"])(
      "grava frequência %s sob a sessão",
      async (resumoCidade) => {
        const mock = mockClient()
        autenticar(mock)
        const resposta = await salvarPreferencias(
          req(
            "PATCH",
            `${BASE}/preferencias`,
            JSON.stringify({ ...preferenciaGravada, resumoCidade }),
          ),
        )
        expect(resposta.status).toBe(200)
        expect(mock.chamadas).toContainEqual(
          expect.objectContaining({
            table: "notification_preferences",
            op: "upsert",
            corpo: expect.objectContaining({ user_id: USER, city_digest_frequency: resumoCidade }),
          }),
        )
      },
    )
    it("recusa frequência desconhecida sem gravar", async () => {
      const mock = mockClient()
      autenticar(mock)
      expect(
        (
          await salvarPreferencias(
            req(
              "PATCH",
              `${BASE}/preferencias`,
              JSON.stringify({ ...preferenciaGravada, resumoCidade: "hourly" }),
            ),
          )
        ).status,
      ).toBe(400)
      expect(mock.chamadas.some((chamada) => chamada.op === "upsert")).toBe(false)
    })

    it("devolve o padrão da web quando não há linha gravada", async () => {
      const mock = mockClient()
      autenticar(mock)
      const corpo = await json(await lerPreferencias(req("GET", `${BASE}/preferencias`)))
      const preferencias = corpo["preferencias"] as Record<string, unknown>
      expect(preferencias).toMatchObject({
        resumoCidade: "off",
        comments: true,
        events: true,
        productNews: false,
        indications: true,
      })
      const canais = preferencias["channels"] as {
        notificationType: string
        channel: string
        enabled: boolean
      }[]
      expect(canais).toHaveLength(12)
      // O e-mail das indicações é o resumo diário: nasce desligado.
      expect(
        canais.find((item) => item.notificationType === "indications" && item.channel === "email"),
      ).toMatchObject({ enabled: false })
      // Push nasce desligado: ainda não há envio (LAN-PUSH), e canal ligado
      // que não entrega seria a tela mentindo.
      expect(
        canais.find((item) => item.notificationType === "comments" && item.channel === "push"),
      ).toMatchObject({ enabled: false })
    })

    it("a linha gravada vence o padrão", async () => {
      const mock = mockClient({ preferencia: preferenciaLida, matriz: canaisGravados })
      autenticar(mock)
      const corpo = await json(await lerPreferencias(req("GET", `${BASE}/preferencias`)))
      const canais = (corpo["preferencias"] as Record<string, unknown>)["channels"] as {
        notificationType: string
        channel: string
        enabled: boolean
      }[]
      expect(
        canais.find((item) => item.notificationType === "comments" && item.channel === "email"),
      ).toMatchObject({ enabled: false })
      expect(corpo["preferencias"]).toMatchObject({ events: false, resumoCidade: "weekly" })
    })

    it("grava a escolha com o dono vindo da sessão", async () => {
      const mock = mockClient()
      autenticar(mock)
      const corpo = JSON.stringify({
        ...preferenciaGravada,
        user_id: OUTRA_PESSOA,
        channels: [{ notificationType: "comments", channel: "push", enabled: true }],
      })
      const resposta = await salvarPreferencias(req("PATCH", `${BASE}/preferencias`, corpo))
      expect(resposta.status).toBe(200)
      const gravacoes = mock.chamadas.filter((chamada) => chamada.op === "upsert")
      expect(gravacoes).toHaveLength(2)
      expect(gravacoes[0]?.corpo).toMatchObject({ user_id: USER, comments: true, events: false })
      expect(gravacoes[1]?.corpo).toEqual([
        {
          user_id: USER,
          notification_type: "comments",
          channel: "push",
          enabled: true,
          updated_at: expect.any(String),
        },
      ])
    })

    it("tipo desligado zera o canal informado", async () => {
      const mock = mockClient()
      autenticar(mock)
      const corpo = JSON.stringify({
        ...preferenciaGravada,
        events: false,
        channels: [{ notificationType: "events", channel: "in_app", enabled: true }],
      })
      await salvarPreferencias(req("PATCH", `${BASE}/preferencias`, corpo))
      const matriz = mock.chamadas.find(
        (chamada) =>
          chamada.op === "upsert" && chamada.table === "notification_channel_preferences",
      )
      expect(matriz?.corpo).toMatchObject([{ notification_type: "events", enabled: false }])
    })

    it.each([
      ["tipo booleano ausente", { comments: true, events: true, productNews: false }],
      ["tipo que não é booleano", { ...preferenciaGravada, comments: "sim" }],
      [
        "canal fora da lista",
        {
          ...preferenciaGravada,
          channels: [{ notificationType: "comments", channel: "fax", enabled: true }],
        },
      ],
      [
        "tipo de aviso desconhecido",
        {
          ...preferenciaGravada,
          channels: [{ notificationType: "mentions", channel: "in_app", enabled: true }],
        },
      ],
      [
        "par de canal repetido",
        {
          ...preferenciaGravada,
          channels: [
            { notificationType: "comments", channel: "in_app", enabled: true },
            { notificationType: "comments", channel: "in_app", enabled: false },
          ],
        },
      ],
    ])("corpo inválido (%s) é 400", async (_rotulo, corpo) => {
      const mock = mockClient()
      autenticar(mock)
      const resposta = await salvarPreferencias(
        req("PATCH", `${BASE}/preferencias`, JSON.stringify(corpo)),
      )
      expect(resposta.status).toBe(400)
      expect(mock.chamadas.some((chamada) => chamada.op === "upsert")).toBe(false)
    })

    it("falha de leitura é 503 e falha de escrita também", async () => {
      const leitura = mockClient({ errorTable: "notification_channel_preferences" })
      autenticar(leitura)
      expect((await lerPreferencias(req("GET", `${BASE}/preferencias`))).status).toBe(503)

      const escrita = mockClient({ erroNaEscrita: { message: "boom" } })
      autenticar(escrita)
      const resposta = await salvarPreferencias(
        req("PATCH", `${BASE}/preferencias`, JSON.stringify(preferenciaGravada)),
      )
      expect(resposta.status).toBe(503)
      expect(JSON.stringify(await json(resposta))).not.toContain("boom")
    })
  })
})
