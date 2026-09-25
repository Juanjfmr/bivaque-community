import { describe, expect, it } from "vitest"
import {
  CONVERSATION_UNAVAILABLE_MESSAGE,
  REQUEST_TERMINAL_MESSAGE,
  sendFailureLabel,
} from "web/app/components/bivaque/message-delivery"
import { newClientKey, shouldRotateClientKey } from "web/lib/service-requests/client-key"

describe("chave de repetição segura da resposta do prestador", () => {
  it("chave ainda não usada não precisa girar", () => {
    expect(shouldRotateClientKey(null, "qualquer texto")).toBe(false)
  })

  it("retry do mesmo texto (só espaço nas pontas mudou) mantém a chave", () => {
    expect(shouldRotateClientKey("Posso ir amanhã", " Posso ir amanhã ")).toBe(false)
  })

  it("texto editado depois de uma tentativa gira a chave", () => {
    expect(shouldRotateClientKey("Posso ir amanhã", "Posso ir amanhã às 9h")).toBe(true)
  })

  it("gera chaves distintas", () => {
    expect(newClientKey()).not.toBe(newClientKey())
  })
})

describe("falha de envio em pedido encerrado", () => {
  it("o erro do gatilho vira a frase de pedido encerrado, não de conexão", () => {
    expect(sendFailureLabel("request is terminal")).toBe(REQUEST_TERMINAL_MESSAGE)
  })

  it("a frase já traduzida pela action do pedido é preservada", () => {
    expect(sendFailureLabel(REQUEST_TERMINAL_MESSAGE)).toBe(REQUEST_TERMINAL_MESSAGE)
  })

  it("erro desconhecido continua genérico", () => {
    expect(sendFailureLabel("boom")).toContain("Verifique sua conexão")
  })
})

describe("falha de envio para conta em exclusão", () => {
  it.each([["recipient unavailable"], ["account unavailable"]])(
    "%s vira conversa indisponível, sem dizer quem saiu",
    (raw) => {
      expect(sendFailureLabel(raw)).toBe(CONVERSATION_UNAVAILABLE_MESSAGE)
    },
  )
})
