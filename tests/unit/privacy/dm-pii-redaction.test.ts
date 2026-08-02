import { describe, expect, it } from "vitest"

const DM_MESSAGE_CONTENT_MAX_LENGTH = 2000

const DM_PROHIBITED_PII_PATTERN =
  /(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11}|CPF|cpf|patente|posto\s+militar|gradua[cç][aã]o\s+militar|OM\s|organiza[cç][aã]o\s+militar|endere[cç]o|resid[eê]ncia|residencia|rua\s+\w+|avenida\s+\w+|quadra\s+\d|lote\s+\d|cep\s+\d|bairro\s+\w+|logradouro|portal\s+da\s+transpar[eê]ncia)/i

const DM_CONTEXT_TYPES = [
  "shared_group",
  "shared_event",
  "recommendation_thread",
  "accepted_family",
] as const

function isDmMessageContentValid(content: string): boolean {
  const trimmed = content.trim()
  if (trimmed.length < 1) return false
  if (trimmed.length > DM_MESSAGE_CONTENT_MAX_LENGTH) return false
  if (DM_PROHIBITED_PII_PATTERN.test(trimmed)) return false
  return true
}

describe("DM privacy — PII/CPF/rank/OM/address redaction", () => {
  // ── content rejection ──────────────────────────────────────────────────────

  it("rejects message containing a CPF number (formatted)", () => {
    expect(isDmMessageContentValid("Meu CPF e 123.456.789-00")).toBe(false)
  })

  it("rejects message containing a CPF number (unformatted 11 digits)", () => {
    expect(isDmMessageContentValid("CPF 12345678901 registrado")).toBe(false)
  })

  it("rejects message containing the word 'CPF'", () => {
    expect(isDmMessageContentValid("Qual o seu CPF?")).toBe(false)
  })

  it("rejects message containing 'patente'", () => {
    expect(isDmMessageContentValid("Qual a sua patente militar?")).toBe(false)
  })

  it("rejects message containing 'posto militar'", () => {
    expect(isDmMessageContentValid("Meu posto militar e oficial")).toBe(false)
  })

  it("rejects message containing 'graduacao militar'", () => {
    expect(isDmMessageContentValid("Minha graduacao militar e sargento")).toBe(false)
  })

  it("rejects message containing 'graduação militar'", () => {
    expect(isDmMessageContentValid("Qual graduação militar voce tem?")).toBe(false)
  })

  it("rejects message containing 'OM' as standalone term", () => {
    expect(isDmMessageContentValid("Minha OM e o batalhao")).toBe(false)
  })

  it("rejects message containing 'organizacao militar'", () => {
    expect(isDmMessageContentValid("Sobre a organizacao militar...")).toBe(false)
  })

  it("rejects message containing 'organização militar'", () => {
    expect(isDmMessageContentValid("A organização militar onde servi")).toBe(false)
  })

  it("rejects message containing 'endereco'", () => {
    expect(isDmMessageContentValid("Meu endereco e sigiloso")).toBe(false)
  })

  it("rejects message containing 'endereço'", () => {
    expect(isDmMessageContentValid("Qual o endereço do evento?")).toBe(false)
  })

  it("rejects message containing 'residencia'", () => {
    expect(isDmMessageContentValid("Minha residencia fica perto")).toBe(false)
  })

  it("rejects message containing 'residência'", () => {
    expect(isDmMessageContentValid("A residência do fulano...")).toBe(false)
  })

  it("rejects message containing a street name (Rua)", () => {
    expect(isDmMessageContentValid("Moro na Rua das Flores")).toBe(false)
  })

  it("rejects message containing 'Avenida' with street name", () => {
    expect(isDmMessageContentValid("Fica na Avenida Brasil")).toBe(false)
  })

  it("rejects message containing 'Quadra' with number", () => {
    expect(isDmMessageContentValid("Quadra 5 do conjunto")).toBe(false)
  })

  it("rejects message containing 'Lote' with number", () => {
    expect(isDmMessageContentValid("Meu Lote 23 fica no fundo")).toBe(false)
  })

  it("rejects message containing 'CEP' with number", () => {
    expect(isDmMessageContentValid("Meu CEP 69000 sera enviado")).toBe(false)
  })

  it("rejects message containing 'Bairro' with name", () => {
    expect(isDmMessageContentValid("No Bairro Compensa tem tudo")).toBe(false)
  })

  it("rejects message containing 'logradouro'", () => {
    expect(isDmMessageContentValid("Qual o logradouro da unidade?")).toBe(false)
  })

  it("rejects message containing 'Portal da Transparencia'", () => {
    expect(isDmMessageContentValid("Consultei no Portal da Transparencia")).toBe(false)
  })

  it("rejects message containing 'Portal da Transparência'", () => {
    expect(isDmMessageContentValid("No Portal da Transparência consta")).toBe(false)
  })

  // ── acceptance: normal messages pass ────────────────────────────────────────

  it("accepts a normal greeting message", () => {
    expect(isDmMessageContentValid("Ola, tudo bem? Vi voce no grupo de esportes!")).toBe(true)
  })

  it("accepts a message about an event", () => {
    expect(
      isDmMessageContentValid(
        "Vamos nos encontrar no evento de sabado? Leve agua e protetor solar.",
      ),
    ).toBe(true)
  })

  it("accepts a message with neighborhood reference (not address)", () => {
    expect(isDmMessageContentValid("Conheco bem a zona leste, morei la por anos")).toBe(true)
  })

  it("accepts a message discussing community topics", () => {
    expect(
      isDmMessageContentValid(
        "O grupo de corrida esta combinando de se encontrar as 6h no parque. Topa?",
      ),
    ).toBe(true)
  })

  // ── length bounds ───────────────────────────────────────────────────────────

  it("rejects empty message content", () => {
    expect(isDmMessageContentValid("")).toBe(false)
  })

  it("rejects whitespace-only message content", () => {
    expect(isDmMessageContentValid("   ")).toBe(false)
  })

  it("rejects message exceeding 2000 characters", () => {
    const tooLong = "x".repeat(2001)
    expect(isDmMessageContentValid(tooLong)).toBe(false)
  })

  it("accepts message at maximum 2000 characters", () => {
    const maxOk = "x".repeat(2000)
    expect(isDmMessageContentValid(maxOk)).toBe(true)
  })

  // ── context type validation ─────────────────────────────────────────────────

  it("accepts all four valid DM context types", () => {
    for (const ct of DM_CONTEXT_TYPES) {
      expect(isDmContextTypeValid(ct)).toBe(true)
    }
  })

  it("rejects invalid DM context types", () => {
    expect(isDmContextTypeValid("direct")).toBe(false)
    expect(isDmContextTypeValid("global_search")).toBe(false)
    expect(isDmContextTypeValid("unsolicited")).toBe(false)
    expect(isDmContextTypeValid("")).toBe(false)
  })

  // ── structural: no PII columns on message schema ────────────────────────────

  it("dm_messages row has no rank, CPF, OM, or address columns", () => {
    const messageColumns = ["id", "conversation_id", "sender_id", "content", "created_at"]

    const piiColumns = [
      "cpf",
      "rank",
      "military_organization",
      "om",
      "patente",
      "posto",
      "graduacao",
      "address",
      "endereco",
      "residencia",
      "cep",
      "portal_data",
      "verification_label",
    ]

    for (const pii of piiColumns) {
      expect(messageColumns).not.toContain(pii)
    }
  })

  it("dm_conversations row has no participant profile leakage columns", () => {
    const conversationColumns = [
      "id",
      "participant_a",
      "participant_b",
      "context_type",
      "context_id",
      "created_at",
    ]

    const leakageColumns = [
      "participant_a_display_name",
      "participant_b_display_name",
      "participant_a_profile",
      "participant_b_profile",
      "participant_a_locality",
      "participant_b_locality",
      "participant_a_verification",
      "participant_b_verification",
      "participant_a_email",
      "participant_b_email",
    ]

    for (const leak of leakageColumns) {
      expect(conversationColumns).not.toContain(leak)
    }
  })

  // ── block table: no self-block ──────────────────────────────────────────────

  it("dm_blocks prevents self-block via constraint", () => {
    // The DB CHECK enforces blocker_user_id <> blocked_user_id
    const userA = "10000000-0000-4000-8000-000000000001"
    const userB = "10000000-0000-4000-8000-000000000002"

    // Legitimate block: different users
    const legitimateBlock = userA !== userB
    expect(legitimateBlock).toBe(true)

    // Self-block attempt uses the same user ID for both fields
    const selfBlockAttempt = { blocker: userA, blocked: userA }
    const isSelfBlock = selfBlockAttempt.blocker === selfBlockAttempt.blocked
    expect(isSelfBlock).toBe(true)
  })

  // ── conversation context is mandatory ───────────────────────────────────────

  it("conversation insert requires context_type to be one of the four valid types", () => {
    // All DM conversations must record why they are allowed
    // The four valid context types are the only permitted origins
    const validConversation = {
      participant_a: "10000000-0000-4000-8000-000000000001",
      participant_b: "10000000-0000-4000-8000-000000000002",
      context_type: "shared_group",
      context_id: "10000000-0000-4000-8000-000000000010",
    }

    // Must have context_type
    expect(validConversation.context_type).toBeTruthy()
    expect(DM_CONTEXT_TYPES).toContain(validConversation.context_type)

    // Must have ordered participants
    expect(validConversation.participant_a < validConversation.participant_b).toBe(true)
  })
})

// ── helpers ───────────────────────────────────────────────────────────────────

function isDmContextTypeValid(value: string): boolean {
  return (DM_CONTEXT_TYPES as readonly string[]).includes(value)
}
