import { afterEach, expect, it, vi } from "vitest"
import {
  decidirPedido,
  excluirGrupo,
  lerMembrosDoGrupo,
  removerMembro,
  salvarAviso,
  salvarRegras,
  transferirGrupo,
} from "@/lib/dados/grupos"

afterEach(() => vi.unstubAllGlobals())
it("envia ações de administração pelo cliente autenticado e propaga recusas", async () => {
  const fetch = vi.fn(async () => new Response(null, { status: 204 }))
  vi.stubGlobal("fetch", fetch)
  const acoes = [
    () => decidirPedido("g", "u", "aprovar"),
    () => decidirPedido("g", "u", "recusar"),
    () => removerMembro("g", "u"),
    () => transferirGrupo("g", "u"),
    () => salvarRegras("g", "regra"),
    () => salvarAviso("g", "none"),
    () => excluirGrupo("g"),
  ]
  for (const acao of acoes) await acao()
  expect(fetch).toHaveBeenCalledTimes(7)
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    "/api/app/grupos/g/pedidos/u",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ decisao: "aprovar" }),
      headers: expect.objectContaining({ "x-bivaque-app": "bivaque-spa" }),
    }),
  )
  expect(fetch).toHaveBeenNthCalledWith(
    4,
    "/api/app/grupos/g/administracao",
    expect.objectContaining({ body: JSON.stringify({ para: "u" }) }),
  )
  fetch.mockImplementation(async () => new Response(null, { status: 403 }))
  for (const acao of acoes) await expect(acao()).rejects.toMatchObject({ codigo: "recusado" })
})
it("lê membros sem transformar falha em lista vazia", async () => {
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ membros: [{ id: "u", nome: "Ana", papel: "member" }] })),
  )
  vi.stubGlobal("fetch", fetch)
  expect(await lerMembrosDoGrupo("g")).toEqual([{ id: "u", nome: "Ana", papel: "member" }])
  fetch.mockImplementation(async () => new Response(null, { status: 503 }))
  await expect(lerMembrosDoGrupo("g")).rejects.toMatchObject({ codigo: "indisponivel" })
})
