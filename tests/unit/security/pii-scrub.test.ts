import { scrubEvent, scrubPii } from "@bivaque/domain"
import { describe, expect, it } from "vitest"

describe("PII scrubbing (D1 Task 6)", () => {
  it("redacts a masked CPF", () => {
    expect(scrubPii("CPF 529.982.247-25 vazou")).toBe("CPF [redacted] vazou")
  })

  it("redacts an email", () => {
    expect(scrubPii("fale com maria@example.com")).toBe("fale com [redacted]")
  })

  it("redacts a JWT", () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig-signature-value"
    expect(scrubPii(`token ${token}`)).toBe("token [redacted]")
  })

  it("redacts an authorization header", () => {
    expect(scrubPii("Authorization: Bearer secret-token-123")).toBe("Authorization: [redacted]")
  })

  it("redacts whole user-content fields, not just patterns", () => {
    const event = scrubEvent({
      message: "post content with a CPF 529.982.247-25 inside",
      request: {
        headers: { authorization: "Bearer abc" },
        url: "https://x.test/a?cpf=529.982.247-25",
      },
    }) as { message: string; request: { headers: { authorization: string }; url: string } }

    expect(event.message).toBe("[redacted]")
    expect(event.request.headers.authorization).toBe("[redacted]")
    expect(event.request.url).not.toContain("529.982.247-25")
  })

  it("recurses through arrays and leaves scalars untouched", () => {
    const event = scrubEvent({ tags: ["a@b.com", 42, true] }) as { tags: unknown[] }
    expect(event.tags).toEqual(["[redacted]", 42, true])
  })
  it("protege credenciais e limita a reda??o de code ?s rotas previstas", () => {
    const input = {
      nested: [
        {
          access_token: "access-secret",
          refresh_token: "refresh-secret",
          provider_token: "provider-secret",
          provider_refresh_token: "provider-refresh-secret",
          auth_code: "auth-secret",
          code_verifier: "verifier-secret",
          code: "erro-comum",
        },
      ],
      urls: [
        "bivaque://auth-callback?code=callback-secret&state=ok",
        "https://example.test/api/app/sessao/token?code=session-secret&refresh_token=url-secret",
        "https://example.test/outro?code=erro-comum",
      ],
    }
    const result = JSON.stringify(scrubEvent(input))
    for (const secret of [
      "access-secret",
      "refresh-secret",
      "provider-secret",
      "provider-refresh-secret",
      "auth-secret",
      "verifier-secret",
      "callback-secret",
      "session-secret",
      "url-secret",
    ])
      expect(result).not.toContain(secret)
    expect(result).toContain("erro-comum")
    expect(result).toContain("state=ok")
  })

  it("remove corpos sens?veis e preserva corpos de outras rotas", () => {
    for (const path of [
      "/api/app/sessao/renovar",
      "/api/app/entry/otp/verify",
      "/api/app/voce/sair",
    ]) {
      expect(
        scrubEvent({
          url: `https://example.test${path}`,
          data: { code: "segredo" },
          body: "segredo",
        }),
      ).toEqual({ url: `https://example.test${path}` })
    }
    expect(scrubEvent({ url: "https://example.test/api/outro", data: { code: "erro" } })).toEqual({
      url: "https://example.test/api/outro",
      data: { code: "erro" },
    })
  })
})
