import { describe, expect, it } from "vitest"
import { log } from "web/lib/logger"

describe("log redaction", () => {
  it("redacts CPF in log messages", () => {
    // Given a log message containing a CPF
    const consoleInfoCalls: string[] = []
    const originalInfo = console.info
    console.info = (line: string) => {
      consoleInfoCalls.push(line)
    }

    // When the message is logged
    log.info("verifying CPF 123.456.789-00 for user")
    console.info = originalInfo

    // Then the CPF is redacted in the output
    const output = consoleInfoCalls[0] ?? ""
    expect(output).not.toContain("123.456.789-00")
    expect(output).not.toContain("12345678900")
    expect(output).toContain("[REDACTED]")
  })

  it("redacts CPF in structured fields", () => {
    // Given structured fields containing CPF
    const consoleInfoCalls: string[] = []
    const originalInfo = console.info
    console.info = (line: string) => {
      consoleInfoCalls.push(line)
    }

    // When the fields are logged
    log.info("verification", { cpf: "529.982.247-25", status: "ok" })
    console.info = originalInfo

    // Then the CPF field is redacted
    const output = consoleInfoCalls[0] ?? ""
    expect(output).not.toContain("529.982.247-25")
    expect(output).toContain("[REDACTED]")
  })

  it("redacts sensitive field names regardless of case", () => {
    // Given fields with sensitive keys in mixed case
    const consoleInfoCalls: string[] = []
    const originalInfo = console.info
    console.info = (line: string) => {
      consoleInfoCalls.push(line)
    }

    // When the fields are logged
    log.info("request", { CPF: "00011122233", Endereco: "Rua Exemplo 123" })
    console.info = originalInfo

    // Then both sensitive fields are redacted
    const output = consoleInfoCalls[0] ?? ""
    expect(output).not.toContain("00011122233")
    expect(output).not.toContain("Rua Exemplo 123")
    const redactedCount = (output.match(/\[REDACTED\]/g) ?? []).length
    expect(redactedCount).toBeGreaterThanOrEqual(2)
  })

  it("passes through safe fields unchanged", () => {
    // Given fields with non-sensitive keys
    const consoleInfoCalls: string[] = []
    const originalInfo = console.info
    console.info = (line: string) => {
      consoleInfoCalls.push(line)
    }

    // When the fields are logged
    log.info("request", { status: "ok", action: "verify-cpf" })
    console.info = originalInfo

    // Then safe fields are preserved
    const output = consoleInfoCalls[0] ?? ""
    expect(output).toContain("ok")
    expect(output).toContain("verify-cpf")
    expect(output).not.toContain("[REDACTED]")
  })

  it("redacts sensitive fields in nested objects", () => {
    // Given a nested object with sensitive fields
    const consoleInfoCalls: string[] = []
    const originalInfo = console.info
    console.info = (line: string) => {
      consoleInfoCalls.push(line)
    }

    // When the object is logged
    log.info("portal response", {
      data: { cpf: "12345678900", nome: "Fulano", status: "ok" },
    })
    console.info = originalInfo

    // Then sensitive nested fields are redacted
    const output = consoleInfoCalls[0] ?? ""
    expect(output).not.toContain("12345678900")
    expect(output).not.toContain("Fulano")
    expect(output).toContain("ok")
  })
})
