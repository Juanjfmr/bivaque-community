import type { OutboxMessage } from "@bivaque/domain"
import { describe, expect, it } from "vitest"
import { renderEmail } from "web/lib/outbox/adapters"

// PORT-006 (lote 4 da entrada): o e-mail do convite passa a trazer o código, e
// o link antigo continua valendo — agora com o código na URL. O banco guarda só
// o hash (20261023120000), então esta mensagem é um dos dois lugares em que o
// código existe em claro.
function invite(payload: Record<string, unknown>): OutboxMessage {
  return {
    id: "o-invite",
    recipient: "familiar@example.invalid",
    channel: "email",
    type: "family_invite",
    payload,
    attempts: 0,
    updatedAt: 1000,
  }
}

describe("e-mail de convite familiar", () => {
  it("leva o código, o prazo e o caminho de /convite", () => {
    const email = renderEmail(invite({ invite_code: "7k4m-9qrt", user_id: "u-1" }))
    expect(email.subject).toBe("Você recebeu um convite")
    expect(email.text).toContain("7K4M9QRT")
    expect(email.text).toContain("7 dias")
    expect(email.text).toContain("/convite?codigo=7K4M9QRT")
  })

  it("diz que o convite vale só para o e-mail que recebeu", () => {
    const email = renderEmail(invite({ invite_code: "7K4M9QRT" }))
    expect(email.text).toContain("só para este e-mail")
  })

  it("convite antigo, sem código, não promete código nenhum", () => {
    const email = renderEmail(invite({ user_id: "u-1" }))
    expect(email.text).not.toContain("Seu código é")
    expect(email.text).not.toContain("undefined")
    expect(email.subject).toBe("Você recebeu um convite")
  })

  it("não cai no aviso genérico", () => {
    expect(renderEmail(invite({ invite_code: "7K4M9QRT" })).subject).not.toBe(
      "Atualização do Bivaque",
    )
  })
})
