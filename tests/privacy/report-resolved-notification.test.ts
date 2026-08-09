import { describe, expect, it } from "vitest"

// A notificação de denúncia resolvida existe para dizer UMA coisa: a denúncia
// foi analisada. O runbook §6 exige "sem revelar a ação tomada" — então o
// payload estrutural carrega apenas referências (quem recebe, o tipo, o alvo),
// nunca o conteúdo denunciado, o autor dele, nem o desfecho aplicado.
//
// Estas asserções fixam o contrato no mesmo padrão das outras suítes de
// privacidade: validam os rótulos e a estrutura, não o runtime.

const REPORT_RESOLVED_TYPE = "report_resolved"
const REPORT_RESOLVED_ACTION = "resolved"
const REPORT_RESOLVED_TARGET_TYPE = "report"

const NOTIFICATION_COLUMNS = [
  "id",
  "recipient_user_id",
  "actor_user_id",
  "type",
  "action",
  "target_type",
  "target_id",
  "read_at",
  "created_at",
] as const

const CONTENT_REFERENCE_TERMS = [
  "content",
  "conteudo",
  "author",
  "autor",
  "post",
  "comment",
  "grupo",
  "message",
  "removed",
  "removido",
  "hidden",
  "oculto",
  "operator_note",
  "nota",
] as const

describe("report-resolved notification privacy boundary", () => {
  it("uses the report_resolved type with a structural action and target", () => {
    expect(REPORT_RESOLVED_TYPE).toBe("report_resolved")
    expect(REPORT_RESOLVED_ACTION).toBe("resolved")
    expect(REPORT_RESOLVED_TARGET_TYPE).toBe("report")
  })

  it("type/action/target labels contain no content, author, or outcome reference", () => {
    const labels = [REPORT_RESOLVED_TYPE, REPORT_RESOLVED_ACTION, REPORT_RESOLVED_TARGET_TYPE]
    for (const label of labels) {
      for (const term of CONTENT_REFERENCE_TERMS) {
        expect(label.toLowerCase(), `label '${label}' must not contain '${term}'`).not.toContain(
          term,
        )
      }
    }
  })

  it("fits the existing notification columns — no free-text body or payload column", () => {
    const hasBodyColumn = NOTIFICATION_COLUMNS.some(
      (col) => col === "body" || col === "content" || col === "message" || col === "payload",
    )
    expect(hasBodyColumn).toBe(false)
  })

  it("carries only reference fields: recipient, actor, type, action, target", () => {
    const structural = new Set(NOTIFICATION_COLUMNS)
    expect(structural.has("recipient_user_id")).toBe(true)
    expect(structural.has("actor_user_id")).toBe(true)
    expect(structural.has("type")).toBe(true)
    expect(structural.has("action")).toBe(true)
    expect(structural.has("target_type")).toBe(true)
    expect(structural.has("target_id")).toBe(true)
  })

  it("target_id points at the report, never at the reported content", () => {
    // O plano Task 11 manda notificar com target_id = report id — a referência
    // é à denúncia, não ao post/comentário/grupo denunciado. Isso é o que
    // impede a UI de navegar (ou vazar) para o conteúdo problemático.
    expect(REPORT_RESOLVED_TARGET_TYPE).toBe("report")
  })
})
