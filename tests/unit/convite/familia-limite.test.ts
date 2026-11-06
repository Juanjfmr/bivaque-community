import { describe, expect, it, vi } from "vitest"
import { enviarConvite, FalhaDeConvite } from "web/lib/convite/familia"

// RUN-020 (b): teto de ritmo do convite de família. O módulo é a única porta
// (rota do app e tela antiga), então o limite vale para as duas. A contagem vem
// do outbox: cada envio deixa uma linha `family_invite` do titular, inclusive
// depois de revogado — revogar não desfaz o e-mail que já saiu.

const USER = "20000000-0000-4000-8000-000000000001"
const NOVO = "70000000-0000-4000-8000-000000000002"

type Filtro = readonly [string, unknown]

function banco(opcoes: { enviados?: number; erroNaContagem?: boolean } = {}) {
  const chamadas: string[] = []
  const filtros: Filtro[] = []
  const enfileirados: Record<string, unknown>[] = []

  const consulta = {
    eq: (coluna: string, valor: unknown) => {
      filtros.push([coluna, valor])
      return consulta
    },
    contains: (coluna: string, valor: unknown) => {
      filtros.push([coluna, valor])
      return consulta
    },
    gte: async (coluna: string, valor: unknown) => {
      filtros.push([coluna, valor])
      return opcoes.erroNaContagem
        ? { count: null, error: { code: "XX000", message: "segredo" } }
        : { count: opcoes.enviados ?? 0, error: null }
    },
  }

  const rpc = vi.fn(async (nome: string) => {
    chamadas.push(nome)
    if (nome === "is_verified_holder") return { data: true, error: null }
    if (nome === "create_family_invitation") return { data: NOVO, error: null }
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
    select: () => consulta,
    insert: vi.fn(async (valor: Record<string, unknown>) => {
      enfileirados.push(valor)
      return { error: null }
    }),
  }))

  return { client: { rpc, from } as never, chamadas, filtros, enfileirados }
}

describe("limite de ritmo do convite de família", () => {
  it("10 envios na última hora recusam o próximo antes de criar ou enfileirar", async () => {
    const mock = banco({ enviados: 10 })
    const falha = await enviarConvite(mock.client, USER, "familiar@example.invalid").catch(
      (erro: unknown) => erro,
    )
    expect(falha).toBeInstanceOf(FalhaDeConvite)
    expect((falha as FalhaDeConvite).motivo).toBe("limite")
    expect(mock.chamadas).not.toContain("create_family_invitation")
    expect(mock.enfileirados).toHaveLength(0)
  })

  it("9 envios ainda deixam convidar", async () => {
    const mock = banco({ enviados: 9 })
    const { convite } = await enviarConvite(mock.client, USER, "familiar@example.invalid")
    expect(convite.id).toBe(NOVO)
    expect(mock.chamadas).toContain("create_family_invitation")
    expect(mock.enfileirados).toHaveLength(1)
  })

  it("conta revogados: a contagem não filtra por status", async () => {
    const mock = banco({ enviados: 0 })
    await enviarConvite(mock.client, USER, "familiar@example.invalid")
    expect(mock.filtros).toContainEqual(["type", "family_invite"])
    expect(mock.filtros).toContainEqual(["payload", { user_id: USER }])
    expect(mock.filtros.some(([coluna]) => coluna === "status")).toBe(false)
  })

  it("falha ao contar o limite é recusa de banco, não envio livre", async () => {
    const mock = banco({ erroNaContagem: true })
    const falha = await enviarConvite(mock.client, USER, "familiar@example.invalid").catch(
      (erro: unknown) => erro,
    )
    expect(falha).toBeInstanceOf(FalhaDeConvite)
    expect((falha as FalhaDeConvite).motivo).toBe("banco")
    expect(mock.enfileirados).toHaveLength(0)
  })
})
