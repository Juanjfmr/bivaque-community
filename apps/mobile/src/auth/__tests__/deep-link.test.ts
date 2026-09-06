import { describe, expect, it } from "vitest"
import { AUTH_CALLBACK_PATH, describeAuthError, readAuthDeepLink } from "../deep-link"

const callback = (suffix: string) => `bivaque://${AUTH_CALLBACK_PATH}${suffix}`

describe("readAuthDeepLink", () => {
  it("lê o código do retorno bem-sucedido", () => {
    const link = readAuthDeepLink(callback("?code=abc123"))
    expect(link).toEqual({ kind: "code", code: "abc123" })
  })

  it("aceita o formato do Expo Go, que embute o caminho depois de --", () => {
    const link = readAuthDeepLink(`exp://192.168.0.10:8081/--/${AUTH_CALLBACK_PATH}?code=xyz`)
    expect(link).toEqual({ kind: "code", code: "xyz" })
  })

  it("lê erro que chega na query", () => {
    const link = readAuthDeepLink(
      callback(
        "?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid",
      ),
    )
    expect(link).toEqual({
      kind: "error",
      code: "otp_expired",
      description: "Este link expirou. Peça outro para entrar.",
    })
  })

  it("lê erro que chega no fragmento", () => {
    // O GoTrue usa fragmento em parte das falhas; ler só a query deixava a
    // pessoa numa tela parada, sem saber que o link tinha expirado.
    const link = readAuthDeepLink(callback("#error=access_denied&error_code=otp_expired"))
    expect(link?.kind).toBe("error")
    expect(link).toMatchObject({ code: "otp_expired" })
  })

  it("não confunde deep link de conteúdo com retorno de autenticação", () => {
    for (const url of [
      "bivaque://comunidades/jardim-das-acacias",
      "bivaque://",
      "https://bivaque.com.br/guia",
      "",
      null,
      undefined,
    ]) {
      expect(readAuthDeepLink(url)).toBeNull()
    }
  })

  it("trata o caminho certo sem código nem erro como falha, não como silêncio", () => {
    const link = readAuthDeepLink(callback(""))
    expect(link).toEqual({
      kind: "error",
      code: null,
      description: "Não foi possível concluir a entrada. Peça outro link.",
    })
  })
})

describe("describeAuthError", () => {
  it("não revela se a conta existe", () => {
    for (const code of ["otp_expired", "access_denied", "bad_oauth_state", "desconhecido", null]) {
      const message = describeAuthError(code).toLowerCase()
      expect(message).not.toContain("conta")
      expect(message).not.toContain("cadastr")
      expect(message).not.toContain("não encontrado")
    }
  })

  it("cai numa mensagem útil para código que não conhece", () => {
    expect(describeAuthError("algo_novo_do_gotrue")).toBe(
      "Não foi possível concluir a entrada. Peça outro link.",
    )
  })
})
