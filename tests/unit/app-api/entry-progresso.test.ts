import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  ETAPAS_DO_FLUXO,
  LIMITE_DO_ESTADO,
  progressoInicial,
  VERSAO_DO_FLUXO,
  validarProgresso,
} from "web/lib/app-api/entry-progresso"

// A rota é a única escritora do rascunho: esta validação é a fronteira entre o
// corpo do cliente e o JSONB no banco. Cada regra tem caso positivo e negativo.

const RAIZ = join(import.meta.dirname, "..", "..", "..")

describe("a lista de etapas é a mesma do app", () => {
  it("não drifa da máquina de estados do F01", () => {
    const fluxo = readFileSync(join(RAIZ, "apps", "app", "src", "previa-f01", "fluxo.ts"), "utf8")
    const doApp = [...fluxo.matchAll(/id: "([a-z-]+)",\s*noProgresso:/g)].map((achado) => achado[1])
    expect(doApp).toEqual([...ETAPAS_DO_FLUXO])
  })
})

describe("progresso válido", () => {
  it("aceita o mínimo: versão e etapa, sem estado", () => {
    expect(validarProgresso({ versao: VERSAO_DO_FLUXO, etapa: "porta" })).toEqual({
      ok: true,
      progresso: { versao: VERSAO_DO_FLUXO, etapa: "porta", estado: {} },
    })
  })

  it("aceita o estado completo e devolve só as chaves conhecidas, sem espaços nas pontas", () => {
    const resultado = validarProgresso({
      versao: 2,
      etapa: "interesses",
      estado: {
        nome: { nome: "  Ana ", sobrenome: "Souza " },
        cidade: " Manaus ",
        momento: "chegando",
        interesses: [" Saúde", "Escola e creche "],
        grupos: ["40000000-0000-4000-8000-000000000010"],
        avisos: "ativados",
        convite: false,
      },
    })
    expect(resultado).toEqual({
      ok: true,
      progresso: {
        versao: 2,
        etapa: "interesses",
        estado: {
          nome: { nome: "Ana", sobrenome: "Souza" },
          cidade: "Manaus",
          momento: "chegando",
          interesses: ["Saúde", "Escola e creche"],
          grupos: ["40000000-0000-4000-8000-000000000010"],
          avisos: "ativados",
          convite: false,
        },
      },
    })
  })

  it("o progresso inicial é a porta, na versão do fluxo", () => {
    expect(progressoInicial()).toEqual({ versao: VERSAO_DO_FLUXO, etapa: "porta", estado: {} })
  })
})

describe("progresso recusado", () => {
  it("corpo que não é objeto", () => {
    for (const corpo of [null, undefined, [], "x", 2]) {
      expect(validarProgresso(corpo), String(corpo)).toEqual({
        ok: false,
        motivo: "corpo-invalido",
      })
    }
  })

  it("versão diferente da atual é recusada, inclusive as antigas e as futuras", () => {
    // ADR-20261102: versão diferente não é migrada; a rota devolve o inicial.
    for (const versao of [VERSAO_DO_FLUXO - 1, VERSAO_DO_FLUXO + 1, 1, 999]) {
      expect(validarProgresso({ versao, etapa: "porta" }), String(versao)).toEqual({
        ok: false,
        motivo: "versao-invalida",
      })
    }
  })

  it("sobrenome vazio é aceito, nome vazio não", () => {
    const aceito = validarProgresso({
      versao: VERSAO_DO_FLUXO,
      etapa: "nome",
      estado: { nome: { nome: "Madonna", sobrenome: "" } },
    })
    expect(aceito).toEqual({
      ok: true,
      progresso: {
        versao: VERSAO_DO_FLUXO,
        etapa: "nome",
        estado: { nome: { nome: "Madonna", sobrenome: "" } },
      },
    })
    expect(
      validarProgresso({
        versao: VERSAO_DO_FLUXO,
        etapa: "nome",
        estado: { nome: { nome: "", sobrenome: "Souza" } },
      }),
    ).toEqual({ ok: false, motivo: "estado-invalido" })
  })

  it("versão fora da faixa ou que não é inteiro", () => {
    for (const versao of [0, 1001, 2.5, "2", null]) {
      expect(validarProgresso({ versao, etapa: "porta" }), String(versao)).toEqual({
        ok: false,
        motivo: "versao-invalida",
      })
    }
  })

  it("etapa fora da lista do fluxo", () => {
    for (const etapa of ["CPF", "xyz", "", 3]) {
      expect(validarProgresso({ versao: 2, etapa }), String(etapa)).toEqual({
        ok: false,
        motivo: "etapa-invalida",
      })
    }
  })

  it("estado que não é objeto ou chave desconhecida", () => {
    expect(validarProgresso({ versao: 2, etapa: "porta", estado: [] })).toEqual({
      ok: false,
      motivo: "estado-invalido",
    })
    expect(validarProgresso({ versao: 2, etapa: "porta", estado: { outra: 1 } })).toEqual({
      ok: false,
      motivo: "estado-invalido",
    })
  })

  it("campos de estado com tipo ou forma errados", () => {
    const casos = [
      { nome: "Ana" },
      { nome: { nome: "", sobrenome: "Souza" } },
      { nome: { nome: "Ana" } },
      { cidade: 42 },
      { momento: "morando-fora" },
      { interesses: "Saúde" },
      { interesses: ["x".repeat(61)] },
      { grupos: ["ok", 2] },
      { avisos: "talvez" },
      { convite: "sim" },
    ]
    for (const estado of casos) {
      expect(
        validarProgresso({ versao: 2, etapa: "porta", estado }),
        JSON.stringify(estado),
      ).toEqual({ ok: false, motivo: "estado-invalido" })
    }
  })

  it("dado sensível nunca entra no rascunho", () => {
    for (const chave of ["cpf", "CPF", "documento", "senha", "token", "email", "payload"]) {
      expect(
        validarProgresso({ versao: 2, etapa: "porta", estado: { [chave]: "123" } }),
        chave,
      ).toEqual({ ok: false, motivo: "campo-proibido" })
    }
  })

  it("rascunho grande demais é recusado", () => {
    const grupos = Array.from({ length: 100 }, (_, indice) => `${indice}`.padEnd(60, "x"))
    const resultado = validarProgresso({ versao: 2, etapa: "interesses", estado: { grupos } })
    expect(resultado).toEqual({ ok: false, motivo: "grande-demais" })
    expect(JSON.stringify({ grupos }).length).toBeGreaterThan(LIMITE_DO_ESTADO)
  })
})
