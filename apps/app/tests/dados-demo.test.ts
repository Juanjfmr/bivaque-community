import { readFileSync } from "node:fs"
import { join } from "node:path"
import { runInNewContext } from "node:vm"
import { describe, expect, it } from "vitest"

import { criarDadosDemo } from "../lib/dados"

const raiz = join(import.meta.dirname, "..", "..", "..")

describe("dados de demonstração pela porta do app", () => {
  it("preserva as entidades e os valores do protótipo no cenário movimentado", async () => {
    const cidade = await criarDadosDemo().lerCidade("Manaus")
    expect(cidade.grupos).toHaveLength(10)
    expect(cidade.publicacoes).toHaveLength(9)
    expect(cidade.comentarios).toHaveLength(4)
    expect(cidade.perguntas).toHaveLength(7)
    expect(cidade.respostas).toHaveLength(4)
    expect(cidade.anuncios).toHaveLength(6)
    expect(cidade.eventos).toHaveLength(4)
    expect(cidade.negocios).toHaveLength(9)
    expect(cidade.conversas).toHaveLength(4)
    expect(cidade.avisos).toHaveLength(2)
    expect(cidade.anuncios[0]).toMatchObject({
      title: "Sofá retrátil seminovo",
      price_cents: 80000,
      kind: "item",
    })
    expect(cidade.localidade.city_name).toBe("Manaus")
    expect(JSON.stringify(cidade.negocios)).not.toContain("Esposa de militar, verificada")
  })

  it("preserva os vazios do cenário inicial sem fabricar conversas ou respostas", async () => {
    const cidade = await criarDadosDemo("seed").lerCidade("Manaus")
    expect(cidade.grupos).toHaveLength(3)
    expect(cidade.publicacoes).toHaveLength(0)
    expect(cidade.perguntas).toHaveLength(0)
    expect(cidade.respostas).toHaveLength(0)
    expect(cidade.conversas).toHaveLength(0)
    expect(cidade.anuncios).toHaveLength(3)
    expect(cidade.negocios).toHaveLength(6)
  })

  it("não reaproveita conteúdo de Manaus ao consultar uma cidade sem amostra", async () => {
    const dados = criarDadosDemo()
    const natal = await dados.lerCidade("Natal")
    expect(natal.localidade).toMatchObject({ city_name: "Natal", state_code: "RN" })
    expect(natal.grupos).toEqual([])
    expect(natal.anuncios).toEqual([])
    expect(natal.conversas).toEqual([])
    await expect(dados.lerCidade("Cidade inexistente na amostra")).rejects.toThrow()
  })

  it("isola leituras e instâncias sem alterar o catálogo original", async () => {
    const dados = criarDadosDemo()
    const primeira = await dados.lerCidade("Manaus")
    const anuncio = primeira.anuncios[0]
    if (!anuncio) throw new Error("A amostra precisa do anúncio do sofá")
    anuncio.title = "Alterado pelo consumidor"
    expect((await dados.lerCidade("Manaus")).anuncios[0]?.title).toBe("Sofá retrátil seminovo")
    expect((await criarDadosDemo().lerCidade("Manaus")).anuncios[0]?.title).toBe(
      "Sofá retrátil seminovo",
    )
  })

  it("respeita cancelamento e fornece os contadores derivados dos registros", async () => {
    const dados = criarDadosDemo()
    const controle = new AbortController()
    controle.abort()
    await expect(dados.lerCidade("Manaus", { signal: controle.signal })).rejects.toMatchObject({
      name: "AbortError",
    })
    expect(dados.resumoDaCasca()).toMatchObject({
      cidade: "Manaus",
      avisos: 2,
      conversas: 3,
      nomeDaPessoa: "Rafael Souza",
    })
    expect(criarDadosDemo("seed").resumoDaCasca()).toMatchObject({ conversas: 0 })
    const texto = JSON.stringify(await dados.lerCidade("Manaus"))
    expect(texto).not.toMatch(/"(?:force|verified|cpf|rank|om|community_id)":/)
  })

  it("mantém IDs únicos e as referências entre entidades resolvidas", async () => {
    const cidade = await criarDadosDemo().lerCidade("Manaus")
    for (const lista of [
      cidade.grupos,
      cidade.publicacoes,
      cidade.comentarios,
      cidade.perguntas,
      cidade.respostas,
      cidade.anuncios,
      cidade.eventos,
      cidade.negocios,
      cidade.conversas,
      cidade.mensagens,
      cidade.avisos,
    ]) {
      expect(new Set(lista.map((item) => item.id)).size).toBe(lista.length)
    }
    for (const item of cidade.publicacoes)
      expect(cidade.grupos.some((grupo) => grupo.id === item.group_id)).toBe(true)
    for (const item of cidade.comentarios)
      expect(cidade.publicacoes.some((post) => post.id === item.post_id)).toBe(true)
    for (const item of cidade.respostas)
      expect(cidade.perguntas.some((pergunta) => pergunta.id === item.request_id)).toBe(true)
    for (const item of cidade.mensagens)
      expect(cidade.conversas.some((conversa) => conversa.id === item.conversation_id)).toBe(true)
    for (const conversa of cidade.conversas) {
      if (conversa.context_type === "listing")
        expect(cidade.anuncios.some((item) => item.id === conversa.context_id)).toBe(true)
      if (conversa.context_type === "provider")
        expect(cidade.negocios.some((item) => item.id === conversa.context_id)).toBe(true)
    }
    expect(cidade.perguntas.find((item) => item.id === "a5")?.is_resolved).toBe(true)
  })

  it("serve os mesmos bytes das 24 imagens locais sem depender de rede", () => {
    const codigo = readFileSync(
      join(raiz, "prototypes/bivaque-html/src/data/demo/assets.js"),
      "utf8",
    )
    const assets = runInNewContext(codigo + "; ASSETS") as Record<string, string>
    const dados = criarDadosDemo()
    expect(Object.keys(assets)).toHaveLength(24)
    for (const [chave, dataUrl] of Object.entries(assets)) {
      const url = dados.imagem(chave)
      expect(url).toMatch(/^\/app\/demo\/[a-z0-9-]+\.(webp|jpg)$/)
      const arquivo = join(raiz, "apps/app/public", url.replace("/app/", ""))
      expect(
        readFileSync(arquivo).equals(Buffer.from(dataUrl.split(",")[1] ?? "", "base64")),
        chave,
      ).toBe(true)
    }
    expect(dados.imagem("ausente")).toBe("")
  })

  it("preserva auxiliares da referência sem transformá-los em métricas reais", () => {
    const fonte = (nome: string) =>
      readFileSync(join(raiz, "prototypes/bivaque-html/src/data/demo", nome), "utf8")
    const original = runInNewContext(
      `${fonte("source.js")}\n${fonte("model.js")}\n${fonte("bairros.js")}\n${fonte("owner.js")}\n;({ PHOTO_BY_ITEM, PHOTO_BY_BIZ, KNOWLEDGE_TEXT, MEMORY_BIZ, BAIRROS, CEP_TESTE, OWNER_DEMO, memory: SOURCE.memory, planos: {live: SOURCE.live.plan, seed: SOURCE.seed.plan}, sugestoes: {live: SOURCE.live.comms, seed: SOURCE.seed.comms} })`,
    )
    expect(criarDadosDemo().auxiliares()).toMatchObject(JSON.parse(JSON.stringify(original)))
  })
})
