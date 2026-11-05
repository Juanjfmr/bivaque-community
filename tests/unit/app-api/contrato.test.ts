import { describe, expect, it } from "vitest"
import {
  avaliarEscrita,
  CABECALHO_DO_APP,
  cabecalhosDeCors,
  cabecalhosDePreflight,
  origemPermitida,
  resolverCredencial,
  temCookieDeSessao,
  VALOR_DO_CABECALHO_DO_APP,
} from "web/lib/app-api/contrato"

// SPA ADR §5, itens 1 a 3. Cada regra tem caso positivo e negativo; o que
// importa é a recusa, porque esquecer uma delas não quebra nenhuma tela.

const ORIGENS = ["https://bivaque.example.invalid", "capacitor://localhost"]

describe("credencial da requisição (ADR §5.1)", () => {
  it("sem cabeçalho e sem cookie é sem-credencial", () => {
    expect(resolverCredencial({ autorizacao: null, temCookie: false })).toEqual({
      erro: "sem-credencial",
    })
    expect(resolverCredencial({ autorizacao: "   ", temCookie: false })).toEqual({
      erro: "sem-credencial",
    })
  })

  it("só cookie é a credencial da web", () => {
    expect(resolverCredencial({ autorizacao: null, temCookie: true })).toEqual({ via: "cookie" })
  })

  it("só Bearer bem formado é a credencial do app de loja", () => {
    expect(resolverCredencial({ autorizacao: "Bearer abc.def", temCookie: false })).toEqual({
      via: "bearer",
      token: "abc.def",
    })
    expect(resolverCredencial({ autorizacao: "bearer abc.def", temCookie: false })).toEqual({
      via: "bearer",
      token: "abc.def",
    })
  })

  it("as duas credenciais válidas são conflito", () => {
    expect(resolverCredencial({ autorizacao: "Bearer abc", temCookie: true })).toEqual({
      erro: "conflito",
    })
  })

  it("cabeçalho malformado é token-invalido, nunca cai para o cookie", () => {
    for (const autorizacao of ["Bearer", "Bearer  ", "Basic abc", "Token abc", "Bearer a b"]) {
      expect(resolverCredencial({ autorizacao, temCookie: false }), autorizacao).toEqual({
        erro: "token-invalido",
      })
      expect(resolverCredencial({ autorizacao, temCookie: true }), autorizacao).toEqual({
        erro: "token-invalido",
      })
    }
  })

  it("dois tokens concatenados por proxy não valem como um", () => {
    expect(resolverCredencial({ autorizacao: "Bearer abc,Bearer def", temCookie: false })).toEqual({
      erro: "token-invalido",
    })
  })
})

describe("cookie de sessão do Supabase", () => {
  it("reconhece o pacote inteiro e os pedaços", () => {
    expect(temCookieDeSessao(["sb-projeto-auth-token"])).toBe(true)
    expect(temCookieDeSessao(["sb-projeto-auth-token.0", "sb-projeto-auth-token.1"])).toBe(true)
  })

  it("não confunde outros cookies com sessão", () => {
    expect(temCookieDeSessao([])).toBe(false)
    expect(temCookieDeSessao(["bivaque-consent-version"])).toBe(false)
    expect(temCookieDeSessao(["sb-projeto-code-verifier"])).toBe(false)
    expect(temCookieDeSessao(["outro-sb-projeto-auth-token"])).toBe(false)
  })
})

describe("origem permitida", () => {
  it("aceita exatamente a lista", () => {
    expect(origemPermitida(ORIGENS[0], ORIGENS)).toBe(true)
    expect(origemPermitida(ORIGENS[1], ORIGENS)).toBe(true)
  })

  it("recusa o resto, inclusive null e a string null", () => {
    expect(origemPermitida("https://outro.example.invalid", ORIGENS)).toBe(false)
    expect(origemPermitida("https://bivaque.example.invalid.evil", ORIGENS)).toBe(false)
    expect(origemPermitida(null, ORIGENS)).toBe(false)
    expect(origemPermitida(undefined, ORIGENS)).toBe(false)
    expect(origemPermitida("", ORIGENS)).toBe(false)
    expect(origemPermitida("null", ORIGENS)).toBe(false)
    expect(origemPermitida(ORIGENS[0], [])).toBe(false)
  })
})

describe("CSRF da escrita (ADR §5.2)", () => {
  const base = {
    via: "cookie" as const,
    origem: ORIGENS[0],
    cabecalhoDoApp: VALOR_DO_CABECALHO_DO_APP,
    origensPermitidas: ORIGENS,
  }

  it("cookie com origem e cabeçalho do app passa", () => {
    expect(avaliarEscrita(base)).toEqual({ ok: true })
  })

  it("cookie com origem fora da lista é recusado", () => {
    expect(avaliarEscrita({ ...base, origem: "https://evil.example.invalid" })).toEqual({
      ok: false,
      motivo: "origem-recusada",
    })
    expect(avaliarEscrita({ ...base, origem: null })).toEqual({
      ok: false,
      motivo: "origem-recusada",
    })
  })

  it("cookie sem o cabeçalho do app (ou com valor errado) é recusado", () => {
    expect(avaliarEscrita({ ...base, cabecalhoDoApp: null })).toEqual({
      ok: false,
      motivo: "cabecalho-ausente",
    })
    expect(avaliarEscrita({ ...base, cabecalhoDoApp: "outro" })).toEqual({
      ok: false,
      motivo: "cabecalho-ausente",
    })
  })

  it("bearer não sofre CSRF, mas origem presente continua na lista", () => {
    expect(avaliarEscrita({ ...base, via: "bearer", origem: null, cabecalhoDoApp: null })).toEqual({
      ok: true,
    })
    expect(avaliarEscrita({ ...base, via: "bearer", cabecalhoDoApp: null })).toEqual({ ok: true })
    expect(
      avaliarEscrita({
        ...base,
        via: "bearer",
        origem: "https://evil.example.invalid",
        cabecalhoDoApp: null,
      }),
    ).toEqual({ ok: false, motivo: "origem-recusada" })
  })
})

describe("CORS (ADR §5.3)", () => {
  it("origem da lista recebe credencial com a origem exata e Vary", () => {
    expect(cabecalhosDeCors(ORIGENS[0], ORIGENS)).toEqual({
      "access-control-allow-origin": ORIGENS[0],
      "access-control-allow-credentials": "true",
      vary: "Origin",
    })
  })

  it("origem fora da lista não recebe nada — nem curinga", () => {
    expect(cabecalhosDeCors("https://evil.example.invalid", ORIGENS)).toEqual({})
    expect(cabecalhosDeCors(null, ORIGENS)).toEqual({})
  })

  it("preflight só responde para origem da lista, com métodos e cabeçalhos explícitos", () => {
    const preflight = cabecalhosDePreflight(ORIGENS[1], ORIGENS)
    expect(preflight["access-control-allow-origin"]).toBe(ORIGENS[1])
    expect(preflight["access-control-allow-methods"]).toContain("POST")
    expect(preflight["access-control-allow-headers"]).toContain(CABECALHO_DO_APP)
    expect(preflight["access-control-allow-headers"]).toContain("authorization")
    expect(cabecalhosDePreflight(null, ORIGENS)).toEqual({})
  })
})
