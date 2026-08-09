import { describe, expect, it } from "vitest"
import { classifyPortalProbe } from "web/lib/portal/probe"

describe("classifyPortalProbe", () => {
  it("returns ok for a 2xx response with an array body", () => {
    // Given a healthy Portal response
    // When the probe classifies it
    const status = classifyPortalProbe(200, [])

    // Then it reports ok
    expect(status).toBe("ok")
  })

  it("returns ok for an empty array body", () => {
    // Given a 2xx response with no records (key valid, schema intact)
    // When the probe classifies it
    const status = classifyPortalProbe(200, [])

    // Then it still reports ok — the key works, the schema is intact
    expect(status).toBe("ok")
  })

  it("returns invalid_key for 401", () => {
    // Given an invalid or revoked key
    // When the probe classifies the 401
    const status = classifyPortalProbe(401, undefined)

    // Then it reports invalid_key
    expect(status).toBe("invalid_key")
  })

  it("returns rate_limited for 429", () => {
    // Given the Portal rate limit is hit
    // When the probe classifies the 429
    const status = classifyPortalProbe(429, undefined)

    // Then it reports rate_limited
    expect(status).toBe("rate_limited")
  })

  it("returns http_error for other non-2xx statuses", () => {
    // Given an unexpected HTTP error from the Portal
    // When the probe classifies it
    const status = classifyPortalProbe(500, undefined)

    // Then it reports http_error
    expect(status).toBe("http_error")
  })

  it("returns schema_drift for a 2xx response with a non-array body", () => {
    // Given a 2xx response whose body is not an array (shape changed)
    // When the probe classifies it
    const status = classifyPortalProbe(200, { servidores: [] })

    // Then it reports schema_drift — do not touch the classifier without tests
    expect(status).toBe("schema_drift")
  })

  it("returns schema_drift when a 2xx response has no parseable body", () => {
    // Given a 2xx response with an unparseable body
    // When the probe classifies it
    const status = classifyPortalProbe(200, undefined)

    // Then it reports schema_drift
    expect(status).toBe("schema_drift")
  })
})
