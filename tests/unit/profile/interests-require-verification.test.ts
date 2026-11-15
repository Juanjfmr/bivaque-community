import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// PORT-005, achado P2 da revisão independente: a leitura dos interesses que
// ficou no perfil não exigia verificação. A tela web saiu (RUN-163) e a porta
// passou a ser a rota do app; a admissão foi portada junto, porque quem lê e
// grava é o cliente de serviço e a sessão sozinha não é permissão.
//
// A regra é a mesma da web: verificação própria `verified` OU convite familiar
// aceito. O dependente familiar não tem verificação própria (D16) e era recusado
// pela guarda que exigia `verified`; a regra do familiar vem do banco
// (`has_verified_family_holder`), nunca do cliente. A cidade é a do vínculo
// `current`, não a do vínculo de saída.

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { GET, POST } from "web/app/api/app/voce/interesses/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { createServerClient } from "web/lib/supabase/server"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const criarCliente = vi.mocked(createServerClient)

const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }
const CIDADE = "00000000-0000-4000-8000-000000000001"
const GRUPO = "60000000-0000-4000-8000-000000000001"
const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/api/app/voce/interesses`

const LIST_RPCS = ["list_available_groups_for_interests", "list_user_group_interests"]

const estado = {
  chamadas: [] as Array<{ nome: string; argumentos: Record<string, unknown> }>,
  familiar: false,
  familiarFalha: false,
  status: null as string | null,
  statusFalha: false,
}

const mockVinculo = vi.fn()

function clienteDeServico() {
  const cadeia = {
    select: () => cadeia,
    eq: () => cadeia,
    order: () => cadeia,
    limit: () => ({ maybeSingle: mockVinculo }),
  }
  return {
    from: (tabela: string) => {
      if (tabela !== "locality_memberships") throw new Error(`tabela inesperada: ${tabela}`)
      return cadeia
    },
    rpc: (nome: string, argumentos: Record<string, unknown>) => {
      estado.chamadas.push({ nome, argumentos })
      if (nome === "read_verification_status") {
        return Promise.resolve({
          data: estado.statusFalha
            ? null
            : estado.status === null
              ? []
              : [{ status: estado.status }],
          error: estado.statusFalha ? { message: "boom" } : null,
        })
      }
      if (nome === "has_verified_family_holder") {
        return Promise.resolve({
          data: estado.familiarFalha ? null : estado.familiar,
          error: estado.familiarFalha ? { message: "boom" } : null,
        })
      }
      if (nome === "list_available_groups_for_interests") {
        return Promise.resolve({
          data: [{ id: GRUPO, name: "Trocas de Livros", already_member: false }],
          error: null,
        })
      }
      if (nome === "list_user_group_interests") return Promise.resolve({ data: [], error: null })
      if (nome === "record_user_group_interests")
        return Promise.resolve({ data: null, error: null })
      return Promise.reject(new Error(`rpc inesperada: ${nome}`))
    },
  }
}

function sessaoAutenticada() {
  return {
    estado: "autenticada",
    via: "cookie",
    usuario: PESSOA,
    cliente: {},
    cabecalhos: {},
  }
}

function leitura() {
  return new NextRequest(URL_DA_ROTA, { method: "GET", headers: { origin: ORIGEM } })
}

function escrita(grupos: string[] = [GRUPO]) {
  return new NextRequest(URL_DA_ROTA, {
    method: "POST",
    headers: {
      origin: ORIGEM,
      "x-bivaque-app": "bivaque-spa",
      "content-type": "application/json",
    },
    body: JSON.stringify({ grupos }),
  })
}

function nomesDasChamadas(): string[] {
  return estado.chamadas.map((chamada) => chamada.nome)
}

function gravacao() {
  return estado.chamadas.find((chamada) => chamada.nome === "record_user_group_interests")
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  estado.chamadas = []
  estado.familiar = false
  estado.familiarFalha = false
  estado.status = null
  estado.statusFalha = false
  mockVinculo.mockResolvedValue({
    data: { locality_id: CIDADE, localities: { city_name: "Manaus" } },
    error: null,
  })
  criarCliente.mockReturnValue(clienteDeServico() as never)
  resolver.mockResolvedValue(sessaoAutenticada() as never)
})

describe("interesses exigem admissão", () => {
  it.each([null, "pending", "temporary_error", "rejected"])(
    "sem verificação e sem familiar (situação %s), a lista nem é consultada",
    async (status) => {
      estado.status = status

      const resposta = await GET(leitura())
      expect(resposta.status).toBe(403)
      expect(await resposta.json()).toMatchObject({ erro: "nao-admitido" })
      for (const rpc of LIST_RPCS) expect(nomesDasChamadas()).not.toContain(rpc)
      expect(nomesDasChamadas()).toContain("has_verified_family_holder")
    },
  )

  it("quem está verificado vê os grupos da cidade, sem consultar o vínculo familiar", async () => {
    estado.status = "verified"

    const resposta = await GET(leitura())
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      grupos: [{ id: GRUPO, nome: "Trocas de Livros", jaMembro: false }],
      interesses: [],
    })
    for (const rpc of LIST_RPCS) expect(nomesDasChamadas()).toContain(rpc)
    // A verificação própria é a condição mais estreita que já existia para o
    // titular; o familiar só é consultado para quem não é verificado.
    expect(nomesDasChamadas()).not.toContain("has_verified_family_holder")
  })

  it("o familiar admitido consulta os grupos mesmo sem verificação própria", async () => {
    // O convite familiar é a única porta sem CPF (D16): não há linha em
    // verification_outcomes, e é o vínculo com o titular verificado que admite.
    estado.familiar = true

    const resposta = await GET(leitura())
    expect(resposta.status).toBe(200)
    expect(nomesDasChamadas()).toContain("read_verification_status")
    expect(nomesDasChamadas()).toContain("has_verified_family_holder")
    for (const rpc of LIST_RPCS) expect(nomesDasChamadas()).toContain(rpc)
  })

  it("falha ao ler a verificação não libera a lista", async () => {
    estado.statusFalha = true

    const resposta = await GET(leitura())
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "admissao-indisponivel" })
    expect(nomesDasChamadas()).toEqual(["read_verification_status"])
    for (const rpc of LIST_RPCS) expect(nomesDasChamadas()).not.toContain(rpc)
  })

  it("falha ao ler o vínculo familiar não libera a lista", async () => {
    // Não conseguir conferir o vínculo não é o mesmo que não ter vínculo.
    estado.status = "pending"
    estado.familiar = true
    estado.familiarFalha = true

    const resposta = await GET(leitura())
    expect(resposta.status).toBe(503)
    for (const rpc of LIST_RPCS) expect(nomesDasChamadas()).not.toContain(rpc)
    expect(gravacao()).toBeUndefined()
  })

  it("sem admissão, gravar interesses também é recusado", async () => {
    estado.status = "pending"

    const resposta = await POST(escrita())
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toMatchObject({ erro: "nao-admitido" })
    expect(nomesDasChamadas()).not.toContain("record_user_group_interests")
    expect(gravacao()).toBeUndefined()
  })

  it("verificado grava os interesses com a cidade do vínculo corrente", async () => {
    estado.status = "verified"

    const resposta = await POST(escrita([GRUPO]))
    expect(resposta.status).toBe(200)
    expect(gravacao()?.argumentos).toEqual({
      p_group_ids: [GRUPO],
      p_locality_id: CIDADE,
      p_user_id: PESSOA.id,
    })
  })

  it("o familiar admitido grava e limpa os interesses", async () => {
    estado.familiar = true

    await POST(escrita([GRUPO]))
    expect(gravacao()?.argumentos).toEqual({
      p_group_ids: [GRUPO],
      p_locality_id: CIDADE,
      p_user_id: PESSOA.id,
    })

    estado.chamadas = []
    await POST(escrita([]))
    expect(gravacao()?.argumentos).toEqual({
      p_group_ids: [],
      p_locality_id: CIDADE,
      p_user_id: PESSOA.id,
    })
  })
})
