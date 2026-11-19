import { afterEach, describe, expect, it, vi } from "vitest"
import { cspDasPaginas, origensDaCsp } from "../../../apps/web/lib/security/csp"

afterEach(() => vi.unstubAllEnvs())

describe("CSP das p?ginas", () => {
  it("restringe scripts ao nonce e mant?m as diretivas de seguran?a", () => {
    const csp = cspDasPaginas("nonceDeTeste")
    expect(csp).toContain("script-src 'self' 'nonce-nonceDeTeste' 'strict-dynamic'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it("usa somente origens HTTP v?lidas configuradas", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.invalid/path")
    expect(origensDaCsp()).toBe("https://supabase.example.invalid")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "javascript:alert(1)")
    expect(origensDaCsp()).toBe("")
  })
})
