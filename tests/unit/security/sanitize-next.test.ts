import { describe, expect, it } from "vitest"
import {
  DEFAULT_NEXT,
  resolvePostLoginDestination,
  sanitizeNext,
} from "web/lib/security/sanitize-next"

describe("sanitizeNext", () => {
  describe("positives", () => {
    it.each([
      ["/"],
      ["/community"],
      ["/groups/abc?tab=feed"],
      ["/events/1#top"],
      ["/community/posts/123?from=feed#comments"],
    ])("keeps %s as an internal path", (input) => {
      expect(sanitizeNext(input)).toBe(input)
    })
  })

  describe("negatives — fall back to /", () => {
    it.each([
      ["https://exemplo.invalid"],
      ["//exemplo.invalid"],
      ["/\\exemplo.invalid"],
      ["javascript:alert(1)"],
      ["http:/exemplo.invalid"],
      ["data:text/html,<script>alert(1)</script>"],
      ["file:///etc/passwd"],
      ["//attacker.example/path"],
      ["https://example.com/"],
      [" http://example.com"],
    ])("rejects %s", (input) => {
      expect(sanitizeNext(input)).toBe(DEFAULT_NEXT)
    })

    it.each([[null], [undefined], [""]])("rejects %s", (input) => {
      expect(sanitizeNext(input as unknown as string)).toBe(DEFAULT_NEXT)
    })

    it("does not throw on non-string inputs", () => {
      expect(sanitizeNext(123 as unknown as string)).toBe(DEFAULT_NEXT)
      expect(sanitizeNext({} as unknown as string)).toBe(DEFAULT_NEXT)
      expect(sanitizeNext([] as unknown as string)).toBe(DEFAULT_NEXT)
    })
  })

  describe("resolvePostLoginDestination", () => {
    it("aceita redirect, return ou next e preserva query", () => {
      expect(resolvePostLoginDestination([null, "/profile?tab=security", undefined])).toBe(
        "/profile?tab=security",
      )
      expect(resolvePostLoginDestination([null, null, "/events/12?from=inicio"])).toBe(
        "/events/12?from=inicio",
      )
    })

    it("ignora destinos de entrada, externos, APIs e caminhos normalizados", () => {
      expect(
        resolvePostLoginDestination([
          "/login?return=/perfil",
          "/signup",
          "/auth/callback",
          "/login/",
          "/login/../api/health",
          "/api/health",
          "/_next/static/chunk.js",
        ]),
      ).toBe(DEFAULT_NEXT)
      expect(resolvePostLoginDestination(["https://exemplo.invalid", null, undefined])).toBe(
        DEFAULT_NEXT,
      )
    })
  })
})
