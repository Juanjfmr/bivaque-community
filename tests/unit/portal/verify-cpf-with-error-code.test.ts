import { afterEach, describe, expect, it, vi } from "vitest"
import { verifyCpf, verifyCpfWithErrorCode } from "web/lib/portal/client"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("verifyCpfWithErrorCode", () => {
  it("reports RATE_LIMITED for a Portal 429 while verifyCpf stays generic pending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 429 })),
    )

    const attempt = await verifyCpfWithErrorCode("12345678901", "chave-valida")
    expect(attempt.errorCode).toBe("RATE_LIMITED")
    expect(attempt.result).toEqual({ status: "pending" })

    const sanitized = await verifyCpf("12345678901", "chave-valida")
    expect(sanitized).toEqual({ status: "pending" })
  })

  it("reports TIMEOUT without changing the public pending result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation was aborted.", "AbortError")
      }),
    )

    const attempt = await verifyCpfWithErrorCode("12345678901", "chave-valida")
    expect(attempt.errorCode).toBe("TIMEOUT")
    expect(attempt.result).toEqual({ status: "pending" })
  })

  it("reports INVALID_KEY for a missing Portal key", async () => {
    const attempt = await verifyCpfWithErrorCode("12345678901", "")
    expect(attempt.errorCode).toBe("INVALID_KEY")
    expect(attempt.result.status).toBe("temporary_error")
  })
})
