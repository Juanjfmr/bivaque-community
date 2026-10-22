import type { OutboxMessage } from "@bivaque/domain"
import { describe, expect, it } from "vitest"
import { renderEmail } from "web/lib/outbox/adapters"

// DATA-002 (ADR-20261022-fundacao-dados): a resposta do chamado chega por e-mail, como no
// protótipo. O banco põe a resposta no payload (pgTAP supabase/tests/support-tickets.sql); aqui
// fica o texto que a pessoa recebe.
function answered(payload: Record<string, unknown>): OutboxMessage {
  return {
    id: "o-1",
    recipient: "member-two@example.invalid",
    channel: "email",
    type: "support_answered",
    payload,
    attempts: 0,
    updatedAt: 1000,
  }
}

describe("e-mail de chamado respondido", () => {
  it("leva a resposta e aponta para Meus chamados", () => {
    const email = renderEmail(
      answered({ ticket_id: "t-1", topic: "comunidade", reply: "As regras estão na Ajuda." }),
    )
    expect(email.subject).toBe("Respondemos o seu chamado")
    expect(email.text).toContain("As regras estão na Ajuda.")
    expect(email.text).toContain("/ajuda")
  })

  it("não cai no aviso genérico", () => {
    expect(renderEmail(answered({ reply: "ok" })).subject).not.toBe("Atualização do Bivaque")
  })
})
