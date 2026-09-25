// A confirmação de e-mail só grava o aceite do cadastro quando o intent
// HttpOnly está no navegador que abriu o link (auth/callback/route.ts). Quem se
// cadastra num aparelho e confirma noutro chega ao onboarding sem aceite, e
// /api/onboarding responde 403 "consent is required". Essa resposta não é erro
// para mostrar cru: é o sinal para levar a pessoa a /consent, que grava o
// aceite pela sessão real e devolve ao onboarding.

export const CONSENT_PATH = "/consent"

const CONSENT_REQUIRED_ERROR = "consent is required"

export function isConsentRequired(status: number, body: Record<string, unknown>): boolean {
  return status === 403 && body["error"] === CONSENT_REQUIRED_ERROR
}
