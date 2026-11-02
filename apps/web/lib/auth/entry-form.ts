/**
 * Validação de tela da entrada, copiada de `entrySignup` e `entryLoginSubmit`
 * em `prototypes/bivaque-html/src/features/entry/` (a especificação).
 *
 * Por que a validação existe no cliente se o provedor também recusa:
 *
 *   - a ordem das mensagens é a da especificação — nome, e-mail, senha,
 *     aceite — e uma ida ao servidor para descobrir que o nome está vazio é
 *     espera sem ganho;
 *   - o aceite não é enfeite: sem ele não existe registro no servidor, e a
 *     conta nasceria sem prova de consentimento. A tela barra antes de criar
 *     qualquer coisa (ADR-20260907-consentimento-no-cadastro).
 *
 * O que este módulo NÃO decide: se a conta existe (só o provedor sabe, e a
 * resposta é a mesma para senha errada e conta inexistente —
 * ADR-20260907-login-com-senha), nem a regra da senha, que vem de
 * `passwordProblem` para haver uma fonte só.
 *
 * Função pura: sem import de runtime e sem DOM, para rodar no vitest.
 */
import { passwordProblem, SENHA_REGRA_ERRO } from "./password-auth"

/** Campo que recebe o foco e o contorno de erro. `consent` é a caixa. */
export type EntryFieldTarget = "name" | "email" | "password" | "consent"

export type EntryFormProblem = Readonly<{
  message: string
  target: EntryFieldTarget
}>

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** `entryError('Informe seu nome.','en-name')` em account.js. */
const NAME_MISSING = "Informe seu nome."
/** `entryError('Confira o e-mail.','en-email')` em account.js. */
const EMAIL_INVALID = "Confira o e-mail."
/**
 * `A senha precisa ter ${ENTRY_SENHA_REGRA.toLowerCase()}` em account.js. A
 * frase vem do classificador do provedor (`password-auth`), que devolve a mesma
 * coisa em "senha fraca": a pessoa lê a mesma regra antes e depois da ida ao
 * servidor.
 */
const PASSWORD_RULE = SENHA_REGRA_ERRO
/** `entryError('Para criar a conta, aceite …','en-consent')` em account.js. */
const CONSENT_MISSING =
  "Para criar a conta, aceite a Política de privacidade e o Código de conduta."
/**
 * `entryLoginSubmit` usa uma frase só para e-mail inválido e para senha vazia:
 * distinguir os dois contaria o que a pessoa digitou antes do provedor, e o
 * provedor já responde a mesma coisa para senha errada e conta inexistente.
 */
const LOGIN_INVALID = "E-mail ou senha incorretos."

/** `name.trim().replace(/\s+/g,' ').slice(0,80)` em `entrySignup`. */
export function normalizeEntryName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80)
}

/** `email.trim().toLowerCase()` em `entrySignup`. */
export function normalizeEntryEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isEntryEmailOk(email: string): boolean {
  return EMAIL_SHAPE.test(email)
}

export type EntrySignupInput = Readonly<{
  accepted: boolean
  email: string
  name: string
  password: string
}>

/** A ordem e as frases de `entrySignup`, na sequência da especificação. */
export function signupProblem(input: EntrySignupInput): EntryFormProblem | null {
  if (normalizeEntryName(input.name).length < 2) {
    return { message: NAME_MISSING, target: "name" }
  }
  if (!isEntryEmailOk(normalizeEntryEmail(input.email))) {
    return { message: EMAIL_INVALID, target: "email" }
  }
  if (passwordProblem(input.password) !== null) {
    return { message: PASSWORD_RULE, target: "password" }
  }
  if (!input.accepted) {
    return { message: CONSENT_MISSING, target: "consent" }
  }
  return null
}

export type EntryLoginInput = Readonly<{
  email: string
  password: string
}>

/** `entryLoginSubmit`: endereço torto e senha vazia caem na mesma mensagem. */
export function loginProblem(input: EntryLoginInput): EntryFormProblem | null {
  if (!isEntryEmailOk(normalizeEntryEmail(input.email)) || input.password.length === 0) {
    return { message: LOGIN_INVALID, target: "email" }
  }
  return null
}

/** O id do elemento que recebe o foco quando a validação recusa o passo. */
export function entryFieldId(target: EntryFieldTarget, mode: "login" | "signup"): string {
  if (target === "consent") return "en-consent"
  if (target === "password") return mode === "signup" ? "en-pass" : "en-pass-login"
  return `en-${target}`
}
