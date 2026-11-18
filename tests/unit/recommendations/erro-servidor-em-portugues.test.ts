import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ITEM 9 da auditoria de produção: falha de envio no fluxo de indicações.
// O verificador funcional viu `column "x_interno" does not exist` num alerta
// visível. Este teste guarda as duas metades do aceite: a pessoa recebe o que
// fazer em português, e a causa real continua registrada para quem depura.

import {
  WRITE_FAILURE_COPY,
  type WriteOperation,
  writeFailure,
} from "web/lib/recommendations/write-failure-copy"

const OPERACOES = Object.keys(WRITE_FAILURE_COPY) as WriteOperation[]

// O erro PostgREST que a UI mostrava literalmente.
const CRU = 'column "x_interno" does not exist'

// Vocabulário de banco/infraestrutura que nunca pode chegar à tela.
const JARGAO = [
  "x_interno",
  "does not exist",
  "column",
  "relation",
  "violates",
  "duplicate key",
  "null value",
  "permission denied",
  "PGRST",
  "PostgREST",
  "SQL",
  "schema",
]

let erroEspiado: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  erroEspiado = vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  erroEspiado.mockRestore()
})

describe("falha de escrita em indicações: frase de produto + causa no log", () => {
  it("toda operação tem frase em português e nenhuma vaza jargão do servidor", () => {
    for (const operacao of OPERACOES) {
      const mensagem = writeFailure(operacao, CRU)
      expect(mensagem, `operação ${operacao}`).toMatch(/^Não foi possível /)
      expect(mensagem, `operação ${operacao}`).toContain("Tente novamente.")
      for (const termo of JARGAO) {
        expect(mensagem.toLowerCase(), `operação ${operacao}`).not.toContain(termo.toLowerCase())
      }
    }
  })

  it("a mensagem crua do servidor NUNCA é o que volta para a tela", () => {
    for (const operacao of OPERACOES) {
      expect(writeFailure(operacao, CRU)).not.toContain(CRU)
    }
  })

  it("cada operação diz o que falhou: as frases são distintas entre si", () => {
    const frases = OPERACOES.map((operacao) => WRITE_FAILURE_COPY[operacao])
    expect(new Set(frases).size).toBe(OPERACOES.length)
    expect(WRITE_FAILURE_COPY.responder_pedido).toContain("enviar sua resposta")
    expect(WRITE_FAILURE_COPY.excluir_resposta).toContain("excluir a resposta")
    expect(WRITE_FAILURE_COPY.marcar_resposta).toContain("marcar a resposta")
    expect(WRITE_FAILURE_COPY.reabrir_pedido).toContain("reabrir o pedido")
  })

  it("registra a operação e a mensagem crua pelo logger do projeto, sem redigi-la", () => {
    writeFailure("responder_pedido", CRU)
    expect(erroEspiado).toHaveBeenCalledTimes(1)
    const linha = String(erroEspiado.mock.calls[0]?.[0] ?? "")
    const registro = JSON.parse(linha) as Record<string, unknown>
    expect(registro.level).toBe("error")
    expect(registro.msg).toBe("recommendation_write_failed")
    expect(registro.operation).toBe("responder_pedido")
    // A causa real precisa sobreviver ao logger: `raw_message` seria [REDACTED].
    expect(registro.serverMessage).toBe(CRU)
    expect(registro.serverMessage).not.toBe("[REDACTED]")
  })
})
