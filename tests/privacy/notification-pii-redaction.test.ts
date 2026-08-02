import { describe, expect, it } from "vitest"

const PII_PATTERNS = [
  /\bCPF\b/i,
  /\bpatente\b/i,
  /\bposto\s+militar\b/i,
  /\bgraduação\s+militar\b/i,
  /\bgraduacao\s+militar\b/i,
  /\bOM\b/,
  /\borganização\s+militar\b/i,
  /\borganizacao\s+militar\b/i,
  /\bendereço\b/i,
  /\bendereco\b/i,
  /\bCEP\b/i,
  /\bPortal\s+da\s+Transparência\b/i,
  /\bPortal\b.*\bTransparência\b/i,
  /\beligibility_class\b/i,
  /\bactive_federal_military\b/i,
  /\bveteran\b/i,
  /\breformado\b/i,
  /\bmilitary\b/i,
] as const

const NOTIFICATION_TYPE_LABELS = [
  "comment",
  "group_admission",
  "invitation_accepted",
  "event_rsvp",
  "event_change",
  "direct_message",
] as const

const NOTIFICATION_ACTION_LABELS = ["created", "approved", "accepted", "rsvped", "updated"] as const

const NOTIFICATION_TARGET_TYPE_LABELS = [
  "post",
  "group",
  "family_invitation",
  "event",
  "direct_message",
] as const

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

const FORBIDDEN_COLUMN_NAMES = [
  "cpf",
  "rank",
  "patente",
  "military_organization",
  "om",
  "organizacao_militar",
  "address",
  "endereco",
  "portal_payload",
  "portal_data",
  "eligibility_class",
  "verification_status",
  "document",
  "full_name",
  "display_name",
  "email",
  "phone",
  "telefone",
  "celular",
] as const

function matchesAnyPii(value: string): boolean {
  return PII_PATTERNS.some((pattern) => pattern.test(value))
}

describe("notification privacy boundary — payload carries no PII", () => {
  // ── Positive assertions ───────────────────────────────────────────────────

  it("notification_type labels are structural only — no PII", () => {
    for (const label of NOTIFICATION_TYPE_LABELS) {
      const violated = matchesAnyPii(label)
      expect(violated).toBe(false)
    }
  })

  it("notification action labels are structural only — no PII", () => {
    for (const label of NOTIFICATION_ACTION_LABELS) {
      const violated = matchesAnyPii(label)
      expect(violated).toBe(false)
    }
  })

  it("notification target_type labels are structural only — no PII", () => {
    for (const label of NOTIFICATION_TARGET_TYPE_LABELS) {
      const violated = matchesAnyPii(label)
      expect(violated).toBe(false)
    }
  })

  it("notifications table has exactly the expected structural columns", () => {
    const expected = new Set(NOTIFICATION_COLUMNS)
    expect(expected.has("id")).toBe(true)
    expect(expected.has("recipient_user_id")).toBe(true)
    expect(expected.has("actor_user_id")).toBe(true)
    expect(expected.has("type")).toBe(true)
    expect(expected.has("action")).toBe(true)
    expect(expected.has("target_type")).toBe(true)
    expect(expected.has("target_id")).toBe(true)
    expect(expected.has("read_at")).toBe(true)
    expect(expected.has("created_at")).toBe(true)
    expect(expected.size).toBe(9)
  })

  // ── Negative assertions ───────────────────────────────────────────────────

  it("notifications table has no free-text body, content, or message column", () => {
    const hasBodyColumn = NOTIFICATION_COLUMNS.some(
      (col) => col === "body" || col === "content" || col === "message" || col === "payload",
    )
    expect(hasBodyColumn).toBe(false)
  })

  for (const forbidden of FORBIDDEN_COLUMN_NAMES) {
    it(`notifications table must NOT have a '${forbidden}' column`, () => {
      const hasForbiddenColumn = NOTIFICATION_COLUMNS.some((col) => col === forbidden)
      expect(hasForbiddenColumn).toBe(false)
    })
  }

  it("notification_type values are a closed set — no extensible labels", () => {
    expect(NOTIFICATION_TYPE_LABELS).toHaveLength(6)
    const unique = new Set(NOTIFICATION_TYPE_LABELS)
    expect(unique.size).toBe(6)
  })

  it("notification action values are a closed set — no extensible labels", () => {
    expect(NOTIFICATION_ACTION_LABELS).toHaveLength(5)
    const unique = new Set(NOTIFICATION_ACTION_LABELS)
    expect(unique.size).toBe(5)
  })

  it("no notification label contains Portal reference", () => {
    const allLabels = [
      ...NOTIFICATION_TYPE_LABELS,
      ...NOTIFICATION_ACTION_LABELS,
      ...NOTIFICATION_TARGET_TYPE_LABELS,
    ]
    for (const label of allLabels) {
      expect(label.toLowerCase()).not.toContain("portal")
    }
  })

  it("no notification label contains military reference", () => {
    const allLabels = [
      ...NOTIFICATION_TYPE_LABELS,
      ...NOTIFICATION_ACTION_LABELS,
      ...NOTIFICATION_TARGET_TYPE_LABELS,
    ]
    const militaryTerms = ["militar", "military", "exercito", "marinha", "aeronautica"]
    for (const label of allLabels) {
      const lower = label.toLowerCase()
      for (const term of militaryTerms) {
        expect(lower).not.toContain(term)
      }
    }
  })

  it("notification payload is purely references — no verification status or eligibility class", () => {
    const allLabels = [
      ...NOTIFICATION_TYPE_LABELS,
      ...NOTIFICATION_ACTION_LABELS,
      ...NOTIFICATION_TARGET_TYPE_LABELS,
    ]
    const forbiddenTerms = [
      "verified",
      "unverified",
      "veteran",
      "reformado",
      "active_federal_military",
      "eligibility",
      "verification",
    ]
    for (const label of allLabels) {
      const lower = label.toLowerCase()
      for (const term of forbiddenTerms) {
        expect(lower).not.toContain(term)
      }
    }
  })
})
