import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// RUN-175 — o módulo único da localização do anúncio: cache-first, limitador só
// na chamada real, bairro derivado casado com `neighborhoods` e aproximado com
// piso de ~300 m.
vi.mock("server-only", () => ({}))

const cache = vi.hoisted(() => ({
  lerCepDoCache: vi.fn(),
  gravarCepNoCache: vi.fn(),
}))
vi.mock("web/lib/geo/cache", () => cache)

const geocodificador = vi.hoisted(() => ({ geocodificarCep: vi.fn() }))
vi.mock("web/lib/geo/geocodificador", () => geocodificador)

const limite = vi.hoisted(() => ({ consumirConsulta: vi.fn() }))
vi.mock("web/lib/geo/limite", () => limite)

import {
  aproximarCoordenada,
  DESLOCAMENTO_APROXIMADO,
  lerEscolha,
  localizarAnuncio,
  PASSO_DA_GRADE,
} from "web/lib/geo/anuncio"

const CIDADE = "00000000-0000-4000-8000-0000000000aa"
const PESSOA = "10000000-0000-4000-8000-000000000010"

/** Cliente mínimo: só a consulta de bairros do módulo. */
function clienteComBairros(bairros: string[]) {
  const limiteDoIl = vi.fn(async () => ({
    data: bairros.map((name) => ({ name })),
    error: null,
  }))
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ ilike: vi.fn(() => ({ limit: limiteDoIl })) })) })),
    })),
  } as never
}

function pedido(extra: Partial<Parameters<typeof localizarAnuncio>[0]> = {}) {
  return {
    cliente: clienteComBairros([]),
    pessoa: PESSOA,
    cepBruto: "69000-000",
    escolha: "exata" as const,
    forcarAproximada: false,
    cidadeId: CIDADE,
    ...extra,
  }
}

/** Distância em metros entre dois pontos (haversine, a mesma do banco). */
function metros(latA: number, lngA: number, latB: number, lngB: number): number {
  const raio = 6371008.8
  const rad = (grau: number) => (grau * Math.PI) / 180
  const dLat = rad(latB - latA)
  const dLng = rad(lngB - lngA)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(latA)) * Math.cos(rad(latB)) * Math.sin(dLng / 2) ** 2
  return 2 * raio * Math.asin(Math.min(1, Math.sqrt(a)))
}

beforeEach(() => {
  vi.clearAllMocks()
  cache.lerCepDoCache.mockResolvedValue(null)
  cache.gravarCepNoCache.mockResolvedValue(undefined)
  limite.consumirConsulta.mockReturnValue({ liberado: true })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("aproximarCoordenada", () => {
  it.each([
    [-3.10194, -60.025],
    [-3.119002, -60.021799],
    [0.0004, 0.0004],
    [-23.55052, -46.633308],
  ])("o ponto publicado fica entre 300 e 560 m do real (%s, %s)", (lat, lng) => {
    const aproximada = aproximarCoordenada(lat, lng)
    const distancia = metros(lat, lng, aproximada.latitude, aproximada.longitude)
    // Piso do ADR: nunca menos de 300 m. Teto: os dois eixos deslocam no máximo
    // 389 m cada, então a diagonal fica em ~550 m no equador (o ADR diz "cerca
    // de 300 a 500 m"; a diagonal é o limite geométrico honesto).
    expect(distancia).toBeGreaterThanOrEqual(300)
    expect(distancia).toBeLessThanOrEqual(560)
  })

  it("nunca devolve o ponto original", () => {
    const aproximada = aproximarCoordenada(-3.1, -60)
    expect(aproximada).not.toEqual({ latitude: -3.1, longitude: -60 })
  })

  // O invariante que o banco cobra (CHECK listings_localizacao_aproximada_na_grade):
  // `(coordenada + DESLOCAMENTO) / PASSO` inteiro. É isto que impede gravar a
  // coordenada crua do provedor alegando "aproximada".
  it.each([
    [-3.10194, -60.025],
    [-23.55052, -46.633308],
    [0.0004, 0.0004],
    [-3.119002, -60.021799],
  ])("o que o servidor grava cai na grade do CHECK (%s, %s)", (lat, lng) => {
    const aproximada = aproximarCoordenada(lat, lng)
    const naGrade = (valor: number) => {
      const passos = (valor + DESLOCAMENTO_APROXIMADO) / PASSO_DA_GRADE
      return Math.abs(passos - Math.round(passos)) < 1e-6
    }
    expect(naGrade(aproximada.latitude)).toBe(true)
    expect(naGrade(aproximada.longitude)).toBe(true)
  })

  it("a coordenada crua do provedor NÃO cai na grade (o CHECK recusa)", () => {
    const naGrade = (valor: number) => {
      const passos = (valor + DESLOCAMENTO_APROXIMADO) / PASSO_DA_GRADE
      return Math.abs(passos - Math.round(passos)) < 1e-6
    }
    // O que a BrasilAPI/Google devolvem: 6 a 7 casas.
    expect(naGrade(-3.10194)).toBe(false)
    expect(naGrade(-23.5505201)).toBe(false)
    expect(naGrade(-60.0251234)).toBe(false)
  })

  it("limite conhecido: valor já múltiplo de 0,001 passa — é a precisão publicada", () => {
    const naGrade = (valor: number) => {
      const passos = (valor + DESLOCAMENTO_APROXIMADO) / PASSO_DA_GRADE
      return Math.abs(passos - Math.round(passos)) < 1e-6
    }
    // -60,025 é múltiplo de 0,001, então a grade não distingue (≈111 m). O CHECK
    // garante o teto de precisão, não a distância: quem escreve nó de grade passa.
    expect(naGrade(-60.025)).toBe(true)
  })
})

describe("localizarAnuncio", () => {
  it("CEP inválido não consulta cache nem provedor", async () => {
    const resultado = await localizarAnuncio(pedido({ cepBruto: "123" }))

    expect(resultado).toEqual({ ok: false, erro: "cep-invalido" })
    expect(cache.lerCepDoCache).not.toHaveBeenCalled()
    expect(geocodificador.geocodificarCep).not.toHaveBeenCalled()
  })

  it("cache hit não chama o provedor nem consome o limitador", async () => {
    cache.lerCepDoCache.mockResolvedValue({
      cep: "69000000",
      latitude: -3.10194,
      longitude: -60.025,
      fonte: "brasilapi",
    })

    const resultado = await localizarAnuncio(pedido())

    expect(resultado).toMatchObject({
      ok: true,
      localizacao: {
        cep: "69000000",
        latitude: -3.10194,
        longitude: -60.025,
        localizacaoPublica: "exata",
      },
    })
    expect(geocodificador.geocodificarCep).not.toHaveBeenCalled()
    expect(limite.consumirConsulta).not.toHaveBeenCalled()
  })

  it("cache miss geocodifica, passa pelo limitador e grava o cache", async () => {
    geocodificador.geocodificarCep.mockResolvedValue({
      estado: "encontrado",
      coordenada: { latitude: -3.10194, longitude: -60.025, fonte: "brasilapi" },
      endereco: { cidade: "Manaus", bairro: "Flores" },
    })
    const alvo = pedido({ cliente: clienteComBairros(["Flores"]) })

    const resultado = await localizarAnuncio(alvo)

    expect(limite.consumirConsulta).toHaveBeenCalledWith(PESSOA)
    expect(cache.gravarCepNoCache).toHaveBeenCalledWith(alvo.cliente, "69000000", {
      latitude: -3.10194,
      longitude: -60.025,
      fonte: "brasilapi",
    })
    expect(resultado).toMatchObject({
      ok: true,
      localizacao: { bairroDerivado: "Flores", localizacaoPublica: "exata" },
    })
  })

  it("limitador estourado é 429 honesto, sem chamar o provedor", async () => {
    limite.consumirConsulta.mockReturnValue({ liberado: false, esperarMs: 120_000 })

    const resultado = await localizarAnuncio(pedido())

    expect(resultado).toEqual({ ok: false, erro: "limite-de-consultas", esperarMs: 120_000 })
    expect(geocodificador.geocodificarCep).not.toHaveBeenCalled()
  })

  it("CEP conhecido sem coordenada é sucesso parcial: aproximada, sem posição", async () => {
    geocodificador.geocodificarCep.mockResolvedValue({
      estado: "sem-coordenada",
      endereco: { cidade: "Manaus", bairro: "Flores" },
    })

    const resultado = await localizarAnuncio(pedido({ cliente: clienteComBairros(["Flores"]) }))

    expect(resultado).toEqual({
      ok: true,
      localizacao: {
        cep: "69000000",
        latitude: null,
        longitude: null,
        localizacaoPublica: "aproximada",
        bairroDerivado: "Flores",
      },
    })
    // Sem posição não há o que guardar no cache de coordenadas.
    expect(cache.gravarCepNoCache).not.toHaveBeenCalled()
  })

  it("escolha aproximada arredonda no servidor antes de devolver", async () => {
    cache.lerCepDoCache.mockResolvedValue({
      cep: "69000000",
      latitude: -3.10194,
      longitude: -60.025,
      fonte: "brasilapi",
    })

    const resultado = await localizarAnuncio(pedido({ escolha: "aproximada" }))

    expect(resultado).toMatchObject({
      ok: true,
      localizacao: { localizacaoPublica: "aproximada" },
    })
    if (!resultado.ok) throw new Error("esperava sucesso")
    const distancia = metros(
      -3.10194,
      -60.025,
      resultado.localizacao.latitude ?? 0,
      resultado.localizacao.longitude ?? 0,
    )
    expect(distancia).toBeGreaterThanOrEqual(300)
  })

  it("desapego força aproximada mesmo quando o corpo pede exata", async () => {
    cache.lerCepDoCache.mockResolvedValue({
      cep: "69000000",
      latitude: -3.10194,
      longitude: -60.025,
      fonte: "brasilapi",
    })

    const resultado = await localizarAnuncio(pedido({ escolha: "exata", forcarAproximada: true }))

    expect(resultado).toMatchObject({
      ok: true,
      localizacao: { localizacaoPublica: "aproximada" },
    })
  })

  it("bairro do provedor é gravado na grafia de neighborhoods", async () => {
    geocodificador.geocodificarCep.mockResolvedValue({
      estado: "encontrado",
      coordenada: { latitude: -3.1, longitude: -60, fonte: "brasilapi" },
      endereco: { cidade: "Manaus", bairro: "SAO JORGE" },
    })

    const resultado = await localizarAnuncio(pedido({ cliente: clienteComBairros(["São Jorge"]) }))

    expect(resultado).toMatchObject({
      ok: true,
      localizacao: { bairroDerivado: "São Jorge" },
    })
  })

  it("bairro fora do catálogo não é inventado", async () => {
    geocodificador.geocodificarCep.mockResolvedValue({
      estado: "encontrado",
      coordenada: { latitude: -3.1, longitude: -60, fonte: "brasilapi" },
      endereco: { cidade: "Manaus", bairro: "Bairro Que Não Existe" },
    })

    const resultado = await localizarAnuncio(pedido({ cliente: clienteComBairros(["Flores"]) }))

    expect(resultado).toMatchObject({ ok: true, localizacao: { bairroDerivado: null } })
  })

  it.each([
    ["nao-encontrado", { ok: false, erro: "cep-nao-encontrado" }],
    ["indisponivel", { ok: false, erro: "geocodificador-indisponivel" }],
  ])("provedor em %s vira a recusa certa da rota", async (estado, esperado) => {
    geocodificador.geocodificarCep.mockResolvedValue({ estado })

    const resultado = await localizarAnuncio(pedido())

    expect(resultado).toEqual(esperado)
  })
})

describe("lerEscolha", () => {
  it("ausente é aproximada (o padrão registrado)", () => {
    expect(lerEscolha(undefined)).toBe("aproximada")
  })

  it("valor fora do vocabulário é recusa", () => {
    expect(lerEscolha("exato")).toBeNull()
    expect(lerEscolha(1)).toBeNull()
  })
})
