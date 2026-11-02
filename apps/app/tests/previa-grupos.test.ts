import { describe, expect, it } from "vitest"
import { EU } from "@/src/previa-grupos/dados"
import { ESTADO_INICIAL, reduzir } from "@/src/previa-grupos/estado"

const publicacao = (estado: typeof ESTADO_INICIAL, id: string) => {
  const achada = estado.publicacoes.find((p) => p.id === id)
  if (achada === undefined) throw new Error(`sem publicação ${id}`)
  return achada
}

describe("Grupos — resposta a comentário em um nível", () => {
  it("a resposta entra logo depois do fio do comentário respondido", () => {
    const pub = publicacao(ESTADO_INICIAL, "p-pediatra")
    const alvo = pub.comentarios.find((c) => c.id === "c1")
    if (alvo === undefined) throw new Error("sem c1")
    const depois = reduzir(ESTADO_INICIAL, {
      tipo: "comentar",
      publicacao: "p-pediatra",
      texto: "Obrigada pela dica",
      respondeA: alvo,
    })
    const ids = publicacao(depois, "p-pediatra").comentarios.map((c) => c.respondeA ?? "raiz")
    // c1, suas duas respostas, a nova resposta (também de c1) e depois c4.
    expect(ids).toEqual(["raiz", "c1", "c1", "c1", "raiz"])
  })

  it("responder a uma resposta fica no mesmo nível, com o nome de quem foi respondido", () => {
    const pub = publicacao(ESTADO_INICIAL, "p-pediatra")
    const resposta = pub.comentarios.find((c) => c.id === "c2")
    if (resposta === undefined) throw new Error("sem c2")
    const depois = reduzir(ESTADO_INICIAL, {
      tipo: "comentar",
      publicacao: "p-pediatra",
      texto: "Também consegui",
      respondeA: resposta,
    })
    const nova = publicacao(depois, "p-pediatra").comentarios.find(
      (c) => c.texto === "Também consegui",
    )
    expect(nova?.respondeA).toBe("c1")
    expect(nova?.para).toBe("Luana M.")
  })

  it("comentário sem resposta vai para o fim", () => {
    const depois = reduzir(ESTADO_INICIAL, {
      tipo: "comentar",
      publicacao: "p-pediatra",
      texto: "Fim",
      respondeA: null,
    })
    expect(publicacao(depois, "p-pediatra").comentarios.at(-1)?.texto).toBe("Fim")
  })
})

describe("Grupos — marcar que resolveu", () => {
  it("só quem perguntou marca", () => {
    const naMinha = reduzir(ESTADO_INICIAL, {
      tipo: "resolveu",
      publicacao: "p-festa",
      comentario: "c6",
    })
    expect(publicacao(naMinha, "p-festa").resolvida).toBe("c6")
    const naDeOutro = reduzir(ESTADO_INICIAL, {
      tipo: "resolveu",
      publicacao: "p-pediatra",
      comentario: "c4",
    })
    expect(publicacao(naDeOutro, "p-pediatra").resolvida).toBe("c1")
  })

  it("marcar de novo desmarca", () => {
    const uma = reduzir(ESTADO_INICIAL, {
      tipo: "resolveu",
      publicacao: "p-festa",
      comentario: "c6",
    })
    const duas = reduzir(uma, { tipo: "resolveu", publicacao: "p-festa", comentario: "c6" })
    expect(publicacao(duas, "p-festa").resolvida).toBeNull()
  })
})

describe("Grupos — publicar e entrar", () => {
  it("publica com no máximo 4 fotos, no topo, em nome de quem escreve", () => {
    const depois = reduzir(ESTADO_INICIAL, {
      tipo: "publicar",
      grupo: "familias",
      tipoDaPublicacao: "conversa",
      texto: "Oi, pessoal",
      fotos: ["a", "b", "c", "d", "e"],
    })
    const nova = depois.publicacoes[0]
    expect(nova?.fotos).toHaveLength(4)
    expect(nova?.autor).toBe(EU.curto)
  })

  it("entrar no grupo abre as boas-vindas; publicar as fecha", () => {
    const dentro = reduzir(ESTADO_INICIAL, { tipo: "entrar", grupo: "familias" })
    expect(dentro.grupos.find((g) => g.id === "familias")?.participa).toBe(true)
    expect(dentro.boasVindas).toContain("familias")
    const depois = reduzir(dentro, {
      tipo: "publicar",
      grupo: "familias",
      tipoDaPublicacao: "conversa",
      texto: "Oi",
      fotos: [],
    })
    expect(depois.boasVindas).not.toContain("familias")
  })

  it("Desfazer logo depois de publicar tira a publicação do feed", () => {
    const publicado = reduzir(ESTADO_INICIAL, {
      tipo: "publicar",
      grupo: "familias",
      tipoDaPublicacao: "conversa",
      texto: "Oi, pessoal",
      fotos: [],
      id: "p-recem",
    })
    expect(publicado.publicacoes[0]?.id).toBe("p-recem")
    const desfeito = reduzir(publicado, { tipo: "apagar", publicacao: "p-recem" })
    expect(desfeito.publicacoes.some((p) => p.id === "p-recem")).toBe(false)
  })

  it("o Desfazer do salvar fixa o valor de antes, em vez de alternar", () => {
    const salva = reduzir(ESTADO_INICIAL, { tipo: "salvar", publicacao: "p-berco" })
    expect(publicacao(salva, "p-berco").salva).toBe(true)
    // Desfazer duas vezes (aviso antigo ainda na tela) não volta a salvar.
    const desfeita = reduzir(salva, { tipo: "salvar", publicacao: "p-berco", valor: false })
    const deNovo = reduzir(desfeita, { tipo: "salvar", publicacao: "p-berco", valor: false })
    expect(publicacao(deNovo, "p-berco").salva).toBe(false)
  })

  it("não apaga publicação de outra pessoa", () => {
    const depois = reduzir(ESTADO_INICIAL, { tipo: "apagar", publicacao: "p-pediatra" })
    expect(depois.publicacoes.some((p) => p.id === "p-pediatra")).toBe(true)
  })

  it("Útil alterna e a contagem acompanha", () => {
    const um = reduzir(ESTADO_INICIAL, { tipo: "util", publicacao: "p-berco" })
    expect(publicacao(um, "p-berco").uteis).toBe(12)
    const dois = reduzir(um, { tipo: "util", publicacao: "p-berco" })
    expect(publicacao(dois, "p-berco").uteis).toBe(11)
  })
})
