import { describe, expect, it } from "vitest"
import {
  estadoDoServidor,
  estadoParaServidor,
  paraServidor,
  progressoDoServidor,
  verificacaoDoStatus,
} from "../src/entrada/estado"
import { progressoInicial } from "../src/previa-f01/fluxo"

// A ponte entre o fluxo e o rascunho do servidor: forma fechada na volta,
// filtro na ida. Nenhum dado de sessão ou sensível atravessa.

describe("progresso vindo do servidor", () => {
  it("sem sessão devolve o progresso inicial", () => {
    expect(progressoDoServidor({ autenticado: false })).toEqual(progressoInicial())
  })

  it("monta a etapa e o estado conhecido", () => {
    const progresso = progressoDoServidor({
      autenticado: true,
      progresso: {
        versao: 2,
        etapa: "cidade",
        estado: { cidade: "Manaus", momento: "chegando", convite: false },
      },
    })
    expect(progresso.etapa).toBe("cidade")
    expect(progresso.cidade).toBe("Manaus")
    expect(progresso.momento).toBe("chegando")
    expect(progresso.convite).toBe(false)
  })

  it("versão diferente da atual volta ao progresso inicial, com etapa e estado descartados", () => {
    // Negativo (SEC-007): rascunho de outra versão não é aproveitado em parte.
    for (const versao of [1, 3, "2", undefined]) {
      const progresso = progressoDoServidor({
        autenticado: true,
        progresso: { versao, etapa: "cidade", estado: { cidade: "Manaus" } },
      })
      expect(progresso).toEqual(progressoInicial())
    }
  })

  it("etapa desconhecida ou fora da forma volta para a porta", () => {
    const progresso = progressoDoServidor({
      autenticado: true,
      progresso: { versao: 2, etapa: "senha", estado: [] },
    })
    expect(progresso.etapa).toBe("porta")
    expect(progresso.cidade).toBeNull()
  })

  it("descarta chave fora do contrato e valor de tipo errado", () => {
    const estado = estadoDoServidor({
      cidade: 42,
      momento: "morando-fora",
      interesses: ["Saúde", 7],
      nome: { nome: "Ana" },
      cpf: "123",
      email: "a@b.invalid",
    })
    expect(estado).toEqual({ interesses: ["Saúde"] })
  })

  it("preenche Interesses e Grupos quando vêm certos", () => {
    const estado = estadoDoServidor({
      nome: { nome: "Ana", sobrenome: "Souza" },
      interesses: ["Saúde"],
      grupos: ["40000000-0000-4000-8000-000000000010"],
      avisos: "ativados",
    })
    expect(estado).toEqual({
      nome: { nome: "Ana", sobrenome: "Souza" },
      interesses: ["Saúde"],
      grupos: ["40000000-0000-4000-8000-000000000010"],
      avisos: "ativados",
    })
  })
})

describe("estado enviado ao servidor", () => {
  it("leva só o que o rascunho guarda, nunca dado de sessão ou sensível", () => {
    const progresso = {
      ...progressoInicial(),
      etapa: "interesses" as const,
      via: "email" as const,
      emailMascarado: "a***@example.invalid",
      verificacao: "confirmada" as const,
      nome: { nome: "Ana", sobrenome: "Souza" },
      cidade: "Manaus",
      momento: "chegando" as const,
      interesses: ["Saúde"],
      grupos: ["g-1"],
      avisos: "agora-nao" as const,
    }
    expect(estadoParaServidor(progresso)).toEqual({
      nome: { nome: "Ana", sobrenome: "Souza" },
      cidade: "Manaus",
      momento: "chegando",
      interesses: ["Saúde"],
      grupos: ["g-1"],
      avisos: "agora-nao",
    })
    expect(Object.keys(estadoParaServidor(progresso))).not.toContain("cpf")
  })

  it("não inventa chave para caminho de convite", () => {
    const progresso = { ...progressoInicial(), convite: true }
    expect(estadoParaServidor(progresso)).toEqual({ convite: true })
  })

  it("paraServidor devolve versão, etapa e estado", () => {
    const progresso = { ...progressoInicial(), etapa: "aceite" as const, cidade: "Manaus" }
    expect(paraServidor(progresso)).toEqual({
      versao: progresso.versao,
      etapa: "aceite",
      estado: { cidade: "Manaus" },
    })
  })
})

describe("status da verificação", () => {
  it("traduz os quatro estados do servidor", () => {
    expect(verificacaoDoStatus("verified")).toBe("confirmada")
    expect(verificacaoDoStatus("pending")).toBe("consultando")
    expect(verificacaoDoStatus("rejected")).toBe("nao-encontrada")
    expect(verificacaoDoStatus("temporary_error")).toBe("portal-fora")
  })

  it("desconhecido ou nulo é não iniciada", () => {
    expect(verificacaoDoStatus(null)).toBe("nao-iniciada")
    expect(verificacaoDoStatus("qualquer")).toBe("nao-iniciada")
  })
})
