import { describe, expect, it } from "vitest"
import { classifySignIn, classifySignUp, passwordProblem } from "../password-auth"

// Os payloads abaixo são respostas reais do GoTrue, medidas contra a stack
// local em 2026-09-07. Payload inventado já deixou passar um defeito nesta
// mesma área nesta sessão.
const err = (fields: Record<string, unknown>) => Object.assign(new Error(), fields)

const invalidCredentials = () =>
  err({
    name: "AuthApiError",
    message: "Invalid login credentials",
    code: "invalid_credentials",
    status: 400,
  })

describe("classifySignIn", () => {
  it("dá a mesma resposta para senha errada e para conta inexistente", () => {
    // O GoTrue devolve invalid_credentials nos dois casos — medido. A tela não
    // tem como distinguir, e é isso que impede alguém de descobrir quem é
    // membro digitando e-mails.
    const senhaErrada = classifySignIn(invalidCredentials())
    const contaInexistente = classifySignIn(invalidCredentials())
    expect(senhaErrada.message).toBe(contaInexistente.message)
    expect(senhaErrada.message).toBe("E-mail ou senha incorretos.")
  })

  it("não afirma que a conta existe nem que não existe", () => {
    const message = classifySignIn(invalidCredentials()).message.toLowerCase()
    expect(message).not.toContain("não encontrad")
    expect(message).not.toContain("não existe")
    expect(message).not.toContain("não cadastrad")
    expect(message).not.toContain("senha incorreta")
  })

  it("não devolve o texto cru do servidor", () => {
    const view = classifySignIn(invalidCredentials())
    expect(view.message).not.toContain("Invalid login")
    expect(view.diagnostic).toContain("Invalid login credentials")
  })

  it("separa falha de conexão de credencial errada", () => {
    expect(classifySignIn(err({ name: "TypeError", message: "Failed to fetch" })).outcome).toBe(
      "offline",
    )
  })

  it("reconhece limite de tentativas", () => {
    const view = classifySignIn(
      err({ status: 429, message: "you can only request this after 12 seconds." }),
    )
    expect(view.outcome).toBe("rate-limited")
    expect(view.message).toContain("12s")
  })

  it("sucesso não produz mensagem", () => {
    expect(classifySignIn(null)).toMatchObject({ outcome: "ok", message: "" })
  })
})

describe("classifySignUp", () => {
  it("avisa que o e-mail já tem conta e aponta o caminho de entrar", () => {
    // Aqui contamos, de propósito: quem cria conta digitou o próprio endereço,
    // e esconder isso deixa a pessoa sem saída. ADR-20260907-login-com-senha.
    const view = classifySignUp(
      err({ message: "User already registered", code: "user_already_exists", status: 422 }),
    )
    expect(view.outcome).toBe("email-taken")
    expect(view.suggestSignIn).toBe(true)
  })

  it("explica senha fraca sem repetir a regra do servidor", () => {
    const view = classifySignUp(err({ code: "weak_password", status: 422 }))
    expect(view.outcome).toBe("weak-password")
    expect(view.message).toContain("8")
  })

  it("erro desconhecido não vira sucesso", () => {
    expect(classifySignUp(err({ status: 500, message: "boom" })).outcome).toBe("failed")
  })
})

describe("passwordProblem", () => {
  it("espelha a política já configurada no provedor", () => {
    expect(passwordProblem("curta1")).toContain("8 caracteres")
    expect(passwordProblem("somenteletras")).toContain("letras e números")
    expect(passwordProblem("12345678")).toContain("letras e números")
    expect(passwordProblem("bivaque2026")).toBeNull()
  })

  it("não exige símbolo nem maiúscula", () => {
    // Regra complexa produz senha anotada em papel, que para este público é
    // pior do que uma senha longa e simples. ADR-20260907.
    expect(passwordProblem("comunidade2026")).toBeNull()
  })
})
