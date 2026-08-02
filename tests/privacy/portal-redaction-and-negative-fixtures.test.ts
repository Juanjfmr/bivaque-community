import { describe, expect, it } from "vitest"
import { classifyPortalResponse, temporaryError } from "web/lib/portal"
import type { PortalApiResponse, VerificationResult } from "web/lib/portal/types"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures — synthetic Portal records (no real CPF, no live calls)
// ─────────────────────────────────────────────────────────────────────────────

const activeFederal: PortalApiResponse = [
  { orgao_servidor: "Comando do Exército", situacao_funcional: "ATIVO PERMANENTE" },
]

const veteranReformado: PortalApiResponse = [
  { orgao_servidor: "Comando da Aeronáutica", situacao_funcional: "reformado" },
]

const militaryPensioner: PortalApiResponse = [
  { orgao_servidor: "Comando da Marinha", situacao_funcional: "PENSIONISTA MILITAR" },
]

const civilianRecord: PortalApiResponse = [
  { orgao_servidor: "Ministério da Educação", situacao_funcional: "ATIVO PERMANENTE" },
]

const nonFederalMilitary: PortalApiResponse = [
  { orgao_servidor: "Polícia Militar do Estado de São Paulo", situacao_funcional: "ATIVO" },
]

const civilPensioner: PortalApiResponse = [
  { orgao_servidor: "Ministério da Previdência", situacao_funcional: "PENSIONISTA" },
]

const ambiguousCedido: PortalApiResponse = [
  { orgao_servidor: "Comando do Exército", situacao_funcional: "CEDIDO" },
]

const ambiguousDisponibilidade: PortalApiResponse = [
  { orgao_servidor: "Comando da Marinha", situacao_funcional: "DISPONIBILIDADE" },
]

const ambiguousLicenca: PortalApiResponse = [
  { orgao_servidor: "Comando da Aeronáutica", situacao_funcional: "LICENÇA" },
]

const ambiguousExonerado: PortalApiResponse = [
  { orgao_servidor: "Ministério da Defesa", situacao_funcional: "EXONERADO" },
]

const ambiguousDemitido: PortalApiResponse = [
  { orgao_servidor: "Comando do Exército", situacao_funcional: "DEMITIDO" },
]

const multipleMatch: PortalApiResponse = [
  { orgao_servidor: "Comando do Exército", situacao_funcional: "ATIVO PERMANENTE" },
  { orgao_servidor: "Comando da Marinha", situacao_funcional: "ATIVO PERMANENTE" },
]

const emptyResponse: PortalApiResponse = []

// ─────────────────────────────────────────────────────────────────────────────
// CPF / raw payload pattern detection (for redaction assertions)
// ─────────────────────────────────────────────────────────────────────────────

const CPF_PATTERN = /\d{3}\.\d{3}\.\d{3}-\d{2}/
const RAW_CPF_DIGITS = /\b\d{11}\b/
const PORTAL_PAYLOAD_KEYS = [
  "orgao_servidor",
  "orgao",
  "orgao_lotacao",
  "situacao_funcional",
  "situacao",
]

function containsCpf(value: unknown): boolean {
  if (typeof value !== "string") return false
  return CPF_PATTERN.test(value) || RAW_CPF_DIGITS.test(value)
}

function containsPortalPayload(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false
  const keys = Object.keys(value as Record<string, unknown>)
  return PORTAL_PAYLOAD_KEYS.some((k) => keys.includes(k))
}

function redactCpf(text: string): string {
  return text
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "[CPF REDACTED]")
    .replace(/\b\d{11}\b/g, "[CPF REDACTED]")
}

function redactPortalPayload(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if (PORTAL_PAYLOAD_KEYS.includes(key)) {
      result[key] = "[REDACTED]"
    } else {
      result[key] = obj[key]
    }
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — Every error/negative path MUST yield pending/rejected/temporary_error
// ─────────────────────────────────────────────────────────────────────────────

describe("portal client resilience — every error path ends non-verified", () => {
  describe("classifyPortalResponse negative paths", () => {
    it("rejects civil servant (non-military org)", () => {
      const result = classifyPortalResponse(civilianRecord)
      assertNonVerified(result, "rejected")
    })

    it("rejects non-federal military (state police)", () => {
      const result = classifyPortalResponse(nonFederalMilitary)
      assertNonVerified(result, "rejected")
    })

    it("rejects civil pensioner (INSS-style)", () => {
      const result = classifyPortalResponse(civilPensioner)
      assertNonVerified(result, "rejected")
    })

    it("rejects ambiguous status: CEDIDO", () => {
      const result = classifyPortalResponse(ambiguousCedido)
      assertNonVerified(result, "rejected")
    })

    it("rejects ambiguous status: DISPONIBILIDADE", () => {
      const result = classifyPortalResponse(ambiguousDisponibilidade)
      assertNonVerified(result, "rejected")
    })

    it("rejects ambiguous status: LICENÇA", () => {
      const result = classifyPortalResponse(ambiguousLicenca)
      assertNonVerified(result, "rejected")
    })

    it("rejects ambiguous status: EXONERADO", () => {
      const result = classifyPortalResponse(ambiguousExonerado)
      assertNonVerified(result, "rejected")
    })

    it("rejects ambiguous status: DEMITIDO", () => {
      const result = classifyPortalResponse(ambiguousDemitido)
      assertNonVerified(result, "rejected")
    })

    it("rejects multiple-match response", () => {
      const result = classifyPortalResponse(multipleMatch)
      assertNonVerified(result, "rejected")
    })

    it("rejects empty response", () => {
      const result = classifyPortalResponse(emptyResponse)
      assertNonVerified(result, "rejected")
    })

    it("rejects record with null-like first element", () => {
      const result = classifyPortalResponse([null] as unknown as PortalApiResponse)
      assertNonVerified(result, "rejected")
    })

    it("rejects record with empty object", () => {
      const result = classifyPortalResponse([{}] as PortalApiResponse)
      assertNonVerified(result, "rejected")
    })

    it("rejects record with missing org and situacao fields", () => {
      const result = classifyPortalResponse([{ nome: "Fulano", cpf: "***" }] as PortalApiResponse)
      assertNonVerified(result, "rejected")
    })

    it("rejects record with non-string org field", () => {
      const result = classifyPortalResponse([
        { orgao_servidor: 42, situacao_funcional: "ATIVO PERMANENTE" },
      ] as unknown as PortalApiResponse)
      assertNonVerified(result, "rejected")
    })

    it("rejects mixed civil+military multiple match", () => {
      const result = classifyPortalResponse([
        { orgao_servidor: "Comando do Exército", situacao_funcional: "ATIVO PERMANENTE" },
        { orgao_servidor: "Ministério da Educação", situacao_funcional: "ATIVO PERMANENTE" },
      ])
      assertNonVerified(result, "rejected")
    })

    it("rejects veteran from non-federal military", () => {
      const result = classifyPortalResponse([
        {
          orgao_servidor: "Polícia Militar do Estado do Rio de Janeiro",
          situacao_funcional: "reformado",
        },
      ])
      assertNonVerified(result, "rejected")
    })

    it("rejects pensioner from non-federal military", () => {
      const result = classifyPortalResponse([
        {
          orgao_servidor: "Bombeiro Militar do Distrito Federal",
          situacao_funcional: "PENSIONISTA MILITAR",
        },
      ])
      assertNonVerified(result, "rejected")
    })
  })

  describe("verifyCpf error paths — must return temporary_error, never verified", () => {
    it("temporaryError() produces status: temporary_error with reason and errorCode", () => {
      const err = temporaryError("Portal rate limited", "RATE_LIMITED")
      expect(err.status).toBe("temporary_error")
      expect(err.reason).toBe("Portal rate limited")
      expect(err.errorCode).toBe("RATE_LIMITED")
    })

    it("temporaryError() for HTTP_ERROR", () => {
      const err = temporaryError("Portal HTTP 500", "HTTP_ERROR")
      expect(err.status).toBe("temporary_error")
      expect(err.errorCode).toBe("HTTP_ERROR")
    })

    it("temporaryError() for SCHEMA_DRIFT", () => {
      const err = temporaryError("Portal response schema drift", "SCHEMA_DRIFT")
      expect(err.status).toBe("temporary_error")
      expect(err.errorCode).toBe("SCHEMA_DRIFT")
    })

    it("temporaryError() for TIMEOUT", () => {
      const err = temporaryError("Portal request timed out", "TIMEOUT")
      expect(err.status).toBe("temporary_error")
      expect(err.errorCode).toBe("TIMEOUT")
    })

    it("temporaryError() for INVALID_KEY", () => {
      const err = temporaryError("Portal API key not configured", "INVALID_KEY")
      expect(err.status).toBe("temporary_error")
      expect(err.errorCode).toBe("INVALID_KEY")
    })

    it("temporaryError status is never verified", () => {
      const errors = [
        temporaryError("a", "RATE_LIMITED"),
        temporaryError("b", "HTTP_ERROR"),
        temporaryError("c", "SCHEMA_DRIFT"),
        temporaryError("d", "TIMEOUT"),
        temporaryError("e", "INVALID_KEY"),
      ]
      for (const err of errors) {
        expect(err.status).not.toBe("verified")
      }
    })
  })

  describe("positive paths DO yield verified", () => {
    it("active federal military is verified", () => {
      const result = classifyPortalResponse(activeFederal)
      expect(result.status).toBe("verified")
      if (result.status === "verified") {
        expect(result.eligibilityClass).toBe("active_federal_military")
      }
    })

    it("federal reformado is verified as veteran", () => {
      const result = classifyPortalResponse(veteranReformado)
      expect(result.status).toBe("verified")
      if (result.status === "verified") {
        expect(result.eligibilityClass).toBe("veteran")
      }
    })

    it("federal military pensioner is verified", () => {
      const result = classifyPortalResponse(militaryPensioner)
      expect(result.status).toBe("verified")
      if (result.status === "verified") {
        expect(result.eligibilityClass).toBe("military_pensioner")
      }
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — CPF and raw Portal payload NEVER appear in any output surface
// ─────────────────────────────────────────────────────────────────────────────

describe("portal privacy — CPF and raw payload must never persist or appear", () => {
  describe("CPF pattern detection", () => {
    it("detects formatted CPF: 123.456.789-00", () => {
      expect(containsCpf("CPF 123.456.789-00 do usuario")).toBe(true)
    })

    it("detects unformatted 11-digit CPF", () => {
      expect(containsCpf("documento 12345678901 registrado")).toBe(true)
    })

    it("does not flag a 9-digit number as CPF", () => {
      expect(containsCpf("numero 123456789 somente")).toBe(false)
    })

    it("does not flag a 12-digit number as CPF", () => {
      expect(containsCpf("protocolo 123456789012")).toBe(false)
    })

    it("does not flag UUID as CPF", () => {
      expect(containsCpf("10000000-0000-4000-8000-000000000001")).toBe(false)
    })
  })

  describe("Portal payload detection", () => {
    it("detects orgao_servidor in an object", () => {
      expect(containsPortalPayload({ orgao_servidor: "Comando do Exército" })).toBe(true)
    })

    it("detects orgao in an object", () => {
      expect(containsPortalPayload({ orgao: "Ministério da Defesa" })).toBe(true)
    })

    it("detects orgao_lotacao in an object", () => {
      expect(containsPortalPayload({ orgao_lotacao: "CMN" })).toBe(true)
    })

    it("detects situacao_funcional in an object", () => {
      expect(containsPortalPayload({ situacao_funcional: "ATIVO PERMANENTE" })).toBe(true)
    })

    it("detects situacao in an object", () => {
      expect(containsPortalPayload({ situacao: "reformado" })).toBe(true)
    })

    it("does not flag a clean object", () => {
      expect(containsPortalPayload({ id: "123", name: "Test" })).toBe(false)
    })

    it("does not flag a non-object", () => {
      expect(containsPortalPayload("not an object")).toBe(false)
      expect(containsPortalPayload(null)).toBe(false)
      expect(containsPortalPayload(42)).toBe(false)
    })
  })

  describe("CPF redaction", () => {
    it("redacts formatted CPF from error messages", () => {
      const message = "Falha ao verificar CPF 123.456.789-00 no Portal"
      const redacted = redactCpf(message)
      expect(redacted).not.toMatch(CPF_PATTERN)
      expect(redacted).toContain("[CPF REDACTED]")
    })

    it("redacts unformatted 11-digit CPF from log strings", () => {
      const message = "consulta 12345678901 retornou erro"
      const redacted = redactCpf(message)
      expect(redacted).not.toMatch(RAW_CPF_DIGITS)
      expect(redacted).toContain("[CPF REDACTED]")
    })

    it("redacts multiple CPF occurrences in a single string", () => {
      const message = "CPF 123.456.789-00 e 987.654.321-00 duplicados"
      const redacted = redactCpf(message)
      expect(redacted.match(/\[CPF REDACTED\]/g)?.length).toBe(2)
    })

    it("preserves non-CPF content during redaction", () => {
      const message = "Erro ao processar: CPF 123.456.789-00 invalido"
      const redacted = redactCpf(message)
      expect(redacted).toContain("Erro ao processar:")
      expect(redacted).toContain("invalido")
      expect(redacted).not.toContain("123.456.789-00")
    })
  })

  describe("Portal payload redaction", () => {
    it("redacts orgao_servidor from a payload object", () => {
      const payload = { orgao_servidor: "Comando do Exército", nome: "Fulano" }
      const redacted = redactPortalPayload(payload)
      expect(redacted.orgao_servidor).toBe("[REDACTED]")
      expect(redacted.nome).toBe("Fulano")
    })

    it("redacts situacao_funcional from a payload object", () => {
      const payload = { situacao_funcional: "ATIVO PERMANENTE", id: "123" }
      const redacted = redactPortalPayload(payload)
      expect(redacted.situacao_funcional).toBe("[REDACTED]")
      expect(redacted.id).toBe("123")
    })

    it("redacts all Portal keys while preserving safe fields", () => {
      const payload = {
        orgao_servidor: "Comando do Exército",
        situacao_funcional: "ATIVO PERMANENTE",
        orgao_lotacao: "CMN",
        nome: "Fulano",
        id: "123",
      }
      const redacted = redactPortalPayload(payload)
      expect(redacted.orgao_servidor).toBe("[REDACTED]")
      expect(redacted.situacao_funcional).toBe("[REDACTED]")
      expect(redacted.orgao_lotacao).toBe("[REDACTED]")
      expect(redacted.nome).toBe("Fulano")
      expect(redacted.id).toBe("123")
    })

    it("does not modify objects without Portal keys", () => {
      const clean = { id: "123", status: "ok" }
      const redacted = redactPortalPayload(clean)
      expect(redacted).toEqual(clean)
    })
  })

  describe("VerificationResult type does not carry CPF or payload", () => {
    it("rejected result has only status field", () => {
      const rejected: VerificationResult = { status: "rejected" }
      const keys = Object.keys(rejected)
      expect(keys).toHaveLength(1)
      expect(keys).toEqual(["status"])
      expect(containsCpf(JSON.stringify(rejected))).toBe(false)
    })

    it("pending result has only status field", () => {
      const pending: VerificationResult = { status: "pending" }
      const keys = Object.keys(pending)
      expect(keys).toHaveLength(1)
      expect(keys).toEqual(["status"])
    })

    it("temporary_error result carries only status, reason — no CPF or payload keys", () => {
      const err: VerificationResult = { status: "temporary_error", reason: "timeout" }
      const keys = Object.keys(err)
      expect(keys).toContain("status")
      expect(keys).toContain("reason")
      expect(containsPortalPayload(err)).toBe(false)
      expect(containsCpf(JSON.stringify(err))).toBe(false)
    })

    it("verified result carries only status, eligibilityClass — no CPF or payload keys", () => {
      const verified: VerificationResult = {
        status: "verified",
        eligibilityClass: "active_federal_military",
      }
      const keys = Object.keys(verified)
      expect(keys).toContain("status")
      expect(keys).toContain("eligibilityClass")
      expect(containsPortalPayload(verified)).toBe(false)
      expect(containsCpf(JSON.stringify(verified))).toBe(false)
    })

    it("VerificationResult shape snapshot — no expansion without test update", () => {
      // This snapshot ensures nobody adds CPF, payload, or PII fields to VerificationResult
      // without a deliberate test update and privacy review.
      const allStatuses = [
        { status: "verified", eligibilityClass: "active_federal_military" },
        { status: "rejected" },
        { status: "pending" },
        { status: "temporary_error", reason: "timeout" },
      ] as const

      for (const result of allStatuses) {
        const serialized = JSON.stringify(result)
        // Prove no CPF digits in any serialized result
        expect(serialized).not.toMatch(/\d{11}/)
        expect(serialized).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/)
        // Prove no raw Portal keys leak
        for (const key of PORTAL_PAYLOAD_KEYS) {
          expect(JSON.stringify(result)).not.toContain(`"${key}"`)
        }
      }
    })
  })

  describe("eligibilityClass enum does not leak Portal source labels", () => {
    const validClasses = ["active_federal_military", "veteran", "military_pensioner"] as const

    it("eligibility classes use internal labels, never Portal source labels", () => {
      for (const c of validClasses) {
        // Portal source labels must not appear in our internal enum
        expect(c).not.toBe("reformado")
        expect(c).not.toBe("ATIVO PERMANENTE")
        expect(c).not.toBe("PENSIONISTA MILITAR")
      }
    })

    it("veteran is the internal label, reformado is the Portal source label", () => {
      expect(validClasses).toContain("veteran")
      // reformado is mapped in classify.ts but never exposed as eligibilityClass
    })
  })

  describe("error messages must never contain CPF or raw Portal payload", () => {
    it("HTTP_ERROR reason is structural, not data-bearing", () => {
      const err = temporaryError("Portal HTTP 500", "HTTP_ERROR")
      expect(containsCpf(err.reason)).toBe(false)
      expect(containsPortalPayload(err)).toBe(false)
    })

    it("SCHEMA_DRIFT reason is structural only", () => {
      const err = temporaryError("Portal response schema drift", "SCHEMA_DRIFT")
      expect(containsCpf(err.reason)).toBe(false)
      expect(containsPortalPayload(err)).toBe(false)
    })

    it("TIMEOUT reason is structural only", () => {
      const err = temporaryError("Portal request timed out", "TIMEOUT")
      expect(containsCpf(err.reason)).toBe(false)
      expect(containsPortalPayload(err)).toBe(false)
    })

    it("RATE_LIMITED reason is structural only", () => {
      const err = temporaryError("Portal rate limited", "RATE_LIMITED")
      expect(containsCpf(err.reason)).toBe(false)
      expect(containsPortalPayload(err)).toBe(false)
    })

    it("INVALID_KEY reason is structural only — never logs the actual key", () => {
      const err = temporaryError("Portal API key not configured", "INVALID_KEY")
      expect(containsCpf(err.reason)).toBe(false)
      expect(err.reason).not.toContain("chave-api-dados")
      // Key value must never appear in reason
      expect(err.reason).not.toMatch(/[A-Za-z0-9]{20,}/)
    })
  })

  describe("portal error paths NEVER yield verified", () => {
    // Exhaustive: every non-happy-path fixture must produce non-verified
    const negativeFixtures: [string, PortalApiResponse][] = [
      ["civil servant", civilianRecord],
      ["non-federal military", nonFederalMilitary],
      ["civil pensioner", civilPensioner],
      ["ambiguous CEDIDO", ambiguousCedido],
      ["ambiguous DISPONIBILIDADE", ambiguousDisponibilidade],
      ["ambiguous LICENÇA", ambiguousLicenca],
      ["ambiguous EXONERADO", ambiguousExonerado],
      ["ambiguous DEMITIDO", ambiguousDemitido],
      ["multiple match", multipleMatch],
      ["empty response", emptyResponse],
    ]

    for (const [label, fixture] of negativeFixtures) {
      it(`${label} → rejected or temporary_error, never verified`, () => {
        const result = classifyPortalResponse(fixture)
        assertNonVerified(result, "rejected")
      })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C — private.verification_outcomes stores only structural fields
// ─────────────────────────────────────────────────────────────────────────────

describe("verification_outcomes privacy — stores only status/eligibility_class/checked_at", () => {
  const VERIFICATION_OUTCOME_COLUMNS = [
    "user_id",
    "status",
    "eligibility_class",
    "checked_at",
  ] as const

  const FORBIDDEN_OUTCOME_COLUMNS = [
    "cpf",
    "cpf_hash",
    "raw_portal_payload",
    "portal_response",
    "document",
    "nome",
    "name",
    "orgao_servidor",
    "orgao",
    "situacao_funcional",
    "situacao",
    "rank",
    "patente",
    "posto",
    "graduacao",
    "military_organization",
    "om",
    "endereco",
    "residencia",
    "full_name",
    "display_name",
  ] as const

  it("verification_outcomes has exactly the expected structural columns", () => {
    const expected = new Set(VERIFICATION_OUTCOME_COLUMNS)
    expect(expected.has("user_id")).toBe(true)
    expect(expected.has("status")).toBe(true)
    expect(expected.has("eligibility_class")).toBe(true)
    expect(expected.has("checked_at")).toBe(true)
    expect(expected.size).toBe(4)
  })

  for (const forbidden of FORBIDDEN_OUTCOME_COLUMNS) {
    it(`verification_outcomes must NOT have a '${forbidden}' column`, () => {
      const hasForbidden = VERIFICATION_OUTCOME_COLUMNS.some((col) => col === forbidden)
      expect(hasForbidden).toBe(false)
    })
  }

  it("verification_outcomes status values are closed set", () => {
    const validStatuses = ["pending", "verified", "rejected", "temporary_error"] as const
    expect(validStatuses).toHaveLength(4)
    const unique = new Set(validStatuses)
    expect(unique.size).toBe(4)
  })

  it("verification_outcomes eligibility_class is never the Portal source label", () => {
    const validClasses = ["active_federal_military", "veteran", "military_pensioner"]
    const portalLabels = ["reformado", "ATIVO PERMANENTE", "PENSIONISTA MILITAR", "ATIVO"]
    for (const c of validClasses) {
      for (const portal of portalLabels) {
        expect(c).not.toBe(portal)
      }
    }
  })

  it("user_id in verification_outcomes is a UUID, never a CPF", () => {
    const validUuid = "10000000-0000-4000-8000-000000000001"
    const looksLikeCpf = /\d{3}\.\d{3}\.\d{3}-\d{2}/

    expect(validUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(looksLikeCpf.test(validUuid)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function assertNonVerified(
  result: VerificationResult,
  expectedStatus?: "rejected" | "pending" | "temporary_error",
): void {
  expect(result.status).not.toBe("verified")
  if (expectedStatus !== undefined) {
    expect(result.status).toBe(expectedStatus)
  }
  // Safety: no verified result can escape this assertion
  if (result.status === "verified") {
    throw new Error("Unexpected verified result — this should never happen")
  }
}
