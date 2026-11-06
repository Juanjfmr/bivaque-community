import { afterEach, expect, it, vi } from "vitest"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  agirNaPublicacao,
  anexarFotoAoGrupo,
  buscarGrupo,
  buscarPublicacao,
  comentarPublicacao,
  denunciarPublicacao,
  lerGrupos,
  lerPedidosDoGrupo,
  marcarComentarioUtil,
  mudarParticipacao,
  publicarNoGrupo,
} from "@/lib/dados/grupos"

const grupo = {
  id: "g1",
  nome: "Famílias",
  descricao: "",
  regras: "",
  fechado: true,
  membro: false,
  pendente: false,
  admin: false,
  membros: null,
  fixada: null,
}
function resposta(corpo: unknown, status = 200) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(corpo), { status }))
  vi.stubGlobal("fetch", fetch)
  return fetch
}
afterEach(() => vi.unstubAllGlobals())
it("lê o diretório pelo cliente único, com sinal e cursor", async () => {
  const fetch = resposta({ grupos: [grupo], cidade: "Manaus", proximo: "20" })
  const signal = new AbortController().signal
  expect((await lerGrupos({ signal, depois: "0" })).grupos[0]).toEqual(grupo)
  expect(fetch).toHaveBeenCalledWith(
    "/api/app/grupos?depois=0",
    expect.objectContaining({
      credentials: "include",
      signal,
      headers: { "x-bivaque-app": "bivaque-spa" },
    }),
  )
})
it("lê detalhe com ordem e paginação sem inventar cidade", async () => {
  const fetch = resposta({ grupo, publicacoes: [], proximo: null })
  expect((await buscarGrupo("g1", { ordem: "discutidas", depois: "20" })).grupo).toEqual(grupo)
  expect(fetch).toHaveBeenCalledWith(
    "/api/app/grupos/g1?ordem=discutidas&depois=20",
    expect.any(Object),
  )
})
it.each([{}, { grupos: null }, { grupos: [{}], cidade: "", proximo: null }])(
  "resposta inválida falha alto",
  async (corpo) => {
    resposta(corpo)
    await expect(lerGrupos()).rejects.toBeInstanceOf(FalhaDaApi)
  },
)
it("conserva o status da recusa para a tela", async () => {
  resposta({ erro: "sem-sessao" }, 401)
  await expect(buscarGrupo("g1")).rejects.toMatchObject({ status: 401 })
})

it("participação mostra o resultado gravado e DELETE não manda corpo", async () => {
  const fetch = resposta({ grupo: { ...grupo, pendente: true } })
  expect((await mudarParticipacao("g1", true, "Um motivo")).pendente).toBe(true)
  expect(fetch).toHaveBeenCalledWith(
    "/api/app/grupos/g1/participacao",
    expect.objectContaining({ method: "PUT", body: JSON.stringify({ motivo: "Um motivo" }) }),
  )
  await mudarParticipacao("g1", false)
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/app/grupos/g1/participacao",
    expect.objectContaining({ method: "DELETE" }),
  )
})

it("publica texto/fotos e envia comentário pelo cliente único", async () => {
  const fetch = resposta({ publicacao: { id: "p1" } })
  expect(await publicarNoGrupo("g1", { texto: "Texto", fotos: ["pasta/foto.png"] })).toBe("p1")
  expect(fetch).toHaveBeenCalledWith(
    "/api/app/grupos/g1/publicacoes",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ texto: "Texto", fotos: ["pasta/foto.png"] }),
    }),
  )
})
it("foto passa pelo cliente único com tipo e base64", async () => {
  const fetch = resposta({ caminho: "pasta/foto.png" })
  expect(await anexarFotoAoGrupo("g1", "data:image/png;base64,YQ==")).toBe("pasta/foto.png")
  expect(fetch).toHaveBeenCalledWith(
    "/api/app/grupos/g1/fotos",
    expect.objectContaining({ body: JSON.stringify({ tipo: "image/png", conteudo: "YQ==" }) }),
  )
})
it("resposta em fio retorna o comentário persistido", async () => {
  const c = {
    id: "c2",
    texto: "Concordo",
    criadaEm: "2026-11-06",
    autor: "",
    propria: true,
    parentId: "c1",
    respondeA: "c1",
    para: "",
    uteis: 0,
    util: false,
  }
  const fetch = resposta({ comentario: c })
  expect(await comentarPublicacao("p1", "Concordo", "c1")).toEqual(c)
  expect(fetch).toHaveBeenCalledWith(
    "/api/app/grupos/publicacoes/p1/comentarios",
    expect.objectContaining({ body: JSON.stringify({ texto: "Concordo", respondeA: "c1" }) }),
  )
})
it("detalhe não transforma comentário fora do contrato em lista vazia", async () => {
  resposta({ publicacao: {}, grupo, comentarios: [], proximo: null })
  await expect(buscarPublicacao("p1")).rejects.toBeInstanceOf(FalhaDaApi)
})

const publicacao = {
  id: "p1",
  grupoId: "g1",
  texto: "Texto",
  criadaEm: "2026-11-06",
  autor: "Ana",
  propria: false,
  comentarios: 0,
  uteis: 2,
  util: true,
  salva: true,
  oculta: false,
  fotos: [],
}
it.each(["util", "salvar", "fixar", "ocultar"] as const)(
  "%s usa o cliente único com sinal e devolve o que foi gravado",
  async (acao) => {
    const fetch = resposta({ publicacao, fixada: "p1" })
    const signal = new AbortController().signal
    expect(await agirNaPublicacao("p1", acao, true, { signal })).toEqual({
      publicacao,
      fixada: "p1",
    })
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/grupos/publicacoes/p1/acoes",
      expect.objectContaining({
        method: "PUT",
        signal,
        body: JSON.stringify({ acao, valor: true }),
      }),
    )
  },
)
it("Útil no comentário lê o resultado persistido", async () => {
  const fetch = resposta({ comentario: { id: "c1", uteis: 3, util: true } })
  expect(await marcarComentarioUtil("p1", "c1", true)).toEqual({ id: "c1", uteis: 3, util: true })
  expect(fetch).toHaveBeenCalledWith(
    "/api/app/grupos/publicacoes/p1/acoes",
    expect.objectContaining({
      body: JSON.stringify({ acao: "util", valor: true, comentarioId: "c1" }),
    }),
  )
})
it.each(["util", "salvar", "fixar", "ocultar"] as const)(
  "%s preserva recusa e rejeita resposta inválida",
  async (acao) => {
    resposta({ erro: "nao-membro" }, 403)
    await expect(agirNaPublicacao("p1", acao, true)).rejects.toMatchObject({ status: 403 })
    resposta({ publicacao: { ...publicacao, salva: "sim" }, fixada: null })
    await expect(agirNaPublicacao("p1", acao, true)).rejects.toBeInstanceOf(FalhaDaApi)
  },
)
it("Útil no comentário recusa contagem fora do contrato", async () => {
  resposta({ comentario: { id: "c1", uteis: -1, util: true } })
  await expect(marcarComentarioUtil("p1", "c1", true)).rejects.toBeInstanceOf(FalhaDaApi)
})
it("denúncia envia motivo e explicação com sinal e devolve o registro", async () => {
  const fetch = resposta({ denuncia: { id: "d1" } })
  const signal = new AbortController().signal
  expect(await denunciarPublicacao("p1", "spam", "Oferta repetida", { signal })).toBe("d1")
  expect(fetch).toHaveBeenCalledWith(
    "/api/app/grupos/publicacoes/p1/denuncia",
    expect.objectContaining({
      method: "POST",
      signal,
      body: JSON.stringify({ motivo: "spam", explicacao: "Oferta repetida" }),
    }),
  )
})
it("denúncia preserva recusa e rejeita resposta inválida", async () => {
  resposta({ erro: "ja-denunciado" }, 409)
  await expect(denunciarPublicacao("p1", "spam", "")).rejects.toMatchObject({ status: 409 })
  resposta({ denuncia: {} })
  await expect(denunciarPublicacao("p1", "spam", "")).rejects.toBeInstanceOf(FalhaDaApi)
})
it("pedidos leem motivo e paginação pelo cliente único", async () => {
  const corpo = { pedidos: [{ id: "u1", nome: "Ana", motivo: "Quero participar" }], proximo: "20" }
  const fetch = resposta(corpo)
  const signal = new AbortController().signal
  expect(await lerPedidosDoGrupo("g1", { depois: "0", signal })).toEqual(corpo)
  expect(fetch).toHaveBeenCalledWith(
    "/api/app/grupos/g1/pedidos?depois=0",
    expect.objectContaining({ signal }),
  )
})
it.each([
  () => lerGrupos(),
  () => buscarGrupo("g1"),
  () => buscarPublicacao("p1"),
  () => mudarParticipacao("g1", true),
  () => publicarNoGrupo("g1", { texto: "Texto", fotos: [] }),
  () => comentarPublicacao("p1", "Texto"),
  () => lerPedidosDoGrupo("g1"),
  () => anexarFotoAoGrupo("g1", "data:image/png;base64,YQ=="),
])("falha do servidor e resposta fora do contrato não viram sucesso", async (chamar) => {
  resposta({ erro: "indisponivel" }, 503)
  await expect(chamar()).rejects.toMatchObject({ status: 503 })
  resposta({})
  await expect(chamar()).rejects.toBeInstanceOf(FalhaDaApi)
})
it("foto fora dos formatos aceitos não faz requisição", async () => {
  const fetch = resposta({})
  await expect(anexarFotoAoGrupo("g1", "data:image/svg+xml;base64,YQ==")).rejects.toMatchObject({
    status: 400,
  })
  expect(fetch).not.toHaveBeenCalled()
})
