import { afterEach, expect, it, vi } from "vitest"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  anexarFotoAoGrupo,
  buscarGrupo,
  buscarPublicacao,
  comentarPublicacao,
  lerGrupos,
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

it("participa??o mostra o resultado gravado e DELETE n?o manda corpo", async () => {
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
