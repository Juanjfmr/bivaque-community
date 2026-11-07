import { afterEach, describe, expect, it, vi } from "vitest"
import { lerMeusAnuncios, publicarDesapego, publicarPergunta } from "../lib/dados/criar"
import { guardarRascunho, lerRascunho } from "../src/criar/rascunho"

afterEach(() => vi.unstubAllGlobals())
const dados = {
  chave: "b1000000-0000-4000-8000-000000000099",
  titulo: "Mesa de jantar",
  bairro: "Flores",
  preco: "750.50",
  descricao: "Em bom estado",
  categoria: "casa_moveis",
  condicao: "used",
  foto: "",
}

describe("porta de criação", () => {
  it("envia pela porta única com signal e retorna só o id gravado", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ pergunta: { id: "gravada" } })))
    vi.stubGlobal("fetch", fetch)
    const controle = new AbortController()
    expect(
      await publicarPergunta(
        { titulo: "Alguém indica escola?", assunto: "Educação", topico: "educacao" },
        { signal: controle.signal },
      ),
    ).toBe("gravada")
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/perguntas",
      expect.objectContaining({ signal: controle.signal, credentials: "include", method: "POST" }),
    )
    // O tópico escolhido viaja junto: a lista fechada é a categoria do banco.
    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body ?? "{}")).toMatchObject({
      titulo: "Alguém indica escola?",
      topico: "educacao",
    })
  })
  it("desapego envia chave estável, centavos na notação da validação e foto", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ anuncio: { id: "gravado" } })))
    vi.stubGlobal("fetch", fetch)
    expect(await publicarDesapego({ ...dados, foto: "data:image/png;base64,YWJj" })).toBe("gravado")
    expect(JSON.parse(fetch.mock.calls[0]?.[1].body)).toMatchObject({
      chave: dados.chave,
      preco: "750,50",
      foto: { tipo: "image/png", conteudo: "YWJj" },
    })
  })
  it("falha não é repetida e resposta sem id não vira sucesso", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }))
    vi.stubGlobal("fetch", fetch)
    await expect(publicarDesapego(dados)).rejects.toMatchObject({ codigo: "indisponivel" })
    expect(fetch).toHaveBeenCalledTimes(1)
    fetch.mockResolvedValue(new Response("{}"))
    await expect(
      publicarPergunta({ titulo: "Uma pergunta válida?", assunto: "", topico: "" }),
    ).rejects.toMatchObject({ codigo: "indisponivel" })
  })
  it("meus anúncios distingue vazio, erro e resposta fora do contrato", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ anuncios: [], proximo: null })))
    vi.stubGlobal("fetch", fetch)
    expect((await lerMeusAnuncios()).anuncios).toEqual([])
    fetch.mockResolvedValue(new Response("{}", { status: 503 }))
    await expect(lerMeusAnuncios()).rejects.toMatchObject({ codigo: "indisponivel" })
    fetch.mockResolvedValue(new Response("{}"))
    await expect(lerMeusAnuncios()).rejects.toMatchObject({ codigo: "indisponivel" })
  })
  it("rascunho recupera os campos e não sobrescreve com armazenamento quebrado", () => {
    let salvo = ""
    vi.stubGlobal("sessionStorage", {
      getItem: () => salvo || null,
      setItem: (_chave: string, valor: string) => {
        salvo = valor
      },
    })
    expect(guardarRascunho("teste", dados)).toBe(true)
    expect(lerRascunho("teste", dados)).toEqual(dados)
    salvo = '{"titulo":3}'
    expect(lerRascunho("teste", { titulo: "" })).toEqual({ titulo: "" })
    vi.stubGlobal("sessionStorage", {
      setItem: () => {
        throw new Error("quota")
      },
      getItem: () => {
        throw new Error("bloqueado")
      },
    })
    expect(guardarRascunho("teste", dados)).toBe(false)
    expect(lerRascunho("teste", dados)).toEqual(dados)
  })
})
