import { describe, expect, it } from "vitest"
import {
  falhaAoEditarPedido,
  falhaAoEncerrarPedido,
  falhaAoEnviarMensagem,
} from "../../../apps/web/lib/service-requests/tracking-falhas"

// PEDIDO-MENSAGEM-ERRO-CRU — o detalhe do pedido devolvia `error.message` do
// PostgREST para a tela: inglês técnico (`blocked`, `not a participant`,
// `message required`). Estes testes provam que cada recusa conhecida das três
// RPCs vira uma frase com saída, que a sessão vencida continua distinguida, e
// que uma recusa desconhecida cai numa frase genérica — nunca na mensagem crua.

describe("falha ao enviar mensagem no pedido", () => {
  it("traduz as recusas conhecidas de send_conversation_message", () => {
    expect(falhaAoEnviarMensagem({ message: "blocked" }).frase).toContain("bloqueou")
    expect(falhaAoEnviarMensagem({ message: "not a participant" }).frase).toContain("não participa")
    expect(falhaAoEnviarMensagem({ message: "conversation not found" }).frase).toContain(
      "conversa não está disponível",
    )
    expect(falhaAoEnviarMensagem({ message: "message required" }).frase).toContain("Revise")
    expect(falhaAoEnviarMensagem({ message: "message too long" }).frase).toContain("Revise")
    expect(falhaAoEnviarMensagem({ message: "account unavailable" }).frase).toContain(
      "não está disponível",
    )
    expect(falhaAoEnviarMensagem({ message: "recipient unavailable" }).frase).toContain(
      "não está disponível",
    )
    expect(falhaAoEnviarMensagem({ message: "contains pii" }).frase).toContain("dados pessoais")
  })

  it("mantém sessão vencida como estado próprio", () => {
    const falha = falhaAoEnviarMensagem({ message: "unauthenticated", code: "42501" })
    expect(falha.sessao).toBe(true)
    expect(falha.frase).toContain("sessão")
  })

  it("caminho genérico não repete a mensagem técnica", () => {
    const falha = falhaAoEnviarMensagem({
      message: "duplicate key value violates unique constraint dm_messages_pkey",
    })
    expect(falha.sessao).toBe(false)
    expect(falha.frase).not.toContain("duplicate")
    expect(falha.frase).not.toContain("constraint")
    expect(falha.frase).toContain("Seu texto continua aqui")
  })

  it("erro sem mensagem cai no genérico", () => {
    expect(falhaAoEnviarMensagem({}).frase).toContain("tente de novo")
  })
})

describe("falha ao encerrar o pedido", () => {
  it("traduz pedido indisponível e sem participação", () => {
    expect(falhaAoEncerrarPedido({ message: "request not found" }).frase).toContain(
      "não está disponível",
    )
    expect(falhaAoEncerrarPedido({ message: "not a participant" }).frase).toContain("não participa")
    expect(falhaAoEncerrarPedido({ message: "unauthenticated" }).sessao).toBe(true)
    expect(falhaAoEncerrarPedido({ message: "connection reset" }).frase).toContain("Tente de novo")
  })
})

describe("falha ao editar o pedido", () => {
  it("distingue quem não é o solicitante do pedido encerrado", () => {
    expect(falhaAoEditarPedido({ message: "only the requester can edit" }).frase).toContain(
      "não participa",
    )
    expect(falhaAoEditarPedido({ message: "request not editable" }).frase).toContain(
      "já foi encerrado",
    )
    expect(falhaAoEditarPedido({ message: "description too long" }).frase).toContain("Revise")
    expect(falhaAoEditarPedido({ message: "unauthenticated" }).sessao).toBe(true)
  })

  it("caminho genérico preserva o texto e não vaza SQL", () => {
    const falha = falhaAoEditarPedido({ message: "new row violates check constraint" })
    expect(falha.frase).toContain("Seu texto continua aqui")
    expect(falha.frase).not.toContain("constraint")
  })
})
