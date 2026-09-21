import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ITEM 9 da auditoria de produção: falha de envio no fluxo de indicações.
// O verificador funcional viu `column "x_interno" does not exist` num alerta
// visível. Este teste guarda as duas metades do aceite: a pessoa recebe o que
// fazer em português, e a causa real continua registrada para quem depura.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  WRITE_FAILURE_COPY,
  resolutionOperation,
  writeFailure,
  type WriteOperation,
} from "web/lib/recommendations/write-failure-copy"

const root = join(import.meta.dirname, "..", "..", "..")
const componente = join(
  root,
  "apps",
  "web",
  "app",
  "components",
  "bivaque",
  "recommendation-requests.tsx",
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
    expect(WRITE_FAILURE_COPY.excluir_pedido).toContain("excluir o pedido")
    expect(WRITE_FAILURE_COPY.excluir_resposta).toContain("excluir a resposta")
    expect(WRITE_FAILURE_COPY.editar_resposta).toContain("alterações da resposta")
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

  it("mapeia a chave do botão de resolução para a ação que falhou", () => {
    expect(resolutionOperation("mark:pedido:resposta")).toBe("marcar_resposta")
    expect(resolutionOperation("clear:pedido")).toBe("limpar_marca")
    expect(resolutionOperation("reopen:pedido")).toBe("reabrir_pedido")
  })
})

describe("fiação em recommendation-requests.tsx", () => {
  const fonte = readFileSync(componente, "utf8")

  it("nenhum error.message do servidor vai direto para o feedback", () => {
    expect(fonte).not.toMatch(/setFeedback\(\s*\w*[Ee]rror\.message\s*\)/)
    expect(fonte).not.toMatch(/setFeedback\(\s*\w+\.message\s*\)/)
  })

  it("toda operação de escrita passa a causa crua para writeFailure", () => {
    const operacoesUsadas = [
      ...fonte.matchAll(/writeFailure\(\s*(?:"([a-z_]+)"|resolutionOperation\()/g),
    ].map((m) => m[1] ?? "resolucao-por-chave")
    expect(operacoesUsadas.length).toBeGreaterThanOrEqual(9)
    for (const nome of operacoesUsadas) {
      if (nome === "resolucao-por-chave") continue
      expect(OPERACOES).toContain(nome as WriteOperation)
    }
    // A causa é repassada, não engolida: a mensagem crua entra na chamada.
    const causasRepassadas = fonte.match(/[Ee]rror\.message/g) ?? []
    expect(causasRepassadas.length).toBeGreaterThanOrEqual(9)
  })

  it("usa o logger do projeto em vez de console direto", () => {
    expect(fonte).toContain('from "../../../lib/recommendations/write-failure-copy"')
    expect(fonte).not.toMatch(/console\.(error|warn|info)\(/)
  })
})