import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import {
  type AlertaDeImovel,
  apagarAlerta,
  criarAlerta,
  lerAlertas,
  resumoDoAlerta,
  salvarAlerta,
  situacaoDoAlerta,
} from "@/lib/dados/alertas"
import { moeda } from "@/lib/formato"

/**
 * A porta dos alertas de imóvel (RUN-169): caminho, método, corpo e tradução.
 * Resposta fora do contrato falha alto — lista vazia só quando o servidor diz
 * que está vazia.
 */

function responder(corpo: unknown, status = 200) {
  const buscar = vi.fn(async () => new Response(JSON.stringify(corpo), { status }))
  vi.stubGlobal("fetch", buscar)
  return buscar
}

function chamada(buscar: ReturnType<typeof responder>) {
  const [caminho, init] = buscar.mock.calls[0] as unknown as [string, RequestInit]
  return { caminho, init }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const ALERTA = {
  id: "c0000000-0000-4000-8000-000000000001",
  nome: "Apartamento no Centro",
  bairro: "Centro",
  tipoNegocio: "rent",
  valorMaxCents: 250000,
  quartos: 2,
  ativo: true,
  criadoEm: "2026-11-10T12:00:00.000Z",
  busca: { valor_max: 2500, quartos: 2 },
}

const CRITERIOS = {
  nome: "Apartamento no Centro",
  bairro: "Centro",
  tipoNegocio: "rent" as const,
  valorMaxCents: 250000,
  quartos: 2,
  ativo: true,
}

describe("lista de alertas", () => {
  it("traduz o alerta e guarda a busca que a tela usa", async () => {
    const buscar = responder({ alertas: [ALERTA] })
    const lista = await lerAlertas()
    expect(chamada(buscar).caminho).toBe("/api/app/imoveis/alertas")
    expect(lista).toHaveLength(1)
    expect(lista[0]).toMatchObject({ nome: "Apartamento no Centro", ativo: true })
    expect(lista[0]?.busca).toEqual({ valor_max: 2500, quartos: 2 })
  })

  it("o wire antigo, com tudo em string, continua aceito", async () => {
    // Links/rows gravados antes do fix do número: o parser dos dois formatos
    // evita que uma resposta antiga quebre a tela (a tela só repassa o search).
    responder({ alertas: [{ ...ALERTA, busca: { valor_max: "2500", quartos: "2" } }] })
    const lista = await lerAlertas()
    expect(lista[0]?.busca).toEqual({ valor_max: "2500", quartos: "2" })
  })

  it("lista vazia é resposta legítima", async () => {
    responder({ alertas: [] })
    await expect(lerAlertas()).resolves.toEqual([])
  })

  it("alerta sem busca é falha de formato, nunca filtro silencioso", async () => {
    const { busca: _descartada, ...semBusca } = ALERTA
    responder({ alertas: [semBusca] })
    await expect(lerAlertas()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("critério que não é o vocabulário do banco falha alto", async () => {
    responder({ alertas: [{ ...ALERTA, tipoNegocio: "troca" }] })
    await expect(lerAlertas()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("banco fora vira falha de indisponível, não lista vazia", async () => {
    responder({ erro: "leitura-indisponivel" }, 503)
    await expect(lerAlertas()).rejects.toMatchObject({ codigo: "indisponivel" })
  })
})

describe("criar e editar alerta", () => {
  it("cria pelo POST e devolve o alerta gravado", async () => {
    const buscar = responder({ alerta: ALERTA }, 201)
    const gravado = await criarAlerta(CRITERIOS)
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/imoveis/alertas")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual(CRITERIOS)
    expect(gravado.id).toBe(ALERTA.id)
  })

  it("edita pelo PATCH no id e devolve a linha gravada", async () => {
    const pausado = { ...ALERTA, ativo: false }
    const buscar = responder({ alerta: pausado })
    const gravado = await salvarAlerta(ALERTA.id, { ...CRITERIOS, ativo: false })
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe(`/api/app/imoveis/alertas/${ALERTA.id}`)
    expect(init.method).toBe("PATCH")
    expect(gravado.ativo).toBe(false)
  })

  it("alerta de outra pessoa é 404 com o motivo do servidor", async () => {
    responder({ erro: "alerta-nao-encontrado" }, 404)
    await expect(salvarAlerta(ALERTA.id, CRITERIOS)).rejects.toMatchObject({
      status: 404,
      motivoDoServidor: "alerta-nao-encontrado",
    })
  })
})

describe("apagar alerta", () => {
  it("apaga pelo DELETE no id", async () => {
    const buscar = responder({ removido: true })
    await apagarAlerta(ALERTA.id)
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe(`/api/app/imoveis/alertas/${ALERTA.id}`)
    expect(init.method).toBe("DELETE")
  })

  it("resposta sem confirmação é falha, nunca exclusão silenciosa", async () => {
    responder({ removido: false })
    await expect(apagarAlerta(ALERTA.id)).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("resumo e situação do alerta", () => {
  const alerta = ALERTA as unknown as AlertaDeImovel

  it("junta negócio, bairro, teto e quartos", () => {
    // `moeda` usa o espaço do Intl (NBSP depois de R$): a expectativa vem da
    // mesma função para não comparar dois espaços diferentes.
    expect(resumoDoAlerta(alerta)).toBe(`Aluguel · Centro · Até ${moeda(2500)} · 2+ quartos`)
  })

  it("sem critério diz que cobre todos os imóveis", () => {
    expect(
      resumoDoAlerta({
        ...alerta,
        tipoNegocio: null,
        bairro: null,
        valorMaxCents: null,
        quartos: null,
      }),
    ).toBe("Todos os imóveis")
  })

  it("situação diz se está ativo e quando foi criado", () => {
    expect(situacaoDoAlerta(alerta)).toContain("Ativo")
    expect(situacaoDoAlerta({ ...alerta, ativo: false })).toContain("Pausado")
  })
})
