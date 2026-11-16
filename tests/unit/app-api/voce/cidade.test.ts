import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET, OPTIONS, POST } from "web/app/api/app/voce/cidade/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { moveErrorMessage } from "web/lib/locality/move-city"

// A mudança de cidade no app (F10 / RUN-170, ADR-20261116): a transferência que
// a web já tem, pela mesma função do banco. O que este teste guarda:
//
//   1. a validação é a compartilhada (destino diferente da atual, prazo entre
//      hoje e +180) — nenhuma regra própria da rota;
//   2. o payload do RPC é exatamente o da action web
//      (`(shell)/profile/city-actions.ts:64-67`): destino e prazo, nada mais;
//   3. o cliente é o da SESSÃO (a função é SECURITY DEFINER sobre auth.uid()) e
//      o destino nunca vem de nome;
//   4. `23505` é a mensagem vigente de mudança em andamento, e nenhum código do
//      banco vira 200 nem vaza texto.

const PESSOA = "20000000-0000-4000-8000-000000000006"
const MANAUS = "00000000-0000-4000-8000-000000000001"
const RIO = "00000000-0000-4000-8000-000000000002"
const ORIGEM = "http://localhost:3200"
const URL_DA_ROTA = "http://localhost:3000/api/app/voce/cidade"

type Saida = {
  locality_id: string
  leaving_at: string | null
  access: string
  localities: { city_name: string; state_code: string } | null
}

type Opcoes = {
  /** Código com que a RPC recusa, como o banco faz. */
  erroDoRpc?: { code: string; message: string }
  /** Sessão sem vínculo `current`. */
  semCidade?: boolean
  /** Pessoa já em transferência. */
  saida?: Saida
  /** O que a leitura por id do catálogo devolve. */
  cidadeDoLink?: { id: string; city_name: string; state_code: string } | null
  /** Deruba a leitura do catálogo (503). */
  catalogoFora?: boolean
}

function dia(dias: number): string {
  const data = new Date(Date.now() + dias * 24 * 60 * 60 * 1000)
  return data.toISOString().slice(0, 10)
}

/**
 * O banco dos testes: `locality_memberships` responde pelo `kind` pedido, e a
 * RPC de transferência MUDA o estado como a transação do banco — a cidade vira
 * o destino e a anterior fica de saída. Sem isso a resposta "estado novo" não
 * seria testável.
 */
function cliente(opcoes: Opcoes = {}) {
  const chamadasRpc: { nome: string; args: unknown }[] = []
  const estado: { current: string; saida: Saida | null } = {
    current: MANAUS,
    saida: opcoes.saida ?? null,
  }

  const from = vi.fn((tabela: string) => {
    const filtros: Record<string, string> = {}
    const resolver = () => {
      if (tabela === "locality_memberships") {
        if (filtros["kind"] === "leaving") return { data: estado.saida, error: null }
        if (opcoes.semCidade === true) return { data: null, error: null }
        const nome = estado.current === RIO ? "Rio de Janeiro" : "Manaus"
        const uf = estado.current === RIO ? "RJ" : "AM"
        return {
          data: {
            locality_id: estado.current,
            localities: { city_name: nome, state_code: uf },
          },
          error: null,
        }
      }
      if (tabela === "profiles") {
        return { data: { display_name: "Em Transferência", bio: null }, error: null }
      }
      if (tabela === "localities") {
        if (opcoes.catalogoFora === true)
          return { data: null, error: { code: "XX000", message: "segredo do banco" } }
        return { data: opcoes.cidadeDoLink ?? null, error: null }
      }
      return { data: null, error: null }
    }

    const q: Record<string, unknown> = {}
    q["select"] = () => q
    q["eq"] = (coluna: string, valor: string) => {
      filtros[coluna] = valor
      return q
    }
    q["order"] = () => q
    q["limit"] = () => q
    q["maybeSingle"] = async () => resolver()
    return q
  })

  const rpc = vi.fn(async (nome: string, args: { p_destination_locality_id?: string }) => {
    chamadasRpc.push({ nome, args })
    if (nome === "get_my_profile_location") {
      return { data: [{ cep: "69000000", definida: true, com_coordenada: true }], error: null }
    }
    if (nome === "declare_locality_transfer") {
      if (opcoes.erroDoRpc !== undefined) return { data: null, error: opcoes.erroDoRpc }
      estado.saida = {
        locality_id: estado.current,
        leaving_at: (args as { p_term_date?: string }).p_term_date ?? null,
        access: "active",
        localities: { city_name: "Manaus", state_code: "AM" },
      }
      estado.current = args.p_destination_locality_id ?? estado.current
      return { data: [], error: null }
    }
    return { data: null, error: null }
  })

  return { client: { from, rpc } as never, chamadasRpc, estado }
}

function autenticar(opcoes: Opcoes = {}) {
  const mock = cliente(opcoes)
  vi.mocked(resolverSessaoDaRequisicao).mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: PESSOA },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
  return mock
}

function pedido(corpo: unknown, opcoes: { cabecalho?: boolean; origem?: string } = {}) {
  const headers: Record<string, string> = { origin: opcoes.origem ?? ORIGEM }
  if (opcoes.cabecalho !== false) headers["x-bivaque-app"] = "bivaque-spa"
  headers["content-type"] = "application/json"
  return new NextRequest(URL_DA_ROTA, {
    method: "POST",
    headers,
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  })
}

function leitura(consulta = "") {
  return new NextRequest(`${URL_DA_ROTA}${consulta}`, {
    method: "GET",
    headers: { origin: ORIGEM },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  vi.mocked(resolverSessaoDaRequisicao).mockResolvedValue({
    estado: "recusada",
    sessao: { estado: "recusada", motivo: "sem-credencial" },
  } as never)
})

describe("POST /api/app/voce/cidade", () => {
  it("declara a mudança com o mesmo payload da action web e devolve o estado novo", async () => {
    const mock = autenticar()
    const prazo = dia(30)
    const resposta = await POST(pedido({ destino: RIO, prazo }))

    expect(resposta.status).toBe(200)
    // `(shell)/profile/city-actions.ts:64-67`: a RPC recebe só destino e prazo.
    expect(mock.chamadasRpc.filter(({ nome }) => nome === "declare_locality_transfer")).toEqual([
      {
        nome: "declare_locality_transfer",
        args: { p_destination_locality_id: RIO, p_term_date: prazo },
      },
    ])
    const corpo = await resposta.json()
    expect(corpo.perfil.cidade).toEqual({ id: RIO, nome: "Rio de Janeiro" })
    expect(corpo.perfil.outbound).toEqual({
      id: MANAUS,
      nome: "Manaus",
      uf: "AM",
      endsAt: prazo,
      readOnly: false,
    })
  })

  it("sem sessão responde 401 e não chama a RPC", async () => {
    const resposta = await POST(pedido({ destino: RIO, prazo: dia(30) }))
    expect(resposta.status).toBe(401)
  })

  it("sem o cabeçalho do app e com origem fora da lista responde 403", async () => {
    const semCabecalho = autenticar()
    expect(
      (await POST(pedido({ destino: RIO, prazo: dia(30) }, { cabecalho: false }))).status,
    ).toBe(403)
    expect(semCabecalho.chamadasRpc).toEqual([])

    autenticar()
    expect(
      (await POST(pedido({ destino: RIO, prazo: dia(30) }, { origem: "https://fora.example" })))
        .status,
    ).toBe(403)
  })

  it("a cidade da sessão como destino é 400, sem tocar no banco", async () => {
    const mock = autenticar()
    const resposta = await POST(pedido({ destino: MANAUS, prazo: dia(30) }))
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({
      erro: "dados-invalidos",
      mensagem: "Essa já é a sua cidade.",
    })
    expect(mock.chamadasRpc.filter(({ nome }) => nome === "declare_locality_transfer")).toEqual([])
  })

  it.each([
    ["no passado", dia(-1)],
    ["acima do teto de 180 dias", dia(181)],
    ["em formato inválido", "05/12/2026"],
  ])("prazo %s é 400 sem chamar a RPC", async (_, prazo) => {
    const mock = autenticar()
    const resposta = await POST(pedido({ destino: RIO, prazo }))
    expect(resposta.status).toBe(400)
    expect(mock.chamadasRpc.filter(({ nome }) => nome === "declare_locality_transfer")).toEqual([])
  })

  it.each([{}, { destino: RIO }, { destino: 42, prazo: dia(30) }, "[]"])(
    "corpo inválido %s é 400",
    async (corpo) => {
      autenticar()
      expect((await POST(pedido(corpo))).status).toBe(400)
    },
  )

  it("segunda mudança (23505) responde 409 com a mensagem vigente de mudança em andamento", async () => {
    autenticar({ erroDoRpc: { code: "23505", message: "duplicate key value" } })
    const resposta = await POST(pedido({ destino: RIO, prazo: dia(30) }))
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toEqual({
      erro: "mudanca-em-andamento",
      mensagem: moveErrorMessage({ code: "23505" }),
    })
  })

  it("recusa de regra do banco (23514) é 400, sessão sem identidade (28000) é 401", async () => {
    autenticar({ erroDoRpc: { code: "23514", message: "destination not in catalog" } })
    const regra = await POST(pedido({ destino: RIO, prazo: dia(30) }))
    expect(regra.status).toBe(400)
    expect((await regra.json()).mensagem).toBe(moveErrorMessage({ code: "23514" }))

    autenticar({ erroDoRpc: { code: "28000", message: "unauthenticated" } })
    expect((await POST(pedido({ destino: RIO, prazo: dia(30) }))).status).toBe(401)
  })

  it("falha desconhecida do banco vira 503 sem eco do texto do Postgres", async () => {
    autenticar({ erroDoRpc: { code: "XX000", message: "segredo do banco" } })
    const resposta = await POST(pedido({ destino: RIO, prazo: dia(30) }))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo do banco")
  })

  it("sessão sem cidade atual é 409 sem-cidade, e não chama a RPC", async () => {
    const mock = autenticar({ semCidade: true })
    const resposta = await POST(pedido({ destino: RIO, prazo: dia(30) }))
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toEqual({ erro: "sem-cidade" })
    expect(mock.chamadasRpc.filter(({ nome }) => nome === "declare_locality_transfer")).toEqual([])
  })

  it("pessoa já em transferência: o banco recusa e a tela recebe a frase", async () => {
    autenticar({
      saida: {
        locality_id: RIO,
        leaving_at: dia(20),
        access: "active",
        localities: { city_name: "Rio de Janeiro", state_code: "RJ" },
      },
      erroDoRpc: { code: "23505", message: "duplicate key value" },
    })
    const resposta = await POST(pedido({ destino: RIO, prazo: dia(30) }))
    expect(resposta.status).toBe(409)
    expect((await resposta.json()).mensagem).toContain("mudança em andamento")
  })
})

describe("GET /api/app/voce/cidade", () => {
  it("resolve o id que o endereço trouxe", async () => {
    autenticar({
      cidadeDoLink: { id: RIO, city_name: "Rio de Janeiro", state_code: "RJ" },
    })
    const resposta = await GET(leitura(`?destino=${RIO}`))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      destino: { id: RIO, nome: "Rio de Janeiro", uf: "RJ" },
    })
  })

  it("id fora do catálogo é destino nulo, nunca cidade inventada", async () => {
    autenticar({ cidadeDoLink: null })
    expect(await (await GET(leitura("?destino=nao-existe"))).json()).toEqual({ destino: null })
  })

  it("sem sessão responde 401", async () => {
    expect((await GET(leitura(`?destino=${RIO}`))).status).toBe(401)
  })

  it("falha do catálogo é 503 sem eco", async () => {
    autenticar({ catalogoFora: true })
    const resposta = await GET(leitura(`?destino=${RIO}`))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo do banco")
  })
})

describe("OPTIONS /api/app/voce/cidade", () => {
  it("responde o preflight da origem do app", () => {
    expect(
      OPTIONS(new NextRequest(URL_DA_ROTA, { method: "OPTIONS", headers: { origin: ORIGEM } }))
        .status,
    ).toBe(204)
  })

  it("origem fora da lista não ganha preflight", () => {
    const resposta = OPTIONS(
      new NextRequest(URL_DA_ROTA, {
        method: "OPTIONS",
        headers: { origin: "https://fora.example" },
      }),
    )
    expect(resposta.status).toBe(403)
  })
})
