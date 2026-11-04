import { classifyEntrySend } from "../auth/entry-send"

/**
 * Entrada por código no e-mail: a parte pura das rotas do app (LAN-F01,
 * ADR-20261101-entrada-unica-por-codigo).
 *
 * Duas regras de segurança mandam aqui e são elas que os testes fixam:
 *
 * 1. **Anti-enumeração.** O envio responde igual para conta nova e conta
 *    existente. O GoTrue devolve "user not found" para um endereço sem conta
 *    quando `shouldCreateUser` é falso; aqui ele é verdadeiro (a pessoa entra e
 *    a conta nasce se preciso), mas mesmo assim a resposta visível colapsa os
 *    dois casos em "enviado" — inclusive os erros de existência que o
 *    classificador existente já conhece.
 * 2. **Mensagem única de código.** Código errado, vencido ou já usado têm a
 *    mesma resposta: "Código inválido ou vencido". Nada de dizer qual dos três
 *    foi, e nada do erro cru do GoTrue na tela.
 *
 * O e-mail e o código são normalizados antes de qualquer chamada: espaço nas
 * pontas, maiúscula no endereço e hífen no código não mudam o que a pessoa quis
 * dizer.
 */

/** Reenvio liberado depois deste tempo, com contagem visível na tela. */
export const SEGUNDOS_DE_REENVIO = 60

/** O mesmo `otp_length` do `supabase/config.toml`. */
export const DIGITOS_DO_CODIGO = 6

/** A validade do código no e-mail (ADR: 10 minutos). */
export const MINUTOS_DE_VALIDADE = 10

const EMAIL_MAXIMO = 254
const EMAIL_SIMPLES = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Normaliza o e-mail. Devolve `null` quando ele não tem cara de endereço — a
 * rota responde erro de entrada, nunca chama o GoTrue com lixo.
 */
export function emailDeEntrada(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null
  const email = bruto.trim().toLowerCase()
  if (email === "" || email.length > EMAIL_MAXIMO) return null
  return EMAIL_SIMPLES.test(email) ? email : null
}

/**
 * Normaliza o código digitado. A pessoa pode colar "123 456" do e-mail; só os
 * dígitos importam. Fora de 6 dígitos, `null`.
 */
export function codigoDeEntrada(bruto: unknown): string | null {
  if (typeof bruto !== "string" && typeof bruto !== "number") return null
  const digitos = String(bruto).replace(/\D/g, "")
  return digitos.length === DIGITOS_DO_CODIGO ? digitos : null
}

export type VereditoDoEnvio =
  | { readonly estado: "enviado" }
  | { readonly estado: "limite"; readonly reenviarEm: number }
  | { readonly estado: "indisponivel" }

/**
 * Traduz o erro do `signInWithOtp` para o que a tela pode dizer.
 *
 * Reusa `classifyEntrySend`, que já colapsa os erros que denunciam a existência
 * da conta em "sent" e separa só o que é útil para a pessoa: limite de reenvio
 * (com segundos) e falha de transporte. "failed" aqui é erro de servidor que
 * não fala da conta: vira "indisponivel", nunca "enviado".
 */
export function vereditoDoEnvio(error: unknown): VereditoDoEnvio {
  const classificado = classifyEntrySend(error)
  if (classificado.outcome === "sent") return { estado: "enviado" }
  if (classificado.outcome === "rate-limited") {
    return { estado: "limite", reenviarEm: classificado.retryAfterSeconds ?? SEGUNDOS_DE_REENVIO }
  }
  return { estado: "indisponivel" }
}

export type VereditoDaVerificacao =
  | { readonly estado: "autenticado" }
  | { readonly estado: "codigo-invalido" }
  | { readonly estado: "limite"; readonly reenviarEm: number }
  | { readonly estado: "indisponivel" }

const ERRO_CRU_DE_CODIGO = [
  "token has expired or is invalid",
  "invalid token",
  "otp_expired",
  "invalid otp",
]

const ERRO_DE_LIMITE = ["over_request_rate_limit", "over_email_send_rate_limit", "rate limit"]

function erroParece(error: unknown, padroes: readonly string[]): boolean {
  if (typeof error !== "object" || error === null) return false
  const alvo = error as { code?: unknown; message?: unknown }
  const texto = `${String(alvo.code ?? "")} ${String(alvo.message ?? "")}`.toLowerCase()
  return padroes.some((padrao) => texto.includes(padrao))
}

/**
 * Traduz o erro do `verifyOtp`. O mesmo caminho cobre código errado, vencido,
 * reusado e tentativa demais: todos respondem "Código inválido ou vencido", para
 * não dar pista de qual falhou.
 */
export function vereditoDaVerificacao(error: unknown): VereditoDaVerificacao {
  if (error === null || error === undefined) return { estado: "autenticado" }
  if (erroParece(error, ERRO_DE_LIMITE)) {
    return { estado: "limite", reenviarEm: SEGUNDOS_DE_REENVIO }
  }
  if (erroParece(error, ERRO_CRU_DE_CODIGO)) return { estado: "codigo-invalido" }
  return { estado: "indisponivel" }
}
