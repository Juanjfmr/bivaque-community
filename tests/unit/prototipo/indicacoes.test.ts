import { describe, expect, it } from "vitest"
import {
  combina,
  criarFonteDeDemonstracao,
  FALHA_DA_DEMONSTRACAO,
  normalizar,
  quandoRelativo,
  termosDeBusca,
} from "../../../apps/prototipo/lib/demo/dados"

// PROTO-001 — a interface das Indicações, exercitada pela demonstração. A tela
// fala só com esta interface; por isso o teste bate nela, e não no HTML.

function fonte() {
  return criarFonteDeDemonstracao({ atrasoMs: 0 })
}

const PEDIDO = { cidade: "Manaus", limite: 24, deslocamento: 0 } as const

function ids(itens: Array<{ id: string }>): string[] {
  return itens.map((item) => item.id)
}

describe("listar", () => {
  it("'Para ajudar' traz as perguntas abertas de outras pessoas", async () => {
    const pagina = await fonte().listar({ ...PEDIDO, filtro: "para-ajudar" })
    // a5 já está resolvida, então sai; as outras seis ficam.
    expect(ids(pagina.itens)).toEqual(["a7", "a8", "a1", "a6", "a2", "a3"])
    expect(pagina.total).toBe(6)
  })

  it("em 'Para ajudar', quem não recebeu resposta aparece primeiro", async () => {
    const pagina = await fonte().listar({ ...PEDIDO, filtro: "para-ajudar" })
    const semResposta = pagina.itens.filter((item) => item.reply_count === 0)
    const comResposta = pagina.itens.filter((item) => item.reply_count > 0)
    expect(ids(semResposta)).toEqual(["a7", "a8", "a1", "a6"])
    expect(ids(comResposta)).toEqual(["a2", "a3"])
  })

  it("'Resolvidas' traz só o que já foi resolvido", async () => {
    const pagina = await fonte().listar({ ...PEDIDO, filtro: "resolvidas" })
    expect(ids(pagina.itens)).toEqual(["a5"])
    expect(pagina.itens[0]?.is_resolved).toBe(true)
    expect(pagina.itens[0]?.resolved_reply_body).toContain("clínica 24 horas")
  })

  it("'Minhas' começa vazio: nenhuma pergunta da demonstração é da pessoa", async () => {
    const pagina = await fonte().listar({ ...PEDIDO, filtro: "minhas" })
    expect(pagina.itens).toEqual([])
    expect(pagina.total).toBe(0)
  })

  it("conta as resolvidas da cidade e pagina o resultado", async () => {
    const primeira = await fonte().listar({ ...PEDIDO, filtro: "para-ajudar", limite: 4 })
    const segunda = await fonte().listar({
      ...PEDIDO,
      filtro: "para-ajudar",
      limite: 4,
      deslocamento: 4,
    })
    expect(primeira.itens).toHaveLength(4)
    expect(segunda.itens).toHaveLength(2)
    expect(segunda.total).toBe(6)
    expect(primeira.resolvidas).toBe(1)
  })

  it("a pergunta carrega o formato do banco e o que a tela precisa", async () => {
    const pagina = await fonte().listar({ ...PEDIDO, filtro: "para-ajudar" })
    const pergunta = pagina.itens[0]
    expect(pergunta).toMatchObject({
      id: "a7",
      title: "Academia que abra às 5h perto do Dom Pedro?",
      category: "esporte_lazer",
      is_resolved: false,
      group_id: null,
      group_name: null,
      reply_count: 0,
      minha: false,
      seguindo: false,
      bairro: "Dom Pedro",
    })
    expect(pergunta?.created_at).toBeTypeOf("string")
    expect(pergunta?.autor.iniciais).toBe("DF")
  })

  it("entrega o caminho de erro quando a demonstração está marcada para falhar", async () => {
    const comFalha = criarFonteDeDemonstracao({ atrasoMs: 0, falharQuandoPedido: () => true })
    await expect(comFalha.listar({ ...PEDIDO, filtro: "para-ajudar" })).rejects.toThrow(
      FALHA_DA_DEMONSTRACAO,
    )
  })
})

describe("publicar, responder e resolver", () => {
  it("a pergunta publicada entra na lista e na memória", async () => {
    const fonteDaSessao = fonte()
    const publicada = await fonteDaSessao.publicar({
      titulo: "Costureira para barra de calça no Planalto?",
      corpo: "Chego em dezembro.",
      bairro: "Planalto",
    })
    expect(publicada.minha).toBe(true)
    expect(publicada.is_resolved).toBe(false)

    const minhas = await fonteDaSessao.listar({ ...PEDIDO, filtro: "minhas" })
    expect(ids(minhas.itens)).toEqual([publicada.id])
    expect((await fonteDaSessao.obter(publicada.id))?.title).toContain("Costureira")
  })

  it("responder soma na contagem e aparece nas respostas", async () => {
    const fonteDaSessao = fonte()
    const resposta = await fonteDaSessao.responder("a7", "Tem uma na Djalma Batista, abre 5h.")
    expect(resposta.minha).toBe(true)
    expect(resposta.ajudou).toBe(false)

    const respostas = await fonteDaSessao.respostas("a7")
    expect(respostas).toHaveLength(1)
    expect((await fonteDaSessao.obter("a7"))?.reply_count).toBe(1)
  })

  it("o histórico inclui a pergunta que a pessoa respondeu, como no protótipo", async () => {
    const fonteDaSessao = fonte()
    await fonteDaSessao.responder("a1", "Tem uma clínica perto daí.")
    const historico = await fonteDaSessao.minhas("Manaus")
    expect(ids(historico)).toEqual(["a1"])
  })

  it("'Útil' alterna e o contador anda junto", async () => {
    const fonteDaSessao = fonte()
    const antes = (await fonteDaSessao.respostas("a2"))[0]
    expect(antes?.util).toBe(3)

    await fonteDaSessao.marcarUtil("a2-r1")
    const marcada = (await fonteDaSessao.respostas("a2"))[0]
    expect(marcada?.util).toBe(4)
    expect(marcada?.marcada_util).toBe(true)

    await fonteDaSessao.marcarUtil("a2-r1")
    const desmarcada = (await fonteDaSessao.respostas("a2"))[0]
    expect(desmarcada?.util).toBe(3)
    expect(desmarcada?.marcada_util).toBe(false)
  })

  it("resolver marca a resposta escolhida e reabrir desfaz, só para a autoria", async () => {
    const fonteDaSessao = fonte()
    await fonteDaSessao.resolver("a3", "a3-r2")
    const resolvida = await fonteDaSessao.obter("a3")
    expect(resolvida?.is_resolved).toBe(true)
    expect(resolvida?.resolved_reply_body).toContain("autorizada")
    const respostas = await fonteDaSessao.respostas("a3")
    expect(respostas.filter((item) => item.ajudou).map((item) => item.id)).toEqual(["a3-r2"])

    await fonteDaSessao.reabrir("a3")
    const reaberta = await fonteDaSessao.obter("a3")
    expect(reaberta?.is_resolved).toBe(false)
    expect(reaberta?.resolved_reply_body).toBeNull()
    const depois = await fonteDaSessao.respostas("a3")
    expect(depois.some((item) => item.ajudou)).toBe(false)
  })

  it("seguir respostas é um estado pessoal, guardado na pergunta", async () => {
    const fonteDaSessao = fonte()
    await fonteDaSessao.definirSeguindo("a1", true)
    expect((await fonteDaSessao.obter("a1"))?.seguindo).toBe(true)
    await fonteDaSessao.definirSeguindo("a1", false)
    expect((await fonteDaSessao.obter("a1"))?.seguindo).toBe(false)
  })
})

describe("perguntas parecidas", () => {
  it("acha a resposta já resolvida pelos termos da busca", async () => {
    const parecidas = await fonte().parecidas("veterinário à noite", "Manaus")
    expect(ids(parecidas)).toEqual(["a5"])
  })

  it("só sugere o que já está resolvido", async () => {
    const fonteDaSessao = fonte()
    // a2 fala em escola, mas ainda não foi resolvida: não entra.
    expect(await fonteDaSessao.parecidas("escola 3º ano", "Manaus")).toEqual([])

    await fonteDaSessao.resolver("a2", "a2-r1")
    expect(ids(await fonteDaSessao.parecidas("escola 3º ano", "Manaus"))).toEqual(["a2"])
  })

  it("acha termos com hífen e sem acento, como a busca do protótipo", async () => {
    const fonteDaSessao = fonte()
    expect(await fonteDaSessao.parecidas("hilux", "Manaus")).toEqual([])

    await fonteDaSessao.resolver("a3", "a3-r1")
    expect(ids(await fonteDaSessao.parecidas("hilux", "Manaus"))).toEqual(["a3"])
  })

  it("sem termo útil não sugere nada", async () => {
    expect(await fonte().parecidas("   de ", "Manaus")).toEqual([])
  })
})

describe("o texto de apoio", () => {
  it("normaliza acento e caixa", () => {
    expect(normalizar("Educação, Planalto")).toBe("educacao, planalto")
  })

  it("tira as palavras de ligação que o protótipo tira", () => {
    expect(termosDeBusca("pediatra para perto do plano")).toEqual(["pediatra", "plano"])
  })

  it("combina por sinônimo, como a busca do protótipo", () => {
    expect(combina("dentista", "clínica odontológica no Centro")).toBe(true)
    expect(combina("pediatra", "escola infantil")).toBe(false)
  })

  it("escreve a idade do registro em palavras", () => {
    const agora = Date.parse("2026-10-24T12:00:00.000Z")
    expect(quandoRelativo("2026-10-24T11:00:00.000Z", agora)).toBe("agora")
    expect(quandoRelativo("2026-10-23T12:00:00.000Z", agora)).toBe("ontem")
    expect(quandoRelativo("2026-10-21T12:00:00.000Z", agora)).toBe("há 3 dias")
    expect(quandoRelativo("2026-10-17T12:00:00.000Z", agora)).toBe("semana passada")
    expect(quandoRelativo("2026-10-03T12:00:00.000Z", agora)).toBe("há 3 semanas")
  })
})
