import { readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  DEFAULT_NEXT,
  POST_LOGIN_ALLOWED_PREFIXES,
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

    it("preserva convite de comunidade, convite de prestador e rotas de publicação", () => {
      expect(resolvePostLoginDestination(["/invite/tok-123"])).toBe("/invite/tok-123")
      expect(resolvePostLoginDestination(["/prestador-convite/abc"])).toBe("/prestador-convite/abc")
      expect(resolvePostLoginDestination(["/publicacoes/nova?tipo=link"])).toBe(
        "/publicacoes/nova?tipo=link",
      )
      expect(resolvePostLoginDestination(["/publicacoes/p1/editar"])).toBe("/publicacoes/p1/editar")
    })
  })

  describe("caracteres de controle", () => {
    it.each([
      ["/\t/exemplo.invalid"],
      ["/\n/exemplo.invalid"],
      ["/\r/exemplo.invalid"],
      ["/a\u0000"],
    ])("recusa %j, que o navegador reduziria a outro host", (input) => {
      expect(sanitizeNext(input)).toBe(DEFAULT_NEXT)
      expect(resolvePostLoginDestination([input])).toBe(DEFAULT_NEXT)
    })
  })

  describe("cobertura da allowlist contra as rotas reais", () => {
    // Pastas de rota autenticadas (e o convite de prestador, que é a porta de
    // entrada do magic link). Uma rota nova fora da allowlist faz o login
    // devolver a pessoa para "/" e perder o destino — como aconteceu com
    // /invite, /publicacoes e /prestador-convite.
    const appDir = join(process.cwd(), "apps", "web", "app")
    const routeDirs = (group: string) =>
      readdirSync(join(appDir, group), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !/^[(_[]/.test(entry.name))
        .map((entry) => `/${entry.name}`)
    const expected = [
      ...routeDirs("(shell)"),
      ...routeDirs("(provider)"),
      ...routeDirs("(admin)"),
      "/prestador-convite",
    ]

    it.each(expected)("%s está na allowlist pós-login", (prefix) => {
      expect(POST_LOGIN_ALLOWED_PREFIXES).toContain(prefix)
      expect(resolvePostLoginDestination([`${prefix}/x`])).toBe(`${prefix}/x`)
    })
  })
})
