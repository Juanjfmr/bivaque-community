import { afterEach, describe, expect, it, vi } from "vitest"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  buscarNegocio,
  buscarPedido,
  criarPedido,
  lerNegocios,
  lerPedidos,
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
