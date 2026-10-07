// RECON-009 (prancha 43) — prova da cerca de público em /communities/[id].
// O Vitest da casa roda em ambiente node, sem DOM, então a prova é na
// orquestração pura que a página usa (community-detail-loaders.ts): além do
// que cada público RECEBE, cada teste negativo afirma que a consulta do dado
// restrito NEM SEQUER FOI EMITIDA — esconder no cliente não é o contrato.

import { describe, expect, it } from "vitest"
import {
  buildGroupCards,
  enterableGroupIds,
  isUuid,
  resolveAudience,
} from "web/app/(shell)/communities/[id]/community-detail-data"
import { loadCommunityDetail } from "web/app/(shell)/communities/[id]/community-detail-loaders"

type QueryResult = { data: unknown; error: { message: string } | null; count?: number | null }

type Filter = { op: "eq" | "neq" | "in"; column: string; value: unknown }

type Call = {
  table: string
  select: string
  options?: { count?: string; head?: boolean }
  filters: Filter[]
  maybeSingle: boolean
}

interface FakeConfig {
  resolve: (call: Call) => QueryResult | Promise<QueryResult>
  rpc?: (name: string, params: Record<string, unknown>) => Promise<QueryResult>
}

function makeFakeClient(config: FakeConfig) {
  const queries: Call[] = []
  const rpcs: { name: string; params: Record<string, unknown> }[] = []

  const client = {
    from: (table: string) => {
      const call: Call = { table, select: "", filters: [], maybeSingle: false }
      const chain = {
        select: (cols: string, options?: { count?: string; head?: boolean }) => {
          call.select = cols
          if (options) call.options = options
          return chain
        },
        eq: (column: string, value: unknown) => {
          call.filters.push({ op: "eq", column, value })
          return chain
        },
        neq: (column: string, value: unknown) => {
          call.filters.push({ op: "neq", column, value })
          return chain
        },
        in: (column: string, value: readonly unknown[]) => {
          call.filters.push({ op: "in", column, value: [...value] })
          return chain
        },
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => {
          call.maybeSingle = true
          return chain
        },
        // biome-ignore lint/suspicious/noThenProperty: thenable intencional — imita o builder encadeável do PostgREST que o loader espera com await
        then: (
          onFulfilled: (value: QueryResult) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => {
          queries.push(call)
          return Promise.resolve()
            .then(() => config.resolve(call))
            .then(onFulfilled, onRejected)
        },
      }
      return chain
    },
    rpc: async (name: string, params: Record<string, unknown>) => {
      rpcs.push({ name, params })
      return (config.rpc ?? (async () => ({ data: null, error: null })))(name, params)
    },
  }

  return { client: client as never, queries, rpcs }
}

function hasFilter(call: Call, op: Filter["op"], column: string, value: unknown): boolean {
  return call.filters.some(
    (f) =>
      f.op === op &&
      f.column === column &&
      (f.value === value || JSON.stringify(f.value) === JSON.stringify(value)),
  )
}

const COMMUNITY = {
  id: "c-1",
  name: "Jardim das Acácias",
  description: "Vila do bairro das acácias.",
  locality_id: "l-1",
  created_at: "2023-03-15T12:00:00Z",
}

const LOCALITY = { city_name: "Brasília", state_code: "DF" }

function presentationOk(call: Call, membership: unknown): QueryResult {
  if (call.table === "communities") return { data: COMMUNITY, error: null }
  if (call.table === "community_memberships" && call.maybeSingle) {
    return { data: membership, error: null }
  }
  if (call.table === "localities") return { data: LOCALITY, error: null }
  throw new Error(`consulta não esperada neste cenário: ${call.table}/${call.select}`)
}

describe("resolveAudience — os três públicos da prancha 43", () => {
  it("pedido pendente NÃO é membresia", () => {
    expect(resolveAudience({ role: "member", status: "pending" })).toBe("pending")
  })

  it("sem linha de participação é visitante", () => {
    expect(resolveAudience(null)).toBe("visitor")
  })

  it("linha aprovada é membro", () => {
    expect(resolveAudience({ role: "owner", status: "approved" })).toBe("member")
  })
})

describe("buildGroupCards — acesso consultado, nunca deduzido de número", () => {
  const groups = [
    { id: "g-publico", name: "Corrida", description: null, visibility: "public" as const },
    { id: "g-privado-dentro", name: "Livros", description: null, visibility: "private" as const },
    { id: "g-privado-fora", name: "Concurso", description: null, visibility: "private" as const },
  ]
  const mine = [
    { group_id: "g-publico", status: "approved" as const },
    { group_id: "g-privado-dentro", status: "approved" as const },
  ]

  it("grupo privado sem participação aprovada não tem contagem exibível", () => {
    const cards = buildGroupCards(groups, mine, new Map([["g-publico", 128]]))
    const fora = cards.find((c) => c.id === "g-privado-fora")
    expect(fora?.canEnter).toBe(false)
    expect(fora?.memberCount).toBeNull()
    expect(fora?.participating).toBe(false)
  })

  it("privado com linha própria aprovada libera entrada e contagem lida", () => {
    const cards = buildGroupCards(
      groups,
      mine,
      new Map([
        ["g-publico", 128],
        ["g-privado-dentro", 96],
      ]),
    )
    const dentro = cards.find((c) => c.id === "g-privado-dentro")
    expect(dentro?.canEnter).toBe(true)
    expect(dentro?.participating).toBe(true)
    expect(dentro?.memberCount).toBe(96)
  })

  it("público sem linha minha não é 'participo', mas é enterável", () => {
    const cards = buildGroupCards(groups, [], new Map([["g-publico", 5]]))
    expect(cards[0]?.canEnter).toBe(true)
    expect(cards[0]?.participating).toBe(false)
    expect(enterableGroupIds(groups, [])).toEqual(["g-publico"])
  })
})

describe("isUuid", () => {
  it("rejeita id malformado — rota inválida é 404, não erro de consulta", () => {
    expect(isUuid("qualquer-coisa")).toBe(false)
    expect(isUuid("71000000-0000-4000-8000-000000000001")).toBe(true)
  })
})

describe("loadCommunityDetail — visitante", () => {
  it("recebe só a apresentação autorizada e nenhuma consulta de membro é emitida", async () => {
    const { client, queries, rpcs } = makeFakeClient({
      resolve: (call) => presentationOk(call, null),
    })

    const view = await loadCommunityDetail(client, COMMUNITY.id, "visitante-1")

    expect(view).toMatchObject({
      status: "ready",
      audience: "visitor",
      presentation: { name: "Jardim das Acácias", cityLabel: "Brasília, DF" },
    })
    // Negativos: dados de membro não são carregados para esconder depois.
    expect(queries.filter((q) => q.table === "groups")).toHaveLength(0)
    expect(queries.filter((q) => q.table === "community_join_reasons")).toHaveLength(0)
    expect(rpcs).toHaveLength(0)
    const membershipQueries = queries.filter((q) => q.table === "community_memberships")
    expect(membershipQueries).toHaveLength(1)
    expect(hasFilter(membershipQueries[0] as Call, "eq", "user_id", "visitante-1")).toBe(true)
    expect(membershipQueries.some((q) => hasFilter(q, "eq", "status", "approved"))).toBe(false)
  })
})

describe("loadCommunityDetail — solicitante com pedido pendente", () => {
  const pendingRow = { role: "member", status: "pending", joined_at: "2026-09-01T10:00:00Z" }

  it("vê status real do próprio pedido e o motivo somente leitura, sem grupos/feed/contagem", async () => {
    const { client, queries, rpcs } = makeFakeClient({
      resolve: (call) => {
        if (call.table === "community_join_reasons") {
          return { data: { reason: "Moro na rua de trás da praça." }, error: null }
        }
        return presentationOk(call, pendingRow)
      },
    })

    const view = await loadCommunityDetail(client, COMMUNITY.id, "pedinte-1")

    expect(view).toMatchObject({
      status: "ready",
      audience: "pending",
      requestedAt: "2026-09-01T10:00:00Z",
      joinReason: "Moro na rua de trás da praça.",
    })
    expect(queries.filter((q) => q.table === "groups")).toHaveLength(0)
    expect(rpcs).toHaveLength(0)
    expect(
      queries.filter((q) => q.table === "community_memberships" && q.options?.head === true),
    ).toHaveLength(0)
  })

  it("pedido sem motivo registrado é válido: joinReason null, sem linha inventada", async () => {
    const { client } = makeFakeClient({
      resolve: (call) => {
        if (call.table === "community_join_reasons") {
          return { data: null, error: null }
        }
        return presentationOk(call, pendingRow)
      },
    })

    const view = await loadCommunityDetail(client, COMMUNITY.id, "pedinte-1")
    expect(view).toMatchObject({ audience: "pending", joinReason: null })
  })

  it("falha ao ler o motivo LANÇA — não vira null silencioso", async () => {
    const { client } = makeFakeClient({
      resolve: (call) => {
        if (call.table === "community_join_reasons") {
          return { data: null, error: { message: "boom" } }
        }
        return presentationOk(call, pendingRow)
      },
    })

    await expect(loadCommunityDetail(client, COMMUNITY.id, "pedinte-1")).rejects.toThrow(
      "Falha ao ler o motivo do seu pedido.",
    )
  })
})

describe("loadCommunityDetail — membro aprovado", () => {
  const memberRow = { role: "member", status: "approved", joined_at: "2026-01-01T10:00:00Z" }
  const groupRows = [
    { id: "g-publique", name: "Corrida no parque", description: null, visibility: "public" },
    { id: "g-dentro", name: "Trocas de livros", description: null, visibility: "private" },
    { id: "g-fora", name: "Estudos", description: null, visibility: "private" },
  ]

  function memberResolve(call: Call): QueryResult {
    if (call.table === "groups") return { data: groupRows, error: null }
    if (call.table === "group_memberships" && call.select === "group_id, status") {
      return {
        data: [
          { group_id: "g-publique", status: "approved" },
          { group_id: "g-dentro", status: "approved" },
        ],
        error: null,
      }
    }
    if (call.table === "group_memberships") {
      return {
        data: [{ group_id: "g-publique" }, { group_id: "g-publique" }, { group_id: "g-dentro" }],
        error: null,
      }
    }
    if (call.table === "community_memberships" && call.options?.head === true) {
      return { data: null, error: null, count: 382 }
    }
    return presentationOk(call, memberRow)
  }

  it("grupos com permissão consultada, contagem exata da vila e feed lido", async () => {
    const { client, queries, rpcs } = makeFakeClient({
      resolve: memberResolve,
      rpc: async () => ({ data: [{ id: "p-1" }], error: null }),
    })

    const view = await loadCommunityDetail(client, COMMUNITY.id, "membro-1")

    expect(view).toMatchObject({ audience: "member", memberCount: 382, canModerate: false })
    if (view.status !== "ready" || view.audience !== "member") {
      throw new Error("esperava visão de membro")
    }
    expect(view.feed).toHaveLength(1)
    expect(rpcs).toEqual([
      { name: "feed_community", params: { p_community_id: "c-1", p_order: "recent" } },
    ])

    const publico = view.groups.find((g) => g.id === "g-publique")
    const dentro = view.groups.find((g) => g.id === "g-dentro")
    const fora = view.groups.find((g) => g.id === "g-fora")
    expect(publico?.memberCount).toBe(2)
    expect(dentro?.memberCount).toBe(1)
    // Privado em que não participo: sem contagem — a lista não me é devida.
    expect(fora?.memberCount).toBeNull()
    expect(fora?.canEnter).toBe(false)

    // A contagem por grupo foi pedida SÓ para os grupos enteráveis.
    const countCall = queries.find(
      (q) =>
        q.table === "group_memberships" &&
        hasFilter(q, "in", "group_id", ["g-publique", "g-dentro"]),
    )
    expect(countCall).toBeDefined()

    // Membro comum não é dono: roster de transferência não é carregado.
    expect(queries.filter((q) => q.table === "profiles")).toHaveLength(0)
    expect(
      queries.filter(
        (q) => q.table === "community_memberships" && hasFilter(q, "neq", "user_id", "membro-1"),
      ),
    ).toHaveLength(0)
    expect(view.transferCandidates).toEqual([])
  })

  it("dono carrega o roster só para o seletor de transferência", async () => {
    const ownerRow = { role: "owner", status: "approved", joined_at: "2025-01-01T10:00:00Z" }
    const { client } = makeFakeClient({
      resolve: (call) => {
        if (call.table === "profiles") {
          return {
            data: [{ user_id: "m-2", display_name: "Carlos Ribeiro" }],
            error: null,
          }
        }
        if (call.table === "community_memberships" && call.maybeSingle) {
          return { data: ownerRow, error: null }
        }
        if (call.table === "community_memberships" && hasFilter(call, "neq", "user_id", "dono-1")) {
          return { data: [{ user_id: "m-2" }], error: null }
        }
        return memberResolve(call)
      },
      rpc: async () => ({ data: [], error: null }),
    })

    const view = await loadCommunityDetail(client, COMMUNITY.id, "dono-1")
    expect(view).toMatchObject({ audience: "member", canModerate: true })
    if (view.status !== "ready" || view.audience !== "member") {
      throw new Error("esperava visão de membro")
    }
    expect(view.transferCandidates).toEqual([{ userId: "m-2", displayName: "Carlos Ribeiro" }])
  })

  it("falha ao ler grupos LANÇA — lista vazia fingida é o bug proibido", async () => {
    const { client } = makeFakeClient({
      resolve: (call) => {
        if (call.table === "groups") return { data: null, error: { message: "boom" } }
        return memberResolve(call)
      },
      rpc: async () => ({ data: [], error: null }),
    })

    await expect(loadCommunityDetail(client, COMMUNITY.id, "membro-1")).rejects.toThrow(
      "Falha ao ler os grupos da comunidade.",
    )
  })

  it("contagem pedida e não devolvida LANÇA — não vira '0 membros'", async () => {
    const { client } = makeFakeClient({
      resolve: (call) => {
        if (call.table === "community_memberships" && call.options?.head === true) {
          return { data: null, error: null, count: null }
        }
        return memberResolve(call)
      },
      rpc: async () => ({ data: [], error: null }),
    })

    await expect(loadCommunityDetail(client, COMMUNITY.id, "membro-1")).rejects.toThrow(
      "Falha ao contar os membros da comunidade.",
    )
  })

  it("falha no feed LANÇA", async () => {
    const { client } = makeFakeClient({
      resolve: memberResolve,
      rpc: async () => ({ data: null, error: { message: "boom" } }),
    })

    await expect(loadCommunityDetail(client, COMMUNITY.id, "membro-1")).rejects.toThrow(
      "Falha ao ler as publicações da comunidade.",
    )
  })
})

describe("loadCommunityDetail — comunidade inexistente ou ilegível", () => {
  it("sem linha legível é not-found, não tela vazia", async () => {
    const { client } = makeFakeClient({
      resolve: (call) => {
        if (call.table === "communities") return { data: null, error: null }
        throw new Error(`não deveria consultar ${call.table}`)
      },
    })

    await expect(loadCommunityDetail(client, "c-9", "qualquer-1")).resolves.toEqual({
      status: "not-found",
    })
  })

  it("erro de leitura da comunidade LANÇA — não é not-found silencioso", async () => {
    const { client } = makeFakeClient({
      resolve: () => ({ data: null, error: { message: "boom" } }),
    })

    await expect(loadCommunityDetail(client, "c-1", "qualquer-1")).rejects.toThrow(
      "Falha ao ler a comunidade.",
    )
  })
})
