import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  type CidadeDaCasca,
  cidadeDoConteudo,
  cidadesDaCasca,
  comCidadeDaSessao,
  comCidadeTrocada,
  textoDaFaixaDeVisita,
} from "@/lib/casca"
import { dadosDoApp } from "@/lib/dados"

// A cidade da casca (BUG-CIDADE-GRUPOS): o chip e a cidade de casa vêm da
// SESSÃO; o conteúdo do Início é sempre o da cidade da sessão, e a cidade
// escolhida no chip só aparece na faixa de visita. Vazio é "ainda não sei" — o
// chip neutro, nunca o padrão de demonstração.
//
// O provedor não é renderizado: `apps/app` não tem jsdom nem testing-library, e
// estas são as funções puras que ele chama, na ordem em que ele as chama (o
// perfil e o Início preenchem, a troca pelo chip manda).

const DESCONHECIDA: CidadeDaCasca = cidadesDaCasca({})
const CASCA = readFileSync(join(import.meta.dirname, "..", "src", "contexto", "casca.tsx"), "utf8")

describe("cidade da casca", () => {
  it("a casca nasce sem cidade: neutra, nunca o padrão de demonstração", () => {
    expect(DESCONHECIDA).toEqual({ cidade: "", cidadeDeCasa: "" })
    expect(DESCONHECIDA.cidade).not.toBe("Manaus")
    expect(cidadeDoConteudo(null, DESCONHECIDA)).toBe("sua cidade")
  })

  it("a semente da prova manda (é entrada da prova, não medida)", () => {
    expect(cidadesDaCasca({ cidade: "Recife", cidadeDeCasa: "Rio de Janeiro" })).toEqual({
      cidade: "Recife",
      cidadeDeCasa: "Rio de Janeiro",
    })
    // A base do modo de prova é a demonstração; a semente manda por cima.
    const demonstracao = dadosDoApp.resumoDaCasca()
    const base = { cidade: demonstracao.cidade, cidadeDeCasa: demonstracao.cidadeDeCasa }
    expect(cidadesDaCasca({ ...base, cidade: "Recife" })).toEqual({
      cidade: "Recife",
      cidadeDeCasa: "Manaus",
    })
  })

  it("sessão Rio: o chip e a casa viram Rio", () => {
    const cidades = comCidadeDaSessao(DESCONHECIDA, "Rio de Janeiro")
    expect(cidades).toEqual({ cidade: "Rio de Janeiro", cidadeDeCasa: "Rio de Janeiro" })
    expect(cidades.cidade).not.toBe("Manaus")
  })

  it("sessão vazia não muda nada: a casca continua neutra", () => {
    expect(comCidadeDaSessao(DESCONHECIDA, "   ")).toEqual(DESCONHECIDA)
  })

  it("lerPerfil que falha não deixa Manaus: o Início devolve a cidade da sessão", () => {
    // O efeito da casca: lerProgresso autenticado e lerPerfil recusado — a
    // casca não escreve nada. A consulta do Início chega com a cidade da
    // sessão e preenche os dois campos.
    const semPerfil = DESCONHECIDA
    expect(semPerfil.cidade).not.toBe("Manaus")
    const comInicio = comCidadeDaSessao(semPerfil, "Rio de Janeiro")
    expect(comInicio).toEqual({ cidade: "Rio de Janeiro", cidadeDeCasa: "Rio de Janeiro" })
    // As duas fontes são idempotentes: perfil e Início na ordem inversa dá o
    // mesmo estado.
    expect(comCidadeDaSessao(comInicio, "Rio de Janeiro")).toEqual(comInicio)
  })

  it("troca pelo chip antes da leitura é preservada; a leitura só traz a casa", () => {
    const trocada = comCidadeTrocada(DESCONHECIDA, "Recife")
    expect(trocada).toEqual({ cidade: "Recife", cidadeDeCasa: "" })
    const depoisDaLeitura = comCidadeDaSessao(trocada, "Rio de Janeiro")
    expect(depoisDaLeitura).toEqual({ cidade: "Recife", cidadeDeCasa: "Rio de Janeiro" })
    // A casa mudou, a vista escolhida continua.
    expect(comCidadeTrocada(depoisDaLeitura, "Rio de Janeiro").cidade).toBe("Rio de Janeiro")
  })

  it("trocar pelo chip muda a consultada e preserva a de casa", () => {
    const emCasa: CidadeDaCasca = { cidade: "Rio de Janeiro", cidadeDeCasa: "Rio de Janeiro" }
    const consultando = comCidadeTrocada(emCasa, "  Recife ")
    expect(consultando).toEqual({ cidade: "Recife", cidadeDeCasa: "Rio de Janeiro" })
    // Cidade em branco não muda nada.
    expect(comCidadeTrocada(consultando, " ")).toEqual(consultando)
  })

  it("sessão Rio com o chip em Recife: título e vazio dizem Rio, a faixa diz Recife", () => {
    const emCasa = comCidadeDaSessao(DESCONHECIDA, "Rio de Janeiro")
    const consultando = comCidadeTrocada(emCasa, "Recife")
    const doConteudo = cidadeDoConteudo("Rio de Janeiro", consultando)
    expect(doConteudo).toBe("Rio de Janeiro")
    expect(`Sua rede em ${doConteudo}`).toBe("Sua rede em Rio de Janeiro")
    expect(doConteudo).not.toBe("Recife")
    // A faixa de visita é o único lugar com a cidade escolhida.
    expect(textoDaFaixaDeVisita(consultando.cidade, consultando.cidadeDeCasa)).toBe(
      "Você está conhecendo Recife. Sua cidade atual é Rio de Janeiro.",
    )
  })

  it("sem o dado da consulta, o conteúdo reserva a cidade de casa, não a do chip", () => {
    expect(
      cidadeDoConteudo(null, { cidade: "Rio de Janeiro", cidadeDeCasa: "Rio de Janeiro" }),
    ).toBe("Rio de Janeiro")
    const titulo = cidadeDoConteudo(null, { cidade: "Recife", cidadeDeCasa: "Rio de Janeiro" })
    expect(titulo).toBe("Rio de Janeiro")
    expect(`Sua rede em ${titulo}`).toBe("Sua rede em Rio de Janeiro")
    expect(titulo).not.toBe("Recife")
    expect(cidadeDoConteudo(null, { cidade: "Recife", cidadeDeCasa: "" })).toBe("sua cidade")
    // A consulta é a fonte: mesmo com o chip em outra cidade, quem manda é ela.
    expect(cidadeDoConteudo("Rio de Janeiro", { cidade: "Recife", cidadeDeCasa: "" })).toBe(
      "Rio de Janeiro",
    )
  })

  // E2E completo do app em preview (sem servidor de sessão, correção 3): a casca
  // nascia sem cidade e nada a preenchia. Sem sessão, a demonstração é a fonte.
  it("sem sessão, a casca mostra a cidade da demonstração", () => {
    const demonstracao = dadosDoApp.resumoDaCasca().cidade
    expect(demonstracao).toBe("Manaus")
    expect(comCidadeDaSessao(DESCONHECIDA, demonstracao)).toEqual({
      cidade: demonstracao,
      cidadeDeCasa: demonstracao,
    })
    // O efeito do provedor só cai na demonstração no ramo sem sessão.
    expect(CASCA).toMatch(/if \(sessao\.autenticado === false\) \{\s*cidadeDaDemonstracao\(\)/)
    expect(CASCA.indexOf("lerPerfil({ signal: controle.signal })")).toBeGreaterThan(
      CASCA.indexOf("if (sessao.autenticado === false) {"),
    )
  })

  it("com sessão, a cidade da demonstração não entra", () => {
    const demonstracao = dadosDoApp.resumoDaCasca().cidade
    const comSessao = comCidadeDaSessao(DESCONHECIDA, "Rio de Janeiro")
    expect(comSessao.cidade).toBe("Rio de Janeiro")
    expect(comSessao.cidade).not.toBe(demonstracao)
    // A demonstração entra só em dois ramos sem sessão: resposta autenticado:false
    // e rota de progresso ausente (404, prévia estática). Nunca como reserva de
    // quem tem sessão.
    expect(CASCA.split("cidadeDaDemonstracao()")).toHaveLength(3)
  })
})
