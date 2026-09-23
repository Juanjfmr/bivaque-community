import { describe, expect, it } from "vitest"
import {
  formatNotificationLabel,
  type NotificationRow,
  rendersWithActor,
  resolveNotificationHref,
  SERVICE_REQUEST_FIRST_REPLY,
  serviceRequestReplyLabel,
} from "web/app/(shell)/notifications/deep-links"

// ADR-20260922-aviso-da-primeira-resposta: o tipo service_request carrega dois avisos, e a
// action os separa. O risco nomeado no ADR é a resposta aparecer como "pedido encerrado".

function row(action: string): NotificationRow {
  return {
    id: "n-1",
    recipient_user_id: "u-1",
    actor_user_id: null,
    type: "service_request",
    action,
    target_type: "service_request",
    target_id: "req-1",
    read_at: null,
    created_at: "2026-09-22T12:00:00Z",
  }
}

describe("avisos de pedido de serviço", () => {
  it("a primeira resposta não aparece como pedido encerrado", () => {
    const label = formatNotificationLabel(row(SERVICE_REQUEST_FIRST_REPLY))
    expect(label).toBe("Seu pedido recebeu uma resposta")
    expect(label).not.toContain("encerrado")
  })

  it("o cancelamento pela saída da outra parte continua neutro", () => {
    expect(formatNotificationLabel(row("cancelled_counterpart_left"))).toBe(
      "O pedido em que você estava foi encerrado",
    )
  })

  it("com o nome da ficha, a frase nomeia o prestador; sem ele, fica neutra", () => {
    expect(serviceRequestReplyLabel("Climatiza Manaus")).toBe(
      "Climatiza Manaus respondeu seu pedido",
    )
    expect(serviceRequestReplyLabel(null)).toBe("Seu pedido recebeu uma resposta")
    expect(serviceRequestReplyLabel("  ")).toBe("Seu pedido recebeu uma resposta")
  })

  it("os dois avisos levam ao acompanhamento do pedido e não renderizam ator", () => {
    for (const action of [SERVICE_REQUEST_FIRST_REPLY, "cancelled_counterpart_left"]) {
      expect(resolveNotificationHref(row(action), null)).toBe("/pedidos/req-1")
      expect(rendersWithActor(row(action))).toBe(false)
    }
  })
})
