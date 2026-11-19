import { describe, expect, it } from "vitest"
import { conteudoDoPush, TITULO_DO_PUSH } from "web/lib/push/frases"

const TIPOS = [
  "comment",
  "group_post",
  "direct_message",
  "event_rsvp",
  "event_change",
  "event_reminder",
  "recommendation_request",
  "recommendation_reply",
  "service_request",
  "support_answered",
  "report_resolved",
  "moderation_decision",
  "verification_decision",
  "account_suspension",
  "group_admission",
  "invitation_accepted",
  "product_news",
  "listing_alert",
  "tipo_desconhecido",
] as const

describe("conteúdo do push", () => {
  it("tem título fixo e frase própria por tipo", () => {
    const frases = new Set<string>()
    for (const tipo of TIPOS) {
      const conteudo = conteudoDoPush(tipo, {})
      expect(conteudo.title).toBe(TITULO_DO_PUSH)
      expect(conteudo.body.length).toBeGreaterThan(0)
      frases.add(conteudo.body)
    }
    // Tipo desconhecido tem fallback; os demais não repetem a frase do outro.
    expect(frases.size).toBe(TIPOS.length)
  })

  it("não carrega nome, foto, trecho nem id de quem agiu", () => {
    for (const tipo of TIPOS) {
      const conteudo = conteudoDoPush(tipo, {
        user_id: "20000000-0000-4000-8000-000000000001",
        actor_id: "20000000-0000-4000-8000-000000000002",
        actor_name: "Fulano de Tal",
        actor_photo: "https://exemplo.invalid/foto.jpg",
        content: "trecho da conversa",
        target_type: "post",
        target_id: "90000000-0000-4000-8000-000000000001",
      })
      expect(Object.keys(conteudo).sort()).toEqual(["body", "destino", "title"])
      expect(JSON.stringify(conteudo)).not.toContain("Fulano")
      expect(JSON.stringify(conteudo)).not.toContain("foto.jpg")
      expect(JSON.stringify(conteudo)).not.toContain("trecho da conversa")
      expect(JSON.stringify(conteudo)).not.toContain("20000000-0000-4000-8000-000000000002")
    }
  })

  it("o destino é o mesmo deep link do F09 e tipo sem jornada cai na tela segura", () => {
    expect(
      conteudoDoPush("comment", {
        target_type: "post",
        target_id: "90000000-0000-4000-8000-000000000009",
      }).destino,
    ).toBe("/app/publicacao/90000000-0000-4000-8000-000000000009")
    expect(
      conteudoDoPush("support_answered", { target_type: "support_ticket", target_id: "ignorado" })
        .destino,
    ).toBe("/app/chamados")
    expect(conteudoDoPush("tipo_desconhecido", { target_type: "desconhecido" }).destino).toBe(
      "/app/voce",
    )
  })
})
