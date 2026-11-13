import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  resolverSessaoDaRequisicao: vi.fn(),
  clienteDeServicoOuNulo: vi.fn(),
  lerCepDoCache: vi.fn(),
  gravarCepNoCache: vi.fn(),
  geocodificarCep: vi.fn(),
}))

vi.mock("web/lib/app-api/sessao-do-next", () => ({
  resolverSessaoDaRequisicao: mocks.resolverSessaoDaRequisicao,
}))

// Só a fábrica do cliente de serviço é substituída: `exigirSessao`,
// `conferirEscrita`, `lerCorpoJson` e `responder` continuam os de verdade, que é
// o que os casos de 401/403/400 exercitam.
vi.mock("web/lib/app-api/rota-do-app", async (importOriginal) => {
  const real = await importOriginal<typeof import("web/lib/app-api/rota-do-app")>()
  return { ...real, clienteDeServicoOuNulo: mocks.clienteDeServicoOuNulo }
})

vi.mock("web/lib/geo/cache", () => ({
  lerCepDoCache: mocks.lerCepDoCache,
  gravarCepNoCache: mocks.gravarCepNoCache,
}))

vi.mock("web/lib/geo/geocodificador", () => ({
  geocodificarCep: mocks.geocodificarCep,
}))

import { PUT } from "web/app/api/app/voce/localizacao/route"

const USER = "20000000-0000-4000-8000-000000000001"
const OUTRO = "30000000-0000-4000-8000-00000000001a"
const URL_DA_ROTA = "http://localhost:3000/api/app/voce/localizacao"

const CABECALHOS: Record<string, string> = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}

type Localizacao = { cep: string | null; definida: boolean; comCoordenada?: boolean }

function clienteDaSessao(localizacao: Localizacao) {
  return {
    rpc: vi.fn(async (funcao: string) => {
      if (funcao !== "get_my_profile_location") return { data: null, error: null }
      return {
        data: [
          {
            cep: localizacao.cep,
            definida: localizacao.definida,
            com_coordenada: localizacao.comCoordenada ?? localizacao.definida,
          },
        ],
        error: null,
      }
    }),
  }
}

function clienteDeServico(resposta: { error: { code: string } | null } = { error: null }) {
  const chamadas: { funcao: string; args: Record<string, unknown> }[] = []
  const client = {
    rpc: vi.fn(async (funcao: string, args: Record<string, unknown>) => {
      chamadas.push({ funcao, args })
      return { error: resposta.error }
    }),
  }
  return { client, chamadas }
}

function autenticar(
  opcoes: { via?: "cookie" | "bearer"; localizacao?: Localizacao } = {},
): ReturnType<typeof clienteDaSessao> {
  const cliente = clienteDaSessao(opcoes.localizacao ?? { cep: null, definida: false })
  mocks.resolverSessaoDaRequisicao.mockResolvedValue({
    estado: "autenticada",
    via: opcoes.via ?? "cookie",
    usuario: { id: USER },
    cliente: cliente as never,
    cabecalhos: {},
  })
  return cliente
}

function pedido(corpo: unknown, cabecalhos: Record<string, string> = CABECALHOS): NextRequest {
  return new NextRequest(URL_DA_ROTA, {
    method: "PUT",
    headers: cabecalhos,
    body: JSON.stringify(corpo),
  })
}

function semCabecalhoDoApp(): Record<string, string> {
  return { origin: "http://localhost:3000", "content-type": "application/json" }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.lerCepDoCache.mockResolvedValue(null)
  mocks.gravarCepNoCache.mockResolvedValue(undefined)
  mocks.geocodificarCep.mockResolvedValue({ estado: "nao-encontrado" })
})

describe("PUT /api/app/voce/localizacao", () => {
  it("recusa sem sessão", async () => {
    mocks.resolverSessaoDaRequisicao.mockResolvedValue({
      estado: "recusada",
      sessao: { motivo: "sem-sessao" },
    })

    const resposta = await PUT(pedido({ cep: "69000000" }))

    expect(resposta.status).toBe(401)
  })

  it("recusa origem fora da lista", async () => {
    autenticar()

    const resposta = await PUT(
      pedido({ cep: "69000000" }, { ...CABECALHOS, origin: "https://outro.invalid" }),
    )

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toMatchObject({ erro: "origem-recusada" })
  })

  it("recusa escrita por cookie sem o cabeçalho do app", async () => {
    autenticar()

    const resposta = await PUT(pedido({ cep: "69000000" }, semCabecalhoDoApp()))

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toMatchObject({ erro: "cabecalho-ausente" })
  })

  it("recusa corpo sem o campo cep", async () => {
    autenticar()

    const resposta = await PUT(pedido({}))

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toMatchObject({ erro: "corpo-invalido" })
  })

  it("recusa cep que não é texto nem nulo", async () => {
    autenticar()

    const resposta = await PUT(pedido({ cep: 69000000 }))

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toMatchObject({ erro: "corpo-invalido" })
  })

  it("recusa CEP que não tem oito dígitos", async () => {
    autenticar()

    const resposta = await PUT(pedido({ cep: "123" }))

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toMatchObject({ erro: "dados-invalidos" })
    expect(mocks.lerCepDoCache).not.toHaveBeenCalled()
  })

  it("responde 422 quando o CEP não existe", async () => {
    autenticar()
    mocks.clienteDeServicoOuNulo.mockReturnValue(clienteDeServico().client)

    const resposta = await PUT(pedido({ cep: "99999999" }))

    expect(resposta.status).toBe(422)
    expect(await resposta.json()).toMatchObject({ erro: "cep-nao-encontrado" })
    expect(mocks.geocodificarCep).toHaveBeenCalledWith("99999999")
    expect(mocks.gravarCepNoCache).not.toHaveBeenCalled()
  })

  it("responde 503 quando o geocodificador não está disponível", async () => {
    autenticar()
    mocks.clienteDeServicoOuNulo.mockReturnValue(clienteDeServico().client)
    mocks.geocodificarCep.mockResolvedValue({ estado: "indisponivel" })

    const resposta = await PUT(pedido({ cep: "69000000" }))

    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toMatchObject({ erro: "geocodificador-indisponivel" })
  })

  it("responde 503 sem abrir o cliente de serviço", async () => {
    autenticar()
    mocks.clienteDeServicoOuNulo.mockReturnValue(null)

    const resposta = await PUT(pedido({ cep: "69000000" }))

    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toMatchObject({ erro: "localizacao-indisponivel" })
    expect(mocks.lerCepDoCache).not.toHaveBeenCalled()
    expect(mocks.geocodificarCep).not.toHaveBeenCalled()
  })

  it("usa o cache e não chama o geocodificador quando o CEP já foi resolvido", async () => {
    const localizacaoFinal: Localizacao = { cep: "69000000", definida: true }
    autenticar({ localizacao: localizacaoFinal })
    const servico = clienteDeServico()
    mocks.clienteDeServicoOuNulo.mockReturnValue(servico.client)
    mocks.lerCepDoCache.mockResolvedValue({
      cep: "69000000",
      latitude: -3.119,
      longitude: -60.0217,
      fonte: "brasilapi",
    })

    const resposta = await PUT(pedido({ cep: "69000-000" }))

    expect(resposta.status).toBe(200)
    expect(mocks.geocodificarCep).not.toHaveBeenCalled()
    expect(servico.chamadas).toEqual([
      {
        funcao: "set_member_location",
        args: {
          p_user_id: USER,
          p_cep: "69000000",
          p_latitude: -3.119,
          p_longitude: -60.0217,
        },
      },
    ])
    expect(await resposta.json()).toEqual({
      localizacao: { cep: "69000-000", definida: true },
      distanciaDisponivel: true,
    })
  })

  it("geocodifica, grava o cache e devolve só o CEP e a marca de definida", async () => {
    autenticar({ localizacao: { cep: "69000000", definida: true } })
    const servico = clienteDeServico()
    mocks.clienteDeServicoOuNulo.mockReturnValue(servico.client)
    const coordenada = { latitude: -3.119, longitude: -60.0217, fonte: "google" }
    mocks.geocodificarCep.mockResolvedValue({ estado: "encontrado", coordenada })

    const resposta = await PUT(pedido({ cep: "69000000" }))

    expect(resposta.status).toBe(200)
    expect(mocks.gravarCepNoCache).toHaveBeenCalledWith(servico.client, "69000000", coordenada)
    expect(servico.chamadas[0]?.args).toMatchObject({
      p_user_id: USER,
      p_cep: "69000000",
      p_latitude: -3.119,
      p_longitude: -60.0217,
    })
    const corpo = await resposta.json()
    expect(corpo).toEqual({
      localizacao: { cep: "69000-000", definida: true },
      distanciaDisponivel: true,
    })
    expect(JSON.stringify(corpo)).not.toContain("latitude")
    expect(JSON.stringify(corpo)).not.toContain("longitude")
  })

  it("guarda o CEP conhecido sem coordenada e responde 200 sem posição", async () => {
    autenticar({
      localizacao: { cep: "69900000", definida: true, comCoordenada: false },
    })
    const servico = clienteDeServico()
    mocks.clienteDeServicoOuNulo.mockReturnValue(servico.client)
    mocks.geocodificarCep.mockResolvedValue({ estado: "sem-coordenada" })

    const resposta = await PUT(pedido({ cep: "69900-000" }))

    expect(resposta.status).toBe(200)
    // Sem posição: as duas coordenadas vão nulas, nunca zero nem inventadas.
    expect(servico.chamadas).toEqual([
      {
        funcao: "set_member_location",
        args: { p_user_id: USER, p_cep: "69900000", p_latitude: null, p_longitude: null },
      },
    ])
    expect(mocks.gravarCepNoCache, "CEP sem posição não entra no cache").not.toHaveBeenCalled()
    const corpo = await resposta.json()
    expect(corpo).toEqual({
      localizacao: { cep: "69900-000", definida: true },
      distanciaDisponivel: false,
    })
    expect(JSON.stringify(corpo)).not.toContain("latitude")
    expect(JSON.stringify(corpo)).not.toContain("longitude")
  })

  it("ignora user_id vindo do corpo e grava sempre na sessão", async () => {
    autenticar({ localizacao: { cep: "69000000", definida: true } })
    const servico = clienteDeServico()
    mocks.clienteDeServicoOuNulo.mockReturnValue(servico.client)
    mocks.lerCepDoCache.mockResolvedValue({
      cep: "69000000",
      latitude: -3.119,
      longitude: -60.0217,
      fonte: "brasilapi",
    })

    const resposta = await PUT(pedido({ cep: "69000000", user_id: OUTRO }))

    expect(resposta.status).toBe(200)
    expect(servico.chamadas[0]?.args["p_user_id"]).toBe(USER)
  })

  it("limpa as três colunas quando o CEP é nulo", async () => {
    autenticar({ localizacao: { cep: null, definida: false } })
    const servico = clienteDeServico()
    mocks.clienteDeServicoOuNulo.mockReturnValue(servico.client)

    const resposta = await PUT(pedido({ cep: null }))

    expect(resposta.status).toBe(200)
    expect(mocks.lerCepDoCache).not.toHaveBeenCalled()
    expect(mocks.geocodificarCep).not.toHaveBeenCalled()
    expect(servico.chamadas).toEqual([
      {
        funcao: "set_member_location",
        args: { p_user_id: USER, p_cep: null, p_latitude: null, p_longitude: null },
      },
    ])
    expect(await resposta.json()).toEqual({
      localizacao: { cep: null, definida: false },
      distanciaDisponivel: false,
    })
  })

  it("responde 404 quando a sessão não tem perfil", async () => {
    autenticar()
    mocks.clienteDeServicoOuNulo.mockReturnValue(
      clienteDeServico({ error: { code: "P0002" } }).client,
    )
    mocks.lerCepDoCache.mockResolvedValue({
      cep: "69000000",
      latitude: -3.119,
      longitude: -60.0217,
      fonte: "brasilapi",
    })

    const resposta = await PUT(pedido({ cep: "69000000" }))

    expect(resposta.status).toBe(404)
    expect(await resposta.json()).toMatchObject({ erro: "sem-perfil" })
  })

  it("responde 400 quando o banco recusa o valor", async () => {
    autenticar()
    mocks.clienteDeServicoOuNulo.mockReturnValue(
      clienteDeServico({ error: { code: "22023" } }).client,
    )
    mocks.lerCepDoCache.mockResolvedValue({
      cep: "69000000",
      latitude: -3.119,
      longitude: -60.0217,
      fonte: "brasilapi",
    })

    const resposta = await PUT(pedido({ cep: "69000000" }))

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toMatchObject({ erro: "dados-invalidos" })
  })

  it("vira 503 sem ecoar a mensagem do banco quando a escrita falha", async () => {
    autenticar()
    mocks.clienteDeServicoOuNulo.mockReturnValue(
      clienteDeServico({ error: { code: "XX000" } }).client,
    )
    mocks.lerCepDoCache.mockResolvedValue({
      cep: "69000000",
      latitude: -3.119,
      longitude: -60.0217,
      fonte: "brasilapi",
    })

    const resposta = await PUT(pedido({ cep: "69000000" }))

    expect(resposta.status).toBe(503)
    const corpo = await resposta.json()
    expect(corpo).toMatchObject({ erro: "localizacao-indisponivel" })
    expect(JSON.stringify(corpo)).not.toContain("segredo do banco")
  })

  it("aceita a escrita por bearer sem o cabeçalho do app", async () => {
    autenticar({ via: "bearer", localizacao: { cep: "69000000", definida: true } })
    const servico = clienteDeServico()
    mocks.clienteDeServicoOuNulo.mockReturnValue(servico.client)
    mocks.lerCepDoCache.mockResolvedValue({
      cep: "69000000",
      latitude: -3.119,
      longitude: -60.0217,
      fonte: "brasilapi",
    })

    const resposta = await PUT(pedido({ cep: "69000000" }, { "content-type": "application/json" }))

    expect(resposta.status).toBe(200)
  })
})
