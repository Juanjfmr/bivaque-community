import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { OutboxMessage } from "@bivaque/domain"
import { describe, expect, it } from "vitest"
import {
  formatNotificationLabel,
  type NotificationRow,
  rendersWithActor,
  resolveNotificationHref,
} from "web/app/(shell)/notifications/deep-links"
import {
  notificationChannelAllows,
  outboxDeliveryAllowed,
  preferenceKeyForOutboxType,
  type TypePreferenceRow,
} from "web/lib/notifications/channel-preferences"
import { renderEmail } from "web/lib/outbox/adapters"

// ADR-20260925-aviso-de-pedido. O banco decide quem é avisado (pgTAP
// supabase/tests/aviso-de-pedido.sql); aqui ficam a cópia em TypeScript da
// regra de entrega que o despachante de e-mail usa, o texto e o destino de cada
// aviso no sino, e o e-mail do resumo.

const PREFS: TypePreferenceRow = {
  comments: true,
  events: true,
  messages: true,
  mentions: true,
  product_news: false,
}

function notification(action: string, targetId = "req-1"): NotificationRow {
  return {
    id: "n-1",
    recipient_user_id: "u-1",
    actor_user_id: null,
    type: "recommendation_request",
    action,
    target_type: action === "digest" ? "locality" : "recommendation_request",
    target_id: targetId,
    read_at: null,
    created_at: "2026-09-25T12:00:00Z",
  }
}

describe("preferência dos pedidos de indicação", () => {
  it("o aviso e o resumo são o mesmo tipo de preferência", () => {
    expect(preferenceKeyForOutboxType("recommendation_request")).toBe("indications")
    expect(preferenceKeyForOutboxType("indications_digest")).toBe("indications")
  })

  it("o sino nasce ligado e o e-mail nasce desligado", () => {
    const base = { type: "recommendation_request", preference: PREFS, matrix: [] }
    expect(notificationChannelAllows({ ...base, channel: "in_app" })).toBe(true)
    expect(notificationChannelAllows({ ...base, channel: "email" })).toBe(false)
  })

  it("quem ligou o e-mail recebe o resumo; quem desligou o tipo, nada", () => {
    const optedIn = [{ notification_type: "indications", channel: "email" as const, enabled: true }]
    const digest = { type: "indications_digest", outboxChannel: "email", matrix: optedIn }
    expect(outboxDeliveryAllowed({ ...digest, preference: PREFS })).toBe(true)
    expect(outboxDeliveryAllowed({ ...digest, preference: { ...PREFS, indications: false } })).toBe(
      false,
    )
    expect(outboxDeliveryAllowed({ ...digest, matrix: [], preference: PREFS })).toBe(false)
  })

  it("o despachante lê a coluna da preferência", () => {
    const route = readFileSync(
      join(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "apps",
        "web",
        "app",
        "api",
        "internal",
        "outbox",
        "route.ts",
      ),
      "utf8",
    )
    expect(route).toContain("product_news, indications")
  })
})

describe("o aviso no sino", () => {
  it("cada aviso diz o que aconteceu, sem ator", () => {
    expect(formatNotificationLabel(notification("new"))).toBe(
      "Alguém da sua cidade pediu uma indicação",
    )
    expect(formatNotificationLabel(notification("unanswered"))).toContain("ainda está sem resposta")
    expect(formatNotificationLabel(notification("resolve_prompt"))).toBe(
      "Alguma resposta ajudou a resolver seu pedido?",
    )
    expect(formatNotificationLabel(notification("digest"))).toContain("esperando resposta")
    expect(rendersWithActor(notification("new"))).toBe(false)
  })

  it("o aviso de um pedido abre o pedido; o do dia abre a lista da cidade", () => {
    expect(resolveNotificationHref(notification("new", "abc"), null)).toBe("/indicacoes/abc")
    expect(resolveNotificationHref(notification("resolve_prompt", "abc"), null)).toBe(
      "/indicacoes/abc",
    )
    expect(resolveNotificationHref(notification("digest", "loc"), null)).toBe(
      "/community?vista=indicacoes",
    )
  })
})

describe("o e-mail do resumo", () => {
  function digest(payload: Record<string, unknown>): OutboxMessage {
    return {
      id: "o-1",
      recipient: "member-one@example.invalid",
      channel: "email",
      type: "indications_digest",
      payload,
      attempts: 0,
      updatedAt: 1000,
    }
  }

  it("fala com a pessoa, lista os pedidos e diz como parar", () => {
    const email = renderEmail(
      digest({ city_name: "Manaus", open_count: 2, titles: ["Pediatra", "Eletricista"] }),
    )
    expect(email.subject).toBe("2 pedidos de indicação esperando resposta em Manaus")
    expect(email.text).toContain("• Pediatra")
    expect(email.text).toContain("• Eletricista")
    expect(email.text).toContain("/community?vista=indicacoes")
    expect(email.text).toContain("Configurações > Notificações")
  })

  it("um pedido só vai no singular", () => {
    expect(renderEmail(digest({ city_name: "Natal", open_count: 1, titles: [] })).subject).toBe(
      "1 pedido de indicação esperando resposta em Natal",
    )
  })
})

// Achado da prova de 25/09/2026: no celular a grade de Configurações crescia até
// o conteúdo mais largo (a tabela de canais), empurrando os interruptores para
// fora da tela. A coluna única precisa ter a largura da tela.
describe("Configurações no celular", () => {
  it("a coluna do conteúdo não cresce além da tela", () => {
    const layout = readFileSync(
      join(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "apps",
        "web",
        "app",
        "(shell)",
        "configuracoes",
        "layout.tsx",
      ),
      "utf8",
    )
    expect(layout).toContain("grid-cols-[minmax(0,1fr)]")
  })

  it("a tabela de canais rola sozinha se faltar espaço, nunca a página", () => {
    const page = readFileSync(
      join(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "apps",
        "web",
        "app",
        "(shell)",
        "configuracoes",
        "notificacoes",
        "page.tsx",
      ),
      "utf8",
    )
    expect(page).toContain('aria-label="Resumo diário de pedidos de indicação por e-mail"')
    expect(page).toContain("overflow-x-auto")
  })
})
