import { afterEach, describe, expect, it, vi } from "vitest"
import { verifyCpf } from "web/lib/portal/client"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("verifyCpf", () => {
  it("turns a 401 into temporary_error INVALID_KEY, never rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 401 })),
    )

    const result = await verifyCpf("12345678901", "chave-invalida")

    expect(result.status).toBe("temporary_error")
    if (result.status === "temporary_error") {
      expect(result.errorCode).toBe("INVALID_KEY")
    }
  })

  it("keeps an empty 200 array as rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })),
    )

    const result = await verifyCpf("12345678901", "chave-valida")

    expect(result).toEqual({ status: "rejected" })
  })

  it("turns a Portal timeout into pending, never rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation was aborted.", "AbortError")
      }),
    )

    const result = await verifyCpf("12345678901", "chave-valida")

    expect(result).toEqual({ status: "pending" })
  })

  it("turns a 429 into pending, never rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 429 })),
    )

    const result = await verifyCpf("12345678901", "chave-valida")

    expect(result).toEqual({ status: "pending" })
  })

  it("turns a 500 into pending, never rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    )

    const result = await verifyCpf("12345678901", "chave-valida")

    expect(result).toEqual({ status: "pending" })
  })
})
