import { describe, expect, it } from "vitest"
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_FORMAT,
  INVITE_CODE_LENGTH,
  INVITE_CODE_RATE_LIMITED,
  INVITE_CODE_UNAVAILABLE,
  inviteMessageFor,
  isInviteCodeShape,
  normalizeInviteCode,
} from "web/lib/convite/code"
import {
  generateInviteCode,
  inviteCodeHash,
  inviteEmailDigest,
  inviteOriginDigest,
  originFromForwardedFor,
  sha256Hex,
} from "web/lib/convite/digest"

// PORT-006 (lote 4 da entrada), ADR-20261022-entrada-do-prototipo item 2: o
// código do convite de familiar. As propriedades provadas aqui são as que o
// banco supõe — alfabeto sem ambíguos, 8 caracteres, hash determinístico e
// normalização que aceita o que a pessoa digita — e as que a tela supõe: uma
// frase só para errado/vencido/usado e outra para limite.

describe("alfabeto do código", () => {
  it("tem 31 símbolos e nenhum que se confunda na leitura", () => {
    expect(INVITE_CODE_ALPHABET).toHaveLength(31)
    // 0/O e 1/I/L são o motivo de o alfabeto existir: fora dele, um código
    // ditado no telefone vira adivinhação.
    for (const ambiguous of ["0", "O", "1", "I", "L"]) {
      expect(INVITE_CODE_ALPHABET).not.toContain(ambiguous)
    }
  })

  it("não repete símbolo", () => {
    expect(new Set(INVITE_CODE_ALPHABET).size).toBe(INVITE_CODE_ALPHABET.length)
  })
})

describe("geração", () => {
  it("gera 8 caracteres do alfabeto", () => {
    for (let run = 0; run < 200; run += 1) {
      const code = generateInviteCode()
      expect(code).toHaveLength(INVITE_CODE_LENGTH)
      expect(isInviteCodeShape(code)).toBe(true)
    }
  })

  it("não repete o mesmo código em sequência", () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateInviteCode()))
    // 31^8 possibilidades: 500 sorteios colidirem seria sinal de gerador fixo.
    expect(codes.size).toBe(500)
  })
})

describe("o que a pessoa digita", () => {
  it("aceita minúsculas, espaços e hífen como o mesmo código", () => {
    expect(normalizeInviteCode(" 7k4m-9qrt ")).toBe("7K4M9QRT")
    expect(normalizeInviteCode("7k4m 9qrt")).toBe("7K4M9QRT")
    expect(inviteCodeHash("7k4m-9qrt")).toBe(inviteCodeHash("7K4M9QRT"))
  })

  it("recusa o que não tem forma de código sem ir ao banco", () => {
    expect(isInviteCodeShape("7K4M9QR")).toBe(false)
    expect(isInviteCodeShape("7K4M9QRTA")).toBe(false)
    // 0 e O não existem no alfabeto: o código digerido com eles é recusado.
    expect(isInviteCodeShape("0K4M9QRT")).toBe(false)
    expect(isInviteCodeShape("OK4M9QRT")).toBe(false)
  })
})

describe("digest", () => {
  it("é o sha256 hex da forma canônica", () => {
    expect(inviteCodeHash("7k4m-9qrt")).toBe(sha256Hex("7K4M9QRT"))
    expect(inviteCodeHash("7K4M9QRT")).toMatch(/^[0-9a-f]{64}$/)
  })

  it("códigos diferentes não colidem", () => {
    expect(inviteCodeHash("7K4M9QRT")).not.toBe(inviteCodeHash("7K4M9QRU"))
  })

  it("o e-mail usa a mesma normalização do banco: lower(trim())", () => {
    expect(inviteEmailDigest("  Familiar@Exemplo.COM ")).toBe(sha256Hex("familiar@exemplo.com"))
  })

  it("a origem é hasheada com prefixo de domínio e nunca volta ao IP", () => {
    const digest = inviteOriginDigest("203.0.113.7")
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
    expect(digest).not.toContain("203.0.113.7")
    expect(inviteOriginDigest("203.0.113.8")).not.toBe(digest)
    // Sem origem conhecida o digest existe e é estável, para o limite por
    // origem ainda valer em ambiente sem proxy.
    expect(inviteOriginDigest(null)).toBe(inviteOriginDigest(""))
  })

  it("lê a primeira entrada do x-forwarded-for", () => {
    expect(originFromForwardedFor("198.51.100.9, 10.0.0.1")).toBe("198.51.100.9")
    expect(originFromForwardedFor("")).toBeNull()
    expect(originFromForwardedFor(null)).toBeNull()
  })
})

describe("mensagens", () => {
  it("errado, vencido e usado respondem a mesma frase", () => {
    const one = inviteMessageFor({ code: "P0001" })
    expect(one).toBe(INVITE_CODE_UNAVAILABLE)
    expect(inviteMessageFor({ code: "P0002" })).toBe(one)
    expect(inviteMessageFor({ code: "P0003" })).toBe(one)
    expect(inviteMessageFor({ code: "P0004" })).toBe(one)
    expect(inviteMessageFor({ code: null })).toBe(one)
  })

  it("o limite de tentativas tem frase própria", () => {
    expect(inviteMessageFor({ code: "54000" })).toBe(INVITE_CODE_RATE_LIMITED)
    expect(inviteMessageFor({ code: "54000" })).not.toBe(INVITE_CODE_UNAVAILABLE)
  })

  it("o formato diz o tamanho do código", () => {
    expect(INVITE_CODE_FORMAT).toContain(String(INVITE_CODE_LENGTH))
  })
})
