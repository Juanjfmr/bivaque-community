import { describe, expect, it } from "vitest"
import { countUnreadConversations } from "web/lib/messages/unread-conversations"

// O badge de conversas do cabeçalho conta conversas com algo novo — a mesma regra
// da caixa de conversas, agregada.

describe("conversas não lidas", () => {
  it("conta conversa, não mensagem", () => {
    const count = countUnreadConversations(
      [{ conversation_id: "a", last_read_at: "2026-09-20T10:00:00Z" }],
      [
        { conversation_id: "a", created_at: "2026-09-21T10:00:00Z" },
        { conversation_id: "a", created_at: "2026-09-21T11:00:00Z" },
      ],
    )
    expect(count).toBe(1)
  })

  it("mensagem anterior ou igual à última leitura não conta", () => {
    const count = countUnreadConversations(
      [{ conversation_id: "a", last_read_at: "2026-09-21T10:00:00Z" }],
      [
        { conversation_id: "a", created_at: "2026-09-21T10:00:00Z" },
        { conversation_id: "a", created_at: "2026-09-20T09:00:00Z" },
      ],
    )
    expect(count).toBe(0)
  })

  it("conversa nunca aberta é nova", () => {
    expect(
      countUnreadConversations([], [{ conversation_id: "b", created_at: "2026-09-21T10:00:00Z" }]),
    ).toBe(1)
  })

  it("sem mensagens de terceiros, nada é novo", () => {
    expect(
      countUnreadConversations(
        [{ conversation_id: "a", last_read_at: "2026-09-21T10:00:00Z" }],
        [],
      ),
    ).toBe(0)
  })
})
