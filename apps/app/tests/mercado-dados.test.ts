import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import {
  abrirInteresse,
  buscarAnuncio,
  editarDesapego,
  lerMercado,
  mudarSituacao,
} from "@/lib/dados/mercado"

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

describe("gerenciar o próprio anúncio (editar e situação)", () => {
  const DADOS = {
    titulo: "Mesa de jantar",
    bairro: "Centro",
    preco: "450",
    descricao: "Mesa em bom estado, retirada no Centro.",
    categoria: "casa_moveis",
    condicao: "used",
  }

  it("grava a edição por PATCH no caminho do anúncio", async () => {
    const buscar = responder({ anuncio: { id: "a1" } })
    await editarDesapego("a1", DADOS)
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/mercado/a1")
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(String(init.body))).toEqual(DADOS)
  })

  it("preço com ponto vira vírgula (a validação é a da web) e foto vira base64", async () => {
    const buscar = responder({ anuncio: { id: "a1" } })
    await editarDesapego("a1", {
      ...DADOS,
      preco: "450.50",
      foto: "data:image/png;base64,aGVsbG8=",
    })
    const corpo = JSON.parse(String(chamada(buscar).init.body)) as Record<string, unknown>
    expect(corpo["preco"]).toBe("450,50")
    expect(corpo["foto"]).toEqual({ tipo: "image/png", conteudo: "aGVsbG8=" })
  })

  it("sem foto escolhida o corpo não fala de foto — as atuais continuam", async () => {
    const buscar = responder({ anuncio: { id: "a1" } })
    await editarDesapego("a1", { ...DADOS, foto: "" })
    expect(JSON.parse(String(chamada(buscar).init.body))).not.toHaveProperty("foto")
  })

  it("data URL que não é imagem é recusada antes de sair", async () => {
    const buscar = responder({})
    await expect(
      editarDesapego("a1", { ...DADOS, foto: "data:text/html;base64,abc=" }),
    ).rejects.toMatchObject({ codigo: "invalido" })
    expect(buscar).not.toHaveBeenCalled()
  })

  it("campos do servidor em erro chegam como dados inválidos", async () => {
    responder({ erro: "dados-invalidos", mensagem: "Revise os dados." }, 400)
    const falha = (await editarDesapego("a1", DADOS).catch((erro: unknown) => erro)) as FalhaDaApi
    expect(falha.codigo).toBe("invalido")
    expect(falha.motivoDoServidor).toBe("dados-invalidos")
    expect(falha.mensagem).toBe("Revise os dados.")
  })

  it("muda a situação pela rota própria e devolve a situação nova", async () => {
    const buscar = responder({ status: "paused" })
    await expect(mudarSituacao("a1", "pause")).resolves.toBe("paused")
    const { caminho, init } = chamada(buscar)
    expect(caminho).toBe("/api/app/mercado/a1/situacao")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual({ acao: "pause" })
  })

  it("passagem recusada chega como conflito, com a mensagem do servidor", async () => {
    responder({ erro: "estado-invalido", mensagem: "Não é possível agora." }, 409)
    const falha = (await mudarSituacao("a1", "reactivate").catch(
      (erro: unknown) => erro,
    )) as FalhaDaApi
    expect(falha.codigo).toBe("conflito")
    expect(falha.mensagem).toBe("Não é possível agora.")
  })

  it("situação que não vem é falha de contrato, não sucesso silencioso", async () => {
    responder({})
    await expect(mudarSituacao("a1", "pause")).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("página pedida pela URL", () => {
  it("persegue o cursor até a página e devolve aquela página", async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            anuncios: [{ ...ANUNCIO, id: "p1" }],
            proximo: "2026-11-01T12:00:00.000Z|p1",
            cidade: "Manaus",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ anuncios: [{ ...ANUNCIO, id: "p2" }], proximo: null, cidade: "Manaus" }),
          { status: 200 },
        ),
      )
    vi.stubGlobal("fetch", buscar)
    const lista = await lerMercado({ tipo: "property", pagina: 2 })
    const segunda = buscar.mock.calls[1] as unknown as [string]
    expect(String(segunda[0])).toContain("depois=")
    expect(lista.anuncios.map((anuncio) => anuncio.id)).toEqual(["p2"])
  })

  it("página além do fim devolve a última página real, nunca lista vazia fingida", async () => {
    const buscar = responder({
      anuncios: [{ ...ANUNCIO, id: "p1" }],
      proximo: null,
      cidade: "Manaus",
    })
    const lista = await lerMercado({ tipo: "property", pagina: 9 })
    expect(buscar).toHaveBeenCalledTimes(1)
    expect(lista.anuncios.map((anuncio) => anuncio.id)).toEqual(["p1"])
  })

  it("pagina 1 (ou ausente) é uma chamada só, como sempre foi", async () => {
    const buscar = responder({ anuncios: [], proximo: null, cidade: null })
    await lerMercado({ tipo: "item" })
    expect(buscar).toHaveBeenCalledTimes(1)
    expect(chamada(buscar).caminho).toBe("/api/app/mercado?tipo=item")
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
