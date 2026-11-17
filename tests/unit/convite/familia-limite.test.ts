import { afterEach, describe, expect, it, vi } from "vitest"
import { enviarConvite, FalhaDeConvite } from "web/lib/convite/familia"

// O limite que vale é o teto atômico conferido pelo banco.

const janela = vi.hoisted(() => ({ recusando: false, chave: "" }))

vi.mock("web/lib/limits", () => ({
  createLimiterStore: () => ({
    record: async (chave: string) => {
      janela.chave = chave
      return janela.recusando ? 11 : 1
    },
  }),
}))

const USER = "20000000-0000-4000-8000-000000000001"
const NOVO = "70000000-0000-4000-8000-000000000002"

const UPSTASH = {
  UPSTASH_REDIS_REST_URL: "https://example.invalid",
  UPSTASH_REDIS_REST_TOKEN: "token-de-teste",
} as const

function banco(opcoes: { erroNaCriacao?: string } = {}) {
  const chamadas: { nome: string; args: Record<string, unknown> }[] = []
  const enfileirados: Record<string, unknown>[] = []

  const rpc = vi.fn(async (nome: string, args: Record<string, unknown> = {}) => {
    chamadas.push({ nome, args })
    if (nome === "create_family_invitation") {
      if (opcoes.erroNaCriacao !== undefined) {
        return { data: null, error: { code: "P0001", message: opcoes.erroNaCriacao } }
      }
      return { data: NOVO, error: null }
    }
    if (nome === "is_verified_holder") return { data: true, error: null }
    if (nome === "list_pending_invites_with_hint") {
      return {
        data: [
          {
            id: NOVO,
            invitee_email_hint: "fa***@ex***.invalid",
            created_at: "2026-11-06T12:00:00Z",
            expires_at: "2026-11-13T12:00:00Z",
          },
        ],
        error: null,
      }
    }
    throw new Error(`rpc inesperado: ${nome}`)
  })

  const from = vi.fn(() => ({
    insert: vi.fn(async (valor: Record<string, unknown>) => {
      enfileirados.push(valor)
      return { error: null }
    }),
  }))

  return { client: { rpc, from } as never, chamadas, enfileirados }
}

async function enviar(mock: ReturnType<typeof banco>, email = "familiar@example.invalid") {
  return enviarConvite(mock.client, mock.client, USER, email).catch((erro: unknown) => erro)
}

describe("limite de ritmo do convite de família", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    janela.recusando = false
  })

  it("sem Upstash configurado o banco aplica o teto", async () => {
    const mock = banco({ erroNaCriacao: "maximum 10 invitations per holder per hour" })
    const falha = await enviar(mock)
    expect(falha).toBeInstanceOf(FalhaDeConvite)
    expect((falha as FalhaDeConvite).motivo).toBe("limite")
    expect(mock.chamadas.map((chamada) => chamada.nome)).toEqual(["create_family_invitation"])
    expect(mock.enfileirados).toHaveLength(0)
  })
  it("janela atômica recusando barra antes de criar", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", UPSTASH.UPSTASH_REDIS_REST_URL)
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", UPSTASH.UPSTASH_REDIS_REST_TOKEN)
    janela.recusando = true
    const mock = banco()
    const falha = await enviar(mock)
    expect(falha).toBeInstanceOf(FalhaDeConvite)
    expect((falha as FalhaDeConvite).motivo).toBe("limite")
    // A chave é por titular, não global.
    expect(janela.chave).toBe(`bivaque:limit:familyInvite:${USER}`)
    expect(mock.chamadas.some((chamada) => chamada.nome === "create_family_invitation")).toBe(false)
    expect(mock.enfileirados).toHaveLength(0)
  })

  it("janela dentro do teto cria sem mandar id de titular para o banco", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", UPSTASH.UPSTASH_REDIS_REST_URL)
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", UPSTASH.UPSTASH_REDIS_REST_TOKEN)
    const mock = banco()
    const resultado = await enviar(mock)
    expect((resultado as { convite: { id: string } }).convite.id).toBe(NOVO)
    expect(mock.enfileirados).toHaveLength(1)
    const criacao = mock.chamadas.find((chamada) => chamada.nome === "create_family_invitation")
    // A posse é do banco (auth.uid()): o id do titular não viaja no caminho público.
    expect(Object.keys(criacao?.args ?? {}).sort()).toEqual([
      "p_code_hash",
      "p_invitee_email_digest",
      "p_invitee_email_hint",
      "p_token_digest",
    ])
  })

  it("teto de envios do banco vira recusa de limite, sem criar nem enfileirar", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", UPSTASH.UPSTASH_REDIS_REST_URL)
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", UPSTASH.UPSTASH_REDIS_REST_TOKEN)
    const mock = banco({ erroNaCriacao: "maximum 10 invitations per holder per hour" })
    const falha = await enviar(mock)
    expect(falha).toBeInstanceOf(FalhaDeConvite)
    expect((falha as FalhaDeConvite).motivo).toBe("limite")
    expect(mock.enfileirados).toHaveLength(0)
  })

  it("teto de ativos do banco vira conflito", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", UPSTASH.UPSTASH_REDIS_REST_URL)
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", UPSTASH.UPSTASH_REDIS_REST_TOKEN)
    const mock = banco({ erroNaCriacao: "maximum 5 active invitations per holder" })
    const falha = await enviar(mock)
    expect((falha as FalhaDeConvite).motivo).toBe("teto-de-convites")
    expect(mock.enfileirados).toHaveLength(0)
  })

  it("quem não é titular vem do banco, não de uma checagem paralela", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", UPSTASH.UPSTASH_REDIS_REST_URL)
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", UPSTASH.UPSTASH_REDIS_REST_TOKEN)
    const mock = banco({ erroNaCriacao: "only verified holders can create invitations" })
    const falha = await enviar(mock)
    expect((falha as FalhaDeConvite).motivo).toBe("nao-titular")
    // A única função chamada é a criação: a guarda é a do banco.
    expect(mock.chamadas.map((chamada) => chamada.nome)).toEqual(["create_family_invitation"])
  })

  it("falha do banco é recusa de banco, sem ecoar a mensagem", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", UPSTASH.UPSTASH_REDIS_REST_URL)
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", UPSTASH.UPSTASH_REDIS_REST_TOKEN)
    const mock = banco({ erroNaCriacao: "segredo do banco" })
    const falha = await enviar(mock)
    expect((falha as FalhaDeConvite).motivo).toBe("banco")
    expect((falha as FalhaDeConvite).message).not.toContain("segredo")
    expect(mock.enfileirados).toHaveLength(0)
  })
})
