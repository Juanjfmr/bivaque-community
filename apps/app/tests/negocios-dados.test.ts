import { afterEach, describe, expect, it, vi } from "vitest"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  buscarNegocio,
  buscarPedido,
  criarMinhaFicha,
  criarPedido,
  lerMinhaFicha,
  lerNegocios,
  lerPedidos,
  moverServico,
  mudarPedido,
  publicarFoto,
  publicarServico,
  removerServico,
  salvarMinhaFicha,
} from "@/lib/dados/negocios"

const negocio = {
  id: "n1",
  nome: "Climatiza",
  categoria: "assistencia_tecnica",
  categoriaNome: "Assistência técnica",
  descricao: null,
}
const pedido = {
  id: "p1",
  negocioId: "n1",
  negocioNome: "Climatiza",
  categoriaNome: "Assistência técnica",
  descricao: "Limpar o ar",
  quando: null,
  situacao: "open",
  criadoEm: "2026-11-05T12:00:00Z",
  atualizadoEm: "2026-11-05T12:00:00Z",
  conversaId: null,
  lado: "solicitante",
}

function responder(corpo: unknown, status = 200) {
  const fetch = vi.fn(
    async (_caminho: string, _init: RequestInit) => new Response(JSON.stringify(corpo), { status }),
  )
  vi.stubGlobal("fetch", fetch)
  return fetch
}

afterEach(() => vi.unstubAllGlobals())

describe("porta de negócios e pedidos", () => {
  it("lê categorias, cidade e lista com filtros e cancelamento", async () => {
    const fetch = responder({
      negocios: [negocio],
      categorias: [{ id: "assistencia_tecnica", nome: "Assistência técnica" }],
      cidade: "Manaus",
      proximo: "n2",
    })
    const controle = new AbortController()
    const dados = await lerNegocios({
      categoria: "assistencia_tecnica",
      depois: "n1",
      signal: controle.signal,
    })
    expect(dados.negocios[0]?.nome).toBe("Climatiza")
    expect(dados.cidade).toBe("Manaus")
    expect(dados.proximo).toBe("n2")
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/negocios?categoria=assistencia_tecnica&depois=n1",
      expect.objectContaining({ signal: controle.signal, credentials: "include" }),
    )
  })

  it("lê ficha e serviços reais, sem inventar foto", async () => {
    const fetch = responder({
      negocio: {
        ...negocio,
        cidade: "Manaus",
        podePedir: true,
        servicos: [{ id: "s1", titulo: "Limpeza", descricao: null }],
        foto: null,
        fotoDescricao: null,
      },
    })
    const dados = await buscarNegocio("id/com barra")
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/app/negocios/id%2Fcom%20barra")
    expect(dados.servicos[0]?.titulo).toBe("Limpeza")
    expect(dados.foto).toBeNull()
  })

  it("escreve uma vez e retorna o pedido confirmado pelo servidor", async () => {
    const fetch = responder({ pedido }, 201)
    const controle = new AbortController()
    const dados = { descricao: "Limpar o ar", quando: "", chave: "mesmo-envio" }
    await expect(criarPedido("n1", dados, { signal: controle.signal })).resolves.toEqual(pedido)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/negocios/n1/pedidos",
      expect.objectContaining({
        method: "POST",
        signal: controle.signal,
        body: JSON.stringify(dados),
      }),
    )
  })

  it("lista e consulta o próprio pedido com a porta única", async () => {
    const fetch = responder({ pedidos: [pedido], proximo: null })
    await expect(lerPedidos({ depois: "p0" })).resolves.toMatchObject({
      pedidos: [pedido],
      proximo: null,
    })
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/app/pedidos?depois=p0")
    responder({ pedido })
    await expect(buscarPedido("p1")).resolves.toEqual(pedido)
  })

  it.each([
    ["lista sem lista", () => lerNegocios(), {}],
    ["lista sem cidade", () => lerNegocios(), { negocios: [], categorias: [], proximo: null }],
    [
      "item incompleto",
      () => lerNegocios(),
      { negocios: [{ id: "n1" }], categorias: [], cidade: "Manaus", proximo: null },
    ],
    ["categorias ausentes", () => lerNegocios(), { negocios: [], cidade: "Manaus", proximo: null }],
    [
      "ficha sem serviços",
      () => buscarNegocio("n1"),
      { negocio: { ...negocio, cidade: "Manaus", podePedir: true } },
    ],
    [
      "pedido sem situação",
      () => buscarPedido("p1"),
      { pedido: { ...pedido, situacao: undefined } },
    ],
    ["pedido sem lado", () => buscarPedido("p1"), { pedido: { ...pedido, lado: undefined } }],
    [
      "situação desconhecida",
      () => buscarPedido("p1"),
      { pedido: { ...pedido, situacao: "inventada" } },
    ],
    ["lista de pedidos quebrada", () => lerPedidos(), { pedidos: "quebrado" }],
    [
      "criação sem confirmação",
      () => criarPedido("n1", { descricao: "Limpar", quando: "", chave: "k" }),
      {},
    ],
  ] as const)("%s falha alto em vez de virar vazio ou sucesso", async (_nome, chamar, corpo) => {
    responder(corpo)
    await expect(chamar()).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it.each([401, 403, 404, 503])("preserva erro %s na leitura", async (status) => {
    responder({ erro: "negado" }, status)
    await expect(buscarNegocio("n1")).rejects.toMatchObject({ status })
  })

  it("falha de escrita não vira pedido otimista nem repete envio", async () => {
    const fetch = responder({ erro: "escrita-indisponivel" }, 503)
    await expect(
      criarPedido("n1", { descricao: "Limpar", quando: "", chave: "mesma-chave" }),
    ).rejects.toMatchObject({ codigo: "indisponivel" })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("deixa cancelamento chegar à tela sem convertê-lo em falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("Cancelado", "AbortError")
      }),
    )
    await expect(lerPedidos()).rejects.toMatchObject({ name: "AbortError" })
  })
})

const ficha = {
  id: "n1",
  nome: "Climatiza",
  categoria: "assistencia_tecnica",
  categoriaNome: "Assistência técnica",
  descricao: "Instalação",
  servicos: [{ id: "s1", titulo: "Limpeza", descricao: null }],
  fotos: [{ id: "f1", url: "https://midia.example.invalid/assinada", legenda: "Trabalho" }],
}

describe("porta do negócio próprio (F07 RUN-177)", () => {
  it("lê a ficha do dono com as categorias do servidor, e o vazio sem ficha", async () => {
    const fetch = responder({
      negocio: ficha,
      categorias: [{ id: "assistencia_tecnica", nome: "Assistência técnica" }],
    })
    const lida = await lerMinhaFicha()
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/app/negocio")
    expect(lida.ficha?.servicos[0]?.titulo).toBe("Limpeza")
    expect(lida.ficha?.fotos[0]?.url).toContain("assinada")
    expect(lida.categorias[0]?.nome).toBe("Assistência técnica")

    responder({ negocio: null, categorias: [] })
    await expect(lerMinhaFicha()).resolves.toEqual({ ficha: null, categorias: [] })
  })

  it("cria e edita a ficha por POST e PATCH, sem id no corpo", async () => {
    const fetch = responder({ negocio: ficha, categorias: [] }, 201)
    await expect(
      criarMinhaFicha({ nome: "Climatiza", categoria: "assistencia_tecnica", descricao: "" }),
    ).resolves.toEqual(ficha)
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: "POST" })

    await salvarMinhaFicha({ nome: "Climatiza", categoria: "assistencia_tecnica", descricao: "" })
    expect(fetch.mock.calls[1]?.[0]).toBe("/api/app/negocio")
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH" })
  })

  it("publica, move e remove serviço sempre com a lista ordenada de volta", async () => {
    const fetch = responder({ servicos: ficha.servicos }, 201)
    await expect(publicarServico({ titulo: "Limpeza", descricao: "" })).resolves.toEqual(
      ficha.servicos,
    )
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/app/negocio/catalogo")

    await moverServico("s1", "cima")
    expect(fetch.mock.calls[1]?.[0]).toBe("/api/app/negocio/catalogo/s1")
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH", body: '{"direcao":"cima"}' })

    await removerServico("s1")
    expect(fetch.mock.calls[2]?.[1]).toMatchObject({ method: "DELETE" })
  })

  it("envia a foto como formulário, sem content-type de JSON", async () => {
    const fetch = responder({ fotos: ficha.fotos }, 201)
    const arquivo = new File([new Uint8Array([1, 2, 3])], "foto.png", { type: "image/png" })
    await expect(publicarFoto(arquivo, " Trabalho ")).resolves.toEqual(ficha.fotos)
    const envio = fetch.mock.calls[0]?.[1] as RequestInit
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/app/negocio/fotos")
    expect(envio.method).toBe("POST")
    expect(envio.body).toBeInstanceOf(FormData)
    expect((envio.body as FormData).get("legenda")).toBe("Trabalho")
    expect(envio.headers).not.toHaveProperty("content-type")
  })

  it("cancela e encerra com a ação no corpo e a situação relida do servidor", async () => {
    const encerrado = { ...pedido, situacao: "closed", lado: "dono" }
    const fetch = responder({ pedido: encerrado })
    await expect(mudarPedido("p1", "encerrar")).resolves.toEqual(encerrado)
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/app/pedidos/p1")
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: "PATCH", body: '{"acao":"encerrar"}' })
  })

  it("ficha fora do contrato falha alto em vez de inventar página", async () => {
    responder({ negocio: { id: "n1" }, categorias: [] })
    await expect(lerMinhaFicha()).rejects.toBeInstanceOf(FalhaDaApi)
  })
})
