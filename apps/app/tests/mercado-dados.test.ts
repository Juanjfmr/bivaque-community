import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import { abrirInteresse, buscarAnuncio, lerMercado } from "@/lib/dados/mercado"

/**
 * A porta do Mercado (LAN-F06), espelhando `eventos-dados.test.ts`: caminho,
 * método, corpo e tradução da resposta. O que mais importa aqui é o que quebra
 * silencioso — resposta fora do contrato falha alto, nunca vira lista vazia, e
 * campo sem dado continua null em vez de zero inventado.
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

const ANUNCIO = {
  id: "a1",
  tipo: "property",
  titulo: "Apartamento 3 quartos",
  descricao: "98 m², 2 vagas, área de lazer completa.",
  precoCents: 320_000,
  deal: "rent",
  bairro: "Ponta Negra",
  cidade: "Manaus",
  status: "active",
  condicao: null,
  categoria: null,
  quartos: 3,
  tipoImovel: "apartment",
  areaM2: 98,
  condoFeeCents: 72_000,
  foto: "https://exemplo.invalid/assinada",
  criadoEm: "2026-11-01T12:00:00.000Z",
}

describe("lista do Mercado", () => {
  it("traduz o shape real e pergunta pela aba", async () => {
    const buscar = responder({
      anuncios: [ANUNCIO],
      proximo: "2026-11-01T12:00:00.000Z|a1",
      cidade: "Manaus",
    })
    const lista = await lerMercado({ tipo: "property" })
    expect(chamada(buscar).caminho).toBe("/api/app/mercado?tipo=property")
    expect(lista.anuncios[0]).toMatchObject({
      id: "a1",
      tipo: "property",
      titulo: "Apartamento 3 quartos",
      precoCents: 320_000,
      deal: "rent",
      quartos: 3,
      foto: "https://exemplo.invalid/assinada",
    })
    expect(lista.proximo).toBe("2026-11-01T12:00:00.000Z|a1")
    // A cidade vem da rota (sessão), não da demonstração.
    expect(lista.cidade).toBe("Manaus")
  })

  it("monta ordem e cursor na query string", async () => {
    const buscar = responder({ anuncios: [], proximo: null, cidade: null })
    await lerMercado({ tipo: "item", ordem: "price_asc", depois: "2026-11-01T12:00:00.000Z|a1" })
    expect(chamada(buscar).caminho).toBe(
      "/api/app/mercado?tipo=item&ordem=price_asc&depois=2026-11-01T12%3A00%3A00.000Z%7Ca1",
    )
  })

  it("só monta os filtros de imóvel quando o tipo é property", async () => {
    const comImovel = responder({ anuncios: [], proximo: null, cidade: null })
    await lerMercado({ tipo: "property", quartos: 3, valorMax: 4_000, tipoImovel: "apartment" })
    expect(chamada(comImovel).caminho).toBe(
      "/api/app/mercado?tipo=property&quartos=3&valor_max=4000&tipo_imovel=apartment",
    )

    const comItem = responder({ anuncios: [], proximo: null, cidade: null })
    await lerMercado({ tipo: "item", quartos: 3, valorMax: 4_000, tipoImovel: "apartment" })
    // Filtro de imóvel com desapego seria 400 no servidor: não vai na query.
    expect(chamada(comItem).caminho).toBe("/api/app/mercado?tipo=item")
  })

  it("mantém os nulos do servidor sem virar zero", async () => {
    responder({
      anuncios: [{ ...ANUNCIO, tipo: "item", descricao: null, foto: null, quartos: null }],
      proximo: null,
      cidade: null,
    })
    const lista = await lerMercado({ tipo: "item" })
    const anuncio = lista.anuncios[0]
    expect(anuncio?.descricao).toBeNull()
    expect(anuncio?.foto).toBeNull()
    expect(anuncio?.quartos).toBeNull()
    expect(lista.cidade).toBeNull()
    expect(lista.proximo).toBeNull()
  })

  it("recusa corpo fora do contrato em vez de fingir lista vazia", async () => {
    responder({ anunciosDaCidade: [] })
    await expect(lerMercado({ tipo: "item" })).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it.each([
    ["sem id", { ...ANUNCIO, id: "" }],
    ["sem título", { ...ANUNCIO, titulo: null }],
    ["com tipo desconhecido", { ...ANUNCIO, tipo: "servico" }],
    ["com preço quebrado", { ...ANUNCIO, precoCents: "3200" }],
  ])("recusa item %s em vez de silenciar", async (_motivo, linha) => {
    responder({ anuncios: [linha], proximo: null, cidade: "Manaus" })
    await expect(lerMercado({ tipo: "property" })).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("detalhe do anúncio", () => {
  it("lê dono, fotos e os campos de mercado", async () => {
    const buscar = responder({
      anuncio: {
        ...ANUNCIO,
        endereco: "Rua X, 100",
        donoNome: "Ricardo A.",
        fotos: ["https://exemplo.invalid/1"],
        meu: false,
        salvo: true,
      },
    })
    const anuncio = await buscarAnuncio("a1")
    expect(chamada(buscar).caminho).toBe("/api/app/mercado/a1")
    expect(anuncio.donoNome).toBe("Ricardo A.")
    expect(anuncio.fotos).toEqual(["https://exemplo.invalid/1"])
    expect(anuncio.salvo).toBe(true)
    expect(anuncio.meu).toBe(false)
    // O endereço chega, mas é dado que a tela nunca mostra.
    expect(anuncio.endereco).toBe("Rua X, 100")
  })

  it("dono sem nome é null, não 'Membro' inventado na porta", async () => {
    responder({
      anuncio: { ...ANUNCIO, donoNome: null, fotos: [], endereco: null },
    })
    const anuncio = await buscarAnuncio("a1")
    expect(anuncio.donoNome).toBeNull()
    expect(anuncio.fotos).toEqual([])
  })

  it("fotos quebrado é falha de contrato", async () => {
    responder({ anuncio: { ...ANUNCIO, fotos: [42] } })
    await expect(buscarAnuncio("a1")).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("interesse", () => {
  it("abre pelo POST com corpo vazio e devolve a conversa", async () => {
    const buscar = responder({ conversaId: "c1" })
    await expect(abrirInteresse("a1")).resolves.toBe("c1")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/mercado/a1/interesse")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual({})
  })

  it("sessão vencida chega como código de sessão", async () => {
    responder({ erro: "sem-sessao" }, 401)
    await expect(abrirInteresse("a1")).rejects.toMatchObject({ codigo: "sem-sessao" })
  })

  it("servidor fora chega como indisponibilidade, com a mensagem dele", async () => {
    responder({ erro: "indisponivel", mensagem: "O Mercado está fora no momento." }, 503)
    const falha = (await abrirInteresse("a1").catch((erro: unknown) => erro)) as FalhaDaApi
    expect(falha.codigo).toBe("indisponivel")
    expect(falha.mensagem).toBe("O Mercado está fora no momento.")
  })
})

describe("escopo da jornada", () => {
  const raiz = fileURLToPath(new URL("../", import.meta.url))
  const fonte = (caminho: string) => readFileSync(join(raiz, caminho), "utf8")

  it("as telas do Mercado não importam mais a demonstração", () => {
    expect(fonte("src/telas/Mercado.tsx")).not.toContain("dadosDoApp")
    expect(fonte("src/telas/Anuncio.tsx")).not.toContain("dadosDoApp")
  })

  it("a porta do Mercado não conhece o índice da demonstração", () => {
    const modulo = fonte("lib/dados/mercado.ts")
    expect(modulo).not.toContain(`from "@/lib/dados"`)
    expect(modulo).not.toContain(`from "../dados"`)
  })
})
