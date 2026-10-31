// RECON-002 — reparo delimitado (coordenação Codex, 08/09/2026): comportamento
// das cargas de dados da home frente a rede rejeitada e a respostas atrasadas.
// O Vitest da casa roda em ambiente node, sem DOM nem testing-library, então a
// prova é na orquestração pura que os componentes usam (home-loaders.ts) —
// exatamente o código que decisiona entre erro recuperável, vazio honesto e
// descarte de resposta de contexto anterior.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  createRequestGuard,
  FEED_ERROR_MESSAGE,
  loadCommunityFeed,
  loadNextEvent,
  loadPrimaryCommunity,
} from "web/app/(shell)/inicio/home-loaders"

type QueryResult = { data: unknown; error: { message: string } | null }

interface FakeQueryBuilder {
  select: () => FakeQueryBuilder
  eq: (column: string, value: unknown) => FakeQueryBuilder
  order: (column: string, options: { ascending: boolean }) => FakeQueryBuilder
  limit: (count: number) => FakeQueryBuilder
  gte: (column: string, value: unknown) => FakeQueryBuilder
  maybeSingle: () => FakeQueryBuilder
  then: (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>
}

// Builder encadeável do PostgREST simulado: todo filtro devolve o próprio
// objeto e o await resolve (ou rejeita) o resultado semeado — rejeição é o
// caso "rede fora do ar" que o conserto precisa transformar em estado
// tratável, nunca em Promise pendente.
function fakeQuery(result: Promise<QueryResult> | QueryResult): FakeQueryBuilder {
  const settled = Promise.resolve(result)
  const chain: FakeQueryBuilder = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    gte: () => chain,
    maybeSingle: () => chain,
    // biome-ignore lint/suspicious/noThenProperty: thenable intencional — imita o builder encadeável do PostgREST que os loaders esperam com await
    then: (onFulfilled, onRejected) => settled.then(onFulfilled, onRejected),
  }
  return chain
}

type SeededTable = QueryResult | Promise<QueryResult> | (() => Promise<QueryResult> | QueryResult)

interface FakeConfig {
  getUser?: () => Promise<unknown>
  tables?: Record<string, SeededTable>
  rpc?: (name: string, params: Record<string, unknown>) => Promise<unknown>
}

function fakeClient(config: FakeConfig) {
  return {
    auth: {
      getUser:
        config.getUser ?? (async () => ({ data: { user: { id: "membro-1" } }, error: null })),
    },
    from: (table: string) => {
      const entry = config.tables?.[table]
      if (entry === undefined) {
        throw new Error(`tabela não semeada no fake: ${table}`)
      }
      return fakeQuery(typeof entry === "function" ? entry() : entry)
    },
    rpc: config.rpc ?? (async () => ({ data: [], error: null })),
  } as never
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (reason?: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// Drena as cadeias de microtarefas penduradas nas promessas controladas.
async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

const NETWORK_DOWN = () => Promise.reject(new TypeError("Failed to fetch"))

describe("loadPrimaryCommunity", () => {
  it("rede rejeitada vira erro recuperável, não Promise rejeitada nem travamento", async () => {
    const supabase = fakeClient({ getUser: NETWORK_DOWN })
    await expect(loadPrimaryCommunity(supabase)).resolves.toEqual({ status: "error" })
  })

  it("consulta de membership que rejeita vira erro recuperável", async () => {
    const supabase = fakeClient({
      tables: { community_memberships: NETWORK_DOWN() },
    })
    await expect(loadPrimaryCommunity(supabase)).resolves.toEqual({ status: "error" })
  })

  it("sem comunidade aprovada o veredito é none — vazio honesto, não erro", async () => {
    const supabase = fakeClient({
      tables: { community_memberships: { data: [], error: null } },
    })
    await expect(loadPrimaryCommunity(supabase)).resolves.toEqual({ status: "none" })
  })

  it("erro declarado na leitura da comunidade vira erro recuperável", async () => {
    const supabase = fakeClient({
      tables: {
        community_memberships: { data: [{ community_id: "comunidade-1" }], error: null },
        communities: { data: null, error: { message: "permission denied" } },
      },
    })
    await expect(loadPrimaryCommunity(supabase)).resolves.toEqual({ status: "error" })
  })

  it("caminho feliz resolve ready com o nome real lido", async () => {
    const supabase = fakeClient({
      tables: {
        community_memberships: { data: [{ community_id: "comunidade-1" }], error: null },
        communities: { data: { name: "Jardim das Acácias" }, error: null },
      },
    })
    await expect(loadPrimaryCommunity(supabase)).resolves.toEqual({
      status: "ready",
      id: "comunidade-1",
      name: "Jardim das Acácias",
    })
  })
})

describe("loadCommunityFeed", () => {
  it("rpc que rejeita devolve erro recuperável com nova tentativa, nunca lista vazia fingida", async () => {
    const supabase = fakeClient({ rpc: NETWORK_DOWN })
    const outcome = await loadCommunityFeed(supabase, "comunidade-1")
    expect(outcome).toEqual({ status: "error", message: FEED_ERROR_MESSAGE })
    expect(FEED_ERROR_MESSAGE).toContain("Tente novamente")
  })

  it("erro declarado do rpc devolve o mesmo estado recuperável", async () => {
    const supabase = fakeClient({
      rpc: async () => ({ data: null, error: { message: "RLS blocked" } }),
    })
    await expect(loadCommunityFeed(supabase, "comunidade-1")).resolves.toEqual({
      status: "error",
      message: FEED_ERROR_MESSAGE,
    })
  })

  it("sucesso entrega as linhas lidas sem inventar nada", async () => {
    const rows = [{ id: "post-1" }, { id: "post-2" }]
    const supabase = fakeClient({ rpc: async () => ({ data: rows, error: null }) })
    await expect(loadCommunityFeed(supabase, "comunidade-1")).resolves.toEqual({
      status: "ok",
      posts: rows,
    })
  })
})

describe("loadNextEvent", () => {
  const eventRow = {
    id: "evento-1",
    title: "Café entre vizinhos",
    starts_at: "2026-09-12T12:00:00.000Z",
    venue: "Praça da comunidade",
  }

  it("rede rejeitada na consulta de eventos devolve ausência honesta, não card pendurado", async () => {
    const supabase = fakeClient({ tables: { events: NETWORK_DOWN() } })
    await expect(loadNextEvent(supabase, "localidade-1")).resolves.toBeNull()
  })

  it("sem evento upcoming devolve null — o card não existe", async () => {
    const supabase = fakeClient({ tables: { events: { data: [], error: null } } })
    await expect(loadNextEvent(supabase, "localidade-1")).resolves.toBeNull()
  })

  it("contagem que rejeita derruba o card — sem dado confirmado ele não aparece", async () => {
    const supabase = fakeClient({
      tables: {
        events: { data: [eventRow], error: null },
        event_rsvps: NETWORK_DOWN(),
      },
    })
    await expect(loadNextEvent(supabase, "localidade-1")).resolves.toBeNull()
  })

  it("erro declarado na contagem omite a linha de pessoas, mas mantém o evento real", async () => {
    const supabase = fakeClient({
      tables: {
        events: { data: [eventRow], error: null },
        event_rsvps: { data: null, error: { message: "permission denied" } },
      },
    })
    await expect(loadNextEvent(supabase, "localidade-1")).resolves.toEqual({
      id: "evento-1",
      title: "Café entre vizinhos",
      startsAt: "2026-09-12T12:00:00.000Z",
      venue: "Praça da comunidade",
      goingCount: null,
    })
  })

  it("evento com contagem lida entrega título, data e pessoas reais", async () => {
    const supabase = fakeClient({
      tables: {
        events: { data: [eventRow], error: null },
        event_rsvps: { data: [{ user_id: "a" }, { user_id: "b" }], error: null },
      },
    })
    await expect(loadNextEvent(supabase, "localidade-1")).resolves.toEqual({
      id: "evento-1",
      title: "Café entre vizinhos",
      startsAt: "2026-09-12T12:00:00.000Z",
      venue: "Praça da comunidade",
      goingCount: 2,
    })
  })
})

describe("corrida de requisições (createRequestGuard)", () => {
  it("a segunda chamada aposenta a primeira", () => {
    const guard = createRequestGuard()
    const primeira = guard.begin()
    const segunda = guard.begin()
    expect(primeira()).toBe(false)
    expect(segunda()).toBe(true)
  })

  it("resposta atrasada da comunidade anterior não sobrescreve o feed da atual", async () => {
    const guard = createRequestGuard()
    const atrasada = deferred<QueryResult>()
    const atual = deferred<QueryResult>()
    let chamada = 0
    const supabase = fakeClient({
      rpc: () => {
        chamada += 1
        return chamada === 1 ? atrasada.promise : atual.promise
      },
    })

    let aplicado: unknown = null
    const ehAtualA = guard.begin()
    void loadCommunityFeed(supabase, "comunidade-A").then((outcome) => {
      if (ehAtualA()) aplicado = outcome
    })

    const ehAtualB = guard.begin()
    const aplicarB = loadCommunityFeed(supabase, "comunidade-B").then((outcome) => {
      if (ehAtualB()) aplicado = outcome
    })

    atual.resolve({ data: [{ id: "post-de-B" }], error: null })
    await aplicarB
    expect(aplicado).toEqual({ status: "ok", posts: [{ id: "post-de-B" }] })

    // A resposta da comunidade A chega depois — aplicar seria dado de contexto
    // anterior na tela da comunidade B.
    atrasada.resolve({ data: [{ id: "post-de-A" }], error: null })
    await flush()
    expect(aplicado).toEqual({ status: "ok", posts: [{ id: "post-de-B" }] })
  })

  it("troca de cidade: resposta atrasada da localidade antiga não re-injeta o evento", async () => {
    const guard = createRequestGuard()
    const atrasada = deferred<QueryResult>()
    let chamada = 0
    const supabase = fakeClient({
      tables: {
        events: () => {
          chamada += 1
          return chamada === 1 ? atrasada.promise : { data: [], error: null }
        },
        event_rsvps: { data: [{ user_id: "a" }], error: null },
      },
    })

    let aplicado: unknown = "sentinela-nao-aplicada"
    const ehAtualCidadeA = guard.begin()
    void loadNextEvent(supabase, "cidade-A").then((next) => {
      if (ehAtualCidadeA()) aplicado = next
    })

    // Troca de cidade: o componente limpa o card e aposenta a chamada em voo.
    const ehAtualCidadeB = guard.begin()
    const aplicarB = loadNextEvent(supabase, "cidade-B").then((next) => {
      if (ehAtualCidadeB()) aplicado = next
    })
    await aplicarB
    expect(aplicado).toBeNull()

    atrasada.resolve({
      data: [
        {
          id: "evento-de-A",
          title: "Encontro",
          starts_at: "2026-09-12T12:00:00.000Z",
          venue: null,
        },
      ],
      error: null,
    })
    await flush()
    // O evento da cidade A não pode reaparecer na cidade B.
    expect(aplicado).toBeNull()
  })

  it("retry enquanto a primeira ainda voa: só a última tentativa aplicada vence", async () => {
    const guard = createRequestGuard()
    const primeira = deferred<QueryResult>()
    const segunda = deferred<QueryResult>()
    let chamada = 0
    const supabase = fakeClient({
      rpc: () => {
        chamada += 1
        return chamada === 1 ? primeira.promise : segunda.promise
      },
    })

    let aplicado: unknown = null
    const ehAtual1 = guard.begin()
    void loadCommunityFeed(supabase, "comunidade-1").then((outcome) => {
      if (ehAtual1()) aplicado = outcome
    })

    const ehAtual2 = guard.begin()
    void loadCommunityFeed(supabase, "comunidade-1").then((outcome) => {
      if (ehAtual2()) aplicado = outcome
    })

    primeira.resolve({ data: [{ id: "resposta-1" }], error: null })
    await flush()
    expect(aplicado).toBeNull()

    segunda.resolve({ data: [{ id: "resposta-2" }], error: null })
    await flush()
    expect(aplicado).toEqual({ status: "ok", posts: [{ id: "resposta-2" }] })
  })
})

describe("aba Acompanhando fora do runtime (requisito pendente)", () => {
  const sectionPath = join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "apps",
    "web",
    "app",
    "(shell)",
    "inicio",
    "community-section.tsx",
  )

  it("a seção não registra a aba como tab consultável sem mecanismo real", () => {
    const source = readFileSync(sectionPath, "utf8")
    expect(source).not.toContain('key: "acompanhando"')
    expect(source).not.toContain('label: "Acompanhando"')
  })
})
