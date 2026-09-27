import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ITEM 9 da auditoria de produção: falha de envio no fluxo de indicações.
// O verificador funcional viu `column "x_interno" does not exist` num alerta
// visível. Este teste guarda as duas metades do aceite: a pessoa recebe o que
// fazer em português, e a causa real continua registrada para quem depura.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  WRITE_FAILURE_COPY,
  type WriteOperation,
  writeFailure,
} from "web/lib/recommendations/write-failure-copy"

const root = join(import.meta.dirname, "..", "..", "..")
// Desde 25/09/2026 a conversa do pedido é a tela de detalhe das indicações
// (ADR-20260925-memoria-de-indicacoes).
const componente = join(
  root,
  "apps",
  "web",
  "app",
  "components",
  "indications",
  "indication-detail.tsx",
)

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

describe("fiação em indication-detail.tsx", () => {
  const fonte = readFileSync(componente, "utf8")

  it("nenhum error.message do servidor vai direto para o feedback", () => {
    expect(fonte).not.toMatch(/setFeedback\(\s*\w*[Ee]rror\.message\s*\)/)
    expect(fonte).not.toMatch(/setFeedback\(\s*\w+\.message\s*\)/)
  })

  it("toda escrita passa pela operação identificada, com a causa junto", () => {
    // Uma porta só para as escritas: `run(chave, operação, chamada)`.
    expect(fonte).toContain("setFeedback(writeFailure(operation, error.message))")
    const operacoes = [...fonte.matchAll(/void run\(\s*[^,]+,\s*(?:saved \? )?"([a-z_]+)"/g)].map(
      (m) => m[1] as string,
    )
    expect(operacoes.length).toBeGreaterThanOrEqual(5)
    for (const nome of operacoes) expect(OPERACOES).toContain(nome as WriteOperation)
  })

  it("usa o logger do projeto em vez de console direto", () => {
    expect(fonte).toContain('from "../../../lib/recommendations/write-failure-copy"')
    expect(fonte).not.toMatch(/console\.(error|warn|info)\(/)
  })
})
