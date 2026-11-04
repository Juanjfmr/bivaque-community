import { describe, expect, it, vi } from "vitest"
import { type DependenciasDeSessao, resolverSessao } from "web/lib/app-api/sessao"

// SPA ADR §5.1: a regra cara deste módulo é que o caminho do token nunca lê o
// cookie. Os testes usam espiões para provar isso, e não só o resultado.

const PESSOA = { id: "00000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }

function dependencias(opcoes: {
  cookie?: boolean
  usuarioDoCookie?: typeof PESSOA | null
  usuarioDoToken?: typeof PESSOA | null
}): DependenciasDeSessao & {
  espiaCookie: ReturnType<typeof vi.fn>
  espiaToken: ReturnType<typeof vi.fn>
} {
  const espiaCookie = vi.fn(async () =>
    opcoes.usuarioDoCookie === undefined ? PESSOA : opcoes.usuarioDoCookie,
  )
  const espiaToken = vi.fn(async () =>
    opcoes.usuarioDoToken === undefined ? PESSOA : opcoes.usuarioDoToken,
  )
  return {
    temCookie: () => opcoes.cookie === true,
    lerUsuarioDoCookie: espiaCookie,
    lerUsuarioDoToken: espiaToken,
    espiaCookie,
    espiaToken,
  }
}

describe("sessão da requisição (ADR §5.1)", () => {
  it("sem credencial nenhuma é recusada", async () => {
    const deps = dependencias({})
    expect(await resolverSessao(null, deps)).toEqual({
      estado: "recusada",
      motivo: "sem-credencial",
    })
    expect(deps.espiaCookie).not.toHaveBeenCalled()
    expect(deps.espiaToken).not.toHaveBeenCalled()
  })

  it("cookie válido autentica pela web e não consulta token", async () => {
    const deps = dependencias({ cookie: true })
    expect(await resolverSessao(null, deps)).toEqual({
      estado: "autenticada",
      via: "cookie",
      usuario: PESSOA,
    })
    expect(deps.espiaToken).not.toHaveBeenCalled()
  })

  it("cookie vencido é sessão inválida, não sem-credencial", async () => {
    const deps = dependencias({ cookie: true, usuarioDoCookie: null })
    expect(await resolverSessao(null, deps)).toEqual({
      estado: "recusada",
      motivo: "sessao-invalida",
    })
  })

  it("token válido autentica pelo app de loja e não lê o cookie", async () => {
    const deps = dependencias({})
    expect(await resolverSessao("Bearer token.do.app", deps)).toEqual({
      estado: "autenticada",
      via: "bearer",
      usuario: PESSOA,
    })
    expect(deps.espiaCookie).not.toHaveBeenCalled()
    expect(deps.espiaToken).toHaveBeenCalledWith("token.do.app")
  })

  it("token inválido é recusado e NÃO cai para o cookie", async () => {
    // Sem cookie, o token é a única credencial; se ele não valida, a resposta
    // é recusa — nunca uma segunda tentativa pelo cookie.
    const deps = dependencias({ cookie: false, usuarioDoToken: null })
    expect(await resolverSessao("Bearer token.vencido", deps)).toEqual({
      estado: "recusada",
      motivo: "token-invalido",
    })
    expect(deps.espiaCookie).not.toHaveBeenCalled()
  })

  it("token malformado é recusado antes de qualquer consulta", async () => {
    for (const autorizacao of ["Bearer", "Basic abc", "Bearer a b", "bearer ,"]) {
      const deps = dependencias({ cookie: false })
      expect(await resolverSessao(autorizacao, deps), autorizacao).toEqual({
        estado: "recusada",
        motivo: "token-invalido",
      })
      expect(deps.espiaToken, autorizacao).not.toHaveBeenCalled()
      expect(deps.espiaCookie, autorizacao).not.toHaveBeenCalled()
    }
  })

  it("as duas credenciais juntas são conflito, sem escolher uma em silêncio", async () => {
    const deps = dependencias({ cookie: true })
    expect(await resolverSessao("Bearer token.do.app", deps)).toEqual({
      estado: "recusada",
      motivo: "conflito",
    })
    expect(deps.espiaCookie).not.toHaveBeenCalled()
    expect(deps.espiaToken).not.toHaveBeenCalled()
  })
})
