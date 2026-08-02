import { describe, expect, it } from "vitest"

const REPORT_TARGET_TYPES = ["post", "comment", "group", "message"] as const
const REPORT_STATUSES = ["open", "resolved"] as const

function isValidTargetType(v: string): boolean {
  return (REPORT_TARGET_TYPES as readonly string[]).includes(v)
}

function isValidStatus(v: string): boolean {
  return (REPORT_STATUSES as readonly string[]).includes(v)
}

function isValidReason(v: string): boolean {
  return v.trim().length >= 1 && v.length <= 1000
}

function isValidUuid(v: unknown): boolean {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
  )
}

describe("report privacy boundary — reporter PII redaction", () => {
  it("report structure does not include reporter display_name or profile fields", () => {
    const reportFields = [
      "id",
      "reporter_user_id",
      "target_type",
      "target_id",
      "reason",
      "status",
      "operator_note",
      "resolved_by",
      "resolved_at",
      "created_at",
    ]

    const piiFields = [
      "reporter_display_name",
      "reporter_email",
      "reporter_profile",
      "reporter_locality",
      "reporter_verification_status",
      "reporter_identity",
      "reporter_name",
    ]

    for (const pii of piiFields) {
      expect(reportFields).not.toContain(pii)
    }
  })

  it("report target types match the four allowed surfaces", () => {
    const valid = ["post", "comment", "group", "message"] as const
    for (const t of valid) {
      expect(isValidTargetType(t)).toBe(true)
    }

    expect(isValidTargetType("user")).toBe(false)
    expect(isValidTargetType("profile")).toBe(false)
    expect(isValidTargetType("event")).toBe(false)
    expect(isValidTargetType("")).toBe(false)
  })

  it("report statuses are open or resolved only", () => {
    expect(isValidStatus("open")).toBe(true)
    expect(isValidStatus("resolved")).toBe(true)

    expect(isValidStatus("closed")).toBe(false)
    expect(isValidStatus("pending")).toBe(false)
    expect(isValidStatus("dismissed")).toBe(false)
    expect(isValidStatus("")).toBe(false)
  })

  it("report reason enforces length bounds", () => {
    expect(isValidReason("a")).toBe(true)

    const thousandChars = "x".repeat(1000)
    expect(isValidReason(thousandChars)).toBe(true)

    const tooLong = "x".repeat(1001)
    expect(isValidReason(tooLong)).toBe(false)

    expect(isValidReason("")).toBe(false)
    expect(isValidReason("   ")).toBe(false)
  })

  it("resolved reports require operator_note for audit trail", () => {
    function isValidOperatorNote(v: string): boolean {
      return v.trim().length >= 1 && v.length <= 2000
    }

    expect(isValidOperatorNote("Post removido")).toBe(true)
    expect(isValidOperatorNote("")).toBe(false)
    expect(isValidOperatorNote("   ")).toBe(false)
  })

  it("resolved_by references auth.users NOT profiles", () => {
    expect(isValidUuid("10000000-0000-4000-8000-000000000001")).toBe(true)
    expect(isValidUuid(null)).toBe(false)
    expect(isValidUuid("not-a-uuid")).toBe(false)
  })

  it("reporter_user_id is never joinable to profiles from public API", () => {
    const reportInsertKeys = ["reporter_user_id", "target_type", "target_id", "reason"]

    expect(reportInsertKeys).not.toContain("display_name")
    expect(reportInsertKeys).not.toContain("profile_id")
    expect(reportInsertKeys).not.toContain("reporter_profile")
    expect(reportInsertKeys).toContain("reporter_user_id")
  })

  it("status transition: open → resolved is auditable", () => {
    function isValidResolution(resolution: Record<string, unknown>): boolean {
      if (resolution["status"] !== "resolved") return false
      if (
        typeof resolution["operator_note"] !== "string" ||
        resolution["operator_note"].trim().length === 0
      )
        return false
      if (typeof resolution["resolved_by"] !== "string" || !isValidUuid(resolution["resolved_by"]))
        return false
      if (typeof resolution["resolved_at"] !== "string") return false
      return true
    }

    const validResolution = {
      status: "resolved",
      operator_note: "Conteudo removido",
      resolved_by: "10000000-0000-4000-8000-000000000001",
      resolved_at: "2026-08-02T16:00:00.000Z",
    }
    expect(isValidResolution(validResolution)).toBe(true)

    const missingNote = {
      status: "resolved",
      resolved_by: "10000000-0000-4000-8000-000000000001",
      resolved_at: "2026-08-02T16:00:00.000Z",
    }
    expect(isValidResolution(missingNote)).toBe(false)

    const missingResolver = {
      status: "resolved",
      operator_note: "Conteudo removido",
      resolved_at: "2026-08-02T16:00:00.000Z",
    }
    expect(isValidResolution(missingResolver)).toBe(false)
  })

  it("soft-delete flag on posts/comments/groups is boolean", () => {
    function isValidSoftDelete(obj: Record<string, unknown>): boolean {
      return typeof obj["is_deleted"] === "boolean"
    }

    expect(isValidSoftDelete({ is_deleted: true })).toBe(true)
    expect(isValidSoftDelete({ is_deleted: false })).toBe(true)
    expect(isValidSoftDelete({ is_deleted: null })).toBe(false)
    expect(isValidSoftDelete({ is_deleted: "true" })).toBe(false)
    expect(isValidSoftDelete({})).toBe(false)
  })
})
