import { describe, expect, it } from "vitest"
import {
  formatNotificationLabel,
  type NotificationRow,
  rendersWithActor,
  resolveNotificationHref,
} from "../../../apps/web/app/(shell)/notifications/deep-links"

// RECON-052 — o convite de evento precisa de texto e destino em Notificacoes,
// senao o item cai no rotulo generico "nova notificacao" e nao navega. O
// destino e a rota do detalhe do evento, que a RLS de events deixa o convidado
// ler (ele e membro da localidade do evento — condicao de can_receive_invite).

function row(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: "10000000-0000-4000-8000-0000000000a1",
    recipient_user_id: "10000000-0000-4000-8000-000000000002",
    actor_user_id: "10000000-0000-4000-8000-000000000001",
    type: "event_invite",
    action: "invited",
    target_type: "event",
    target_id: "81000000-0000-4000-8000-000000000001",
    read_at: null,
    created_at: "2026-09-14T12:00:00.000Z",
    ...overrides,
  }
}

describe("deep-links — convite de evento (RECON-052)", () => {
  it("mostra o ator como um membro comum", () => {
    expect(rendersWithActor(row())).toBe(true)
  })

  it("tem rotulo proprio, nunca o generico", () => {
    const label = formatNotificationLabel(row())
    expect(label).toBe("convidou você para um evento")
    expect(label).not.toBe("nova notificação")
  })

  it("abre o detalhe do evento", () => {
    expect(resolveNotificationHref(row(), null)).toBe(
      "/events/81000000-0000-4000-8000-000000000001",
    )
  })
})
