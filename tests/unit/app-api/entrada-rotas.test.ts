import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// As quatro rotas do meio do onboarding no app: aceite, verificação, CPF e
// provisionamento. O teste troca a sessão, o cliente de serviço e as funções de
// domínio, e prova as regras: CSRF da escrita, aceite antes do CPF, verificação
// antes do provisionamento, e o CPF nunca saindo do servidor.

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))
vi.mock("web/lib/onboarding/verifyAndProvision", () => ({
  verifyEligibility: vi.fn(),
  provisionMember: vi.fn(),
}))

import { POST as ACEITAR } from "web/app/api/app/entry/consent/route"
import { POST as CONSULTAR_CPF } from "web/app/api/app/entry/cpf/route"
import { POST as PROVISIONAR } from "web/app/api/app/entry/provision/route"
import { GET as VERIFICACAO } from "web/app/api/app/entry/verification/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { provisionMember, verifyEligibility } from "web/lib/onboarding/verifyAndProvision"
import { createServerClient } from "web/lib/supabase/server"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const criarCliente = vi.mocked(createServerClient)
const verificarElegibilidade = vi.mocked(verifyEligibility)
const provisionar = vi.mocked(provisionMember)

const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }
const ORIGEM = "http://localhost:3000"
const CABECALHO = { "x-bivaque-app": "bivaque-spa" }

const mockRpc = vi.fn()
const mockDeleteEq = vi.fn()
const mockMaybeSingleLocalidade = vi.fn()
const mockMaybeSingleCidade = vi.fn()

function clienteDeServico() {
  return {
    rpc: mockRpc,
    from: (tabela: string) => {
      if (tabela === "entry_progress") {
        return { delete: () => ({ eq: mockDeleteEq }) }
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: mockMaybeSingleCidade,
            limit: () => ({ maybeSingle: mockMaybeSingleLocalidade }),
          }),
        }),
      }
    },
  }
}

function requerer(caminho: string, corpo?: unknown) {
  return new NextRequest(`${ORIGEM}/app/api/app/entry/${caminho}`, {
    method: corpo === undefined ? "GET" : "POST",
    headers: { origin: ORIGEM, ...CABECALHO, "content-type": "application/json" },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  })
}

function sessaoAutenticada() {
  return {
    estado: "autenticada",
    via: "cookie",
    usuario: PESSOA,
    cliente: clienteDeServico(),
    cabecalhos: {},
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  resolver.mockResolvedValue(sessaoAutenticada() as never)
  criarCliente.mockReturnValue(clienteDeServico() as never)
  mockRpc.mockImplementation(async (nome: string) => {
    if (nome === "has_accepted_consent") return { data: true, error: null }
    if (nome === "read_verification_status") {
      return {
        data: [{ status: "verified", checked_at: null, updated_at: null }],
        error: null,
      }
    }
    return { data: null, error: null }
  })
  mockDeleteEq.mockResolvedValue({ error: null })
  mockMaybeSingleLocalidade.mockResolvedValue({ data: { locality_id: "x" }, error: null })
  mockMaybeSingleCidade.mockResolvedValue({
    data: { id: "00000000-0000-4000-8000-000000000001" },
    error: null,
  })
  verificarElegibilidade.mockResolvedValue({ outcome: { status: "verified" } } as never)
  provisionar.mockResolvedValue({ localityMember: true })
})

function semSessao() {
  resolver.mockResolvedValue({
    estado: "recusada",
    sessao: { estado: "recusada", motivo: "sem-credencial" },
  } as never)
}

function semCabecalho() {
  return new NextRequest(`${ORIGEM}/app/api/app/entry/consent`, {
    method: "POST",
    headers: { origin: ORIGEM },
  })
}

describe("POST /api/app/entry/consent", () => {
  it("sem sessão responde 401", async () => {
    semSessao()
    expect((await ACEITAR(requerer("consent"))).status).toBe(401)
  })

  it("escrita por cookie sem o cabeçalho do app é recusada", async () => {
    expect((await ACEITAR(semCabecalho())).status).toBe(403)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("grava o aceite do dono da sessão com as versões do contrato", async () => {
    const resposta = await ACEITAR(requerer("consent"))
    expect(resposta.status).toBe(200)
    const corpo = (await resposta.json()) as { aceito: boolean; consent_version: number }
    expect(corpo.aceito).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith(
      "record_consent_acceptance",
      expect.objectContaining({ p_user_id: PESSOA.id }),
    )
  })

  it("falha do RPC vira 503", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "db offline" } })
    expect((await ACEITAR(requerer("consent"))).status).toBe(503)
  })
})

describe("GET /api/app/entry/verification", () => {
  it("sem sessão responde 401", async () => {
    semSessao()
    expect((await VERIFICACAO(requerer("verification"))).status).toBe(401)
  })

  it("devolve o status cru e se a pessoa já é membro da cidade", async () => {
    const resposta = await VERIFICACAO(requerer("verification"))
    expect(await resposta.json()).toEqual({
      autenticado: true,
      status: "verified",
      checkedAt: null,
      updatedAt: null,
      membroDaCidade: true,
    })
  })

  it("sem resultado de verificação devolve status nulo", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockMaybeSingleLocalidade.mockResolvedValue({ data: null, error: null })
    const corpo = (await (await VERIFICACAO(requerer("verification"))).json()) as {
      status: string | null
      membroDaCidade: boolean
    }
    expect(corpo.status).toBeNull()
    expect(corpo.membroDaCidade).toBe(false)
  })

  it("falha de leitura vira 503", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "db offline" } })
    expect((await VERIFICACAO(requerer("verification"))).status).toBe(503)
  })
})

describe("POST /api/app/entry/cpf", () => {
  const CPF_VALIDO = "52998224725"

  it("exige aceite antes de consultar o CPF", async () => {
    mockRpc.mockImplementation(async () => ({ data: false, error: null }))
    const resposta = await CONSULTAR_CPF(requerer("cpf", { cpf: CPF_VALIDO }))
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "aceite-pendente" })
    expect(verificarElegibilidade).not.toHaveBeenCalled()
  })

  it("CPF inválido é recusado antes de qualquer consulta", async () => {
    const resposta = await CONSULTAR_CPF(requerer("cpf", { cpf: "123" }))
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "cpf-invalido" })
    expect(verificarElegibilidade).not.toHaveBeenCalled()
  })

  it("consulta o Portal e devolve o resultado sem motivo técnico", async () => {
    verificarElegibilidade.mockResolvedValue({
      outcome: { status: "temporary_error", errorCode: "TRANSIENT", reason: "detalhe interno" },
    } as never)
    const resposta = await CONSULTAR_CPF(requerer("cpf", { cpf: CPF_VALIDO }))
    expect(resposta.status).toBe(200)
    const corpo = (await resposta.json()) as { outcome: Record<string, unknown> }
    expect(corpo.outcome["status"]).toBe("temporary_error")
    expect(corpo.outcome["reason"]).toBeUndefined()
    expect(verificarElegibilidade).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: PESSOA.id, cpf: CPF_VALIDO }),
    )
  })

  it("falha da consulta vira 503", async () => {
    verificarElegibilidade.mockRejectedValue(new Error("portal fora"))
    expect((await CONSULTAR_CPF(requerer("cpf", { cpf: CPF_VALIDO }))).status).toBe(503)
  })
})

describe("POST /api/app/entry/provision", () => {
  const CORPO = {
    ibge_code: "1302603",
    display_name: "Ana Souza",
    moment: "resident",
  }

  it("sem verificação confirmada não provisiona", async () => {
    mockRpc.mockImplementation(async (nome: string) => {
      if (nome === "has_accepted_consent") return { data: true, error: null }
      return { data: [{ status: "pending" }], error: null }
    })
    const resposta = await PROVISIONAR(requerer("provision", CORPO))
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "verificacao-pendente" })
    expect(provisionar).not.toHaveBeenCalled()
  })

  it("cidade fora do catálogo é 400, sem eco de banco", async () => {
    mockMaybeSingleCidade.mockResolvedValue({ data: null, error: null })
    const resposta = await PROVISIONAR(requerer("provision", CORPO))
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "cidade-desconhecida" })
    expect(provisionar).not.toHaveBeenCalled()
  })

  it("provisiona com o id da sessão e apaga o rascunho ao concluir", async () => {
    const resposta = await PROVISIONAR(requerer("provision", CORPO))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ localityMember: true })
    expect(provisionar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: PESSOA.id,
        displayName: "Ana Souza",
        localityId: "00000000-0000-4000-8000-000000000001",
      }),
    )
    expect(mockDeleteEq).toHaveBeenCalledWith("user_id", PESSOA.id)
  })

  it("falha do provisionamento vira 503", async () => {
    provisionar.mockRejectedValue(new Error("transaction failed"))
    expect((await PROVISIONAR(requerer("provision", CORPO))).status).toBe(503)
  })
})
