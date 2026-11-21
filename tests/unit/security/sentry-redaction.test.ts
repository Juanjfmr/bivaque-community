import { beforeEach, describe, expect, it, vi } from "vitest"

const sentry = vi.hoisted(() => ({ init: vi.fn() }))
vi.mock("@sentry/nextjs", () => sentry)

describe.each(["server", "edge"])("Sentry %s", (runtime) => {
  beforeEach(() => {
    vi.resetModules()
    sentry.init.mockClear()
  })

  it("limpa eventos e breadcrumbs sem remover códigos comuns", async () => {
    if (runtime === "server") await import("../../../apps/web/sentry.server.config")
    else await import("../../../apps/web/sentry.edge.config")
    const options = sentry.init.mock.calls[0]?.[0]
    for (const hook of [options.beforeSend, options.beforeBreadcrumb]) {
      const result = hook({
        request: {
          url: "https://example.test/api/app/entry/otp/verify",
          data: { code: "segredo" },
        },
        data: { url: "bivaque://auth-callback?code=segredo", code: "erro-comum" },
      })
      expect(JSON.stringify(result)).not.toContain("segredo")
      expect(result.data.code).toBe("erro-comum")
      expect(result.request.data).toBeUndefined()
    }
  })
})
