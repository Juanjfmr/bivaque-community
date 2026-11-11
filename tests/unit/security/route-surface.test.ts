import { describe, expect, it } from "vitest"
import {
  areaDoPrestador,
  casaFronteira,
  entradaEmAndamento,
  isPublicPath,
  type ModoDaEntrada,
  PUBLIC_SURFACE,
} from "web/lib/security/route-surface"

const PUBLICOS = [
  "/login",
  "/login/",
  "/signup",
  "/recuperar-senha",
  "/nova-senha",
  "/auth/callback",
  "/auth/callback/",
  "/auth/callback-error",
  "/consent",
  "/privacidade",
  "/codigo-de-conduta",
  "/conta-apagada",
  "/convite",
  "/convite/",
  "/ajuda",
  "/favicon.ico",
  "/icon.svg",
  "/api",
  "/api/qualquer",
  "/api/qualquer/rota",
  "/app",
  "/app/entrar",
  "/app/assets/index-abc.js",
  "/_next/static/css/app.css",
  "/_next/image",
  "/landing/hero-bivaque-arrival.webp",
  "/landing/v8/hero.webp",
  "/prestador-convite/abc",
]

const NAO_PUBLICOS = [
  "/",
  "/loginx",
  "/login/entrar",
  "/convite/ABCD1234",
  "/auth/callback-falso",
  "/apiario",
  "/prestador-convitex",
  "/landing",
  "/landing/",
  "/onboarding/statusx",
  "/auth/confirmar-email",
  "/community",
  "/prestador",
  "/prestador/ficha",
  "/_next",
  "/_nextx",
  "/appx",
  "/application",
]

describe("isPublicPath", () => {
  it.each(PUBLICOS)("abre %s", (caminho) => {
    expect(isPublicPath(caminho)).toBe(true)
  })

  it.each(NAO_PUBLICOS)("fecha %s", (caminho) => {
    expect(isPublicPath(caminho)).toBe(false)
  })

  it("normaliza caminho sem barra inicial", () => {
    expect(isPublicPath("login")).toBe(true)
    expect(isPublicPath("api/qualquer")).toBe(true)
    expect(isPublicPath("apiario")).toBe(false)
  })

  it("lista canônica: caminho único, modo declarado e motivo escrito", () => {
    const caminhos = PUBLIC_SURFACE.map((entrada) => entrada.caminho)
    expect(new Set(caminhos).size).toBe(caminhos.length)
    const modos: ModoDaEntrada[] = ["exata", "pasta", "ativos"]
    for (const entrada of PUBLIC_SURFACE) {
      expect(entrada.caminho.startsWith("/")).toBe(true)
      expect(entrada.caminho.endsWith("/")).toBe(false)
      expect(modos).toContain(entrada.modo)
      expect(entrada.motivo.length).toBeGreaterThan(10)
    }
  })
})

describe("casaFronteira", () => {
  const casos: Array<[string, string, boolean]> = [
    ["/onboarding/status", "/onboarding/status", true],
    ["/onboarding/status/", "/onboarding/status", true],
    ["/onboarding/status/xyz", "/onboarding/status", true],
    ["/onboarding/statusx", "/onboarding/status", false],
    ["/onboarding/statusx/1", "/onboarding/status", false],
    ["/onboarding", "/onboarding/status", false],
    ["/prestador", "/prestador", true],
    ["/prestador/", "/prestador", true],
    ["/prestador/ficha", "/prestador", true],
    ["/prestadorx", "/prestador", false],
    ["/prestadorx/1", "/prestador", false],
    ["/api", "/api", true],
    ["/api/x", "/api", true],
    ["/apiario", "/api", false],
  ]

  it.each(casos)("%s com fronteira %s => %s", (caminho, prefixo, esperado) => {
    expect(casaFronteira(caminho, prefixo)).toBe(esperado)
  })
})

describe("entradaEmAndamento", () => {
  const permitidos = [
    "/onboarding",
    "/onboarding/",
    "/onboarding/status",
    "/onboarding/status/xyz",
    "/onboarding/documento",
    "/onboarding/locality",
    "/onboarding/perfil",
  ]
  const recusados = [
    "/onboarding/statusx",
    "/onboarding/statusx/1",
    "/onboardingx",
    "/prestador/ficha",
    "/app/inicio",
  ]

  it.each(permitidos)("aceita %s", (caminho) => {
    expect(entradaEmAndamento(caminho)).toBe(true)
  })

  it.each(recusados)("recusa %s", (caminho) => {
    expect(entradaEmAndamento(caminho)).toBe(false)
  })
})

describe("areaDoPrestador", () => {
  const permitidos = [
    "/prestador",
    "/prestador/",
    "/prestador/ficha",
    "/prestador/ficha/xyz",
    "/prestadores",
    "/prestadores/abc",
  ]
  const recusados = ["/prestadorx", "/prestadorx/1", "/prestadoresx", "/app/inicio", "/"]

  it.each(permitidos)("aceita %s", (caminho) => {
    expect(areaDoPrestador(caminho)).toBe(true)
  })

  it.each(recusados)("recusa %s", (caminho) => {
    expect(areaDoPrestador(caminho)).toBe(false)
  })
})
