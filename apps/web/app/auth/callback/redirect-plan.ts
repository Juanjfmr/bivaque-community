import { isRecoveryNext, RECOVERY_PATH } from "../../../lib/auth/recovery-intent"

/**
 * Decisões de destino do /auth/callback, puras para poderem ser travadas por
 * teste sem runtime Next. A regra que elas guardam:
 *
 *   - falha no link que veio da TELA DE CONFIRMAÇÃO (next=/auth/confirmar-email)
 *     devolve a pessoa ao painel expirado da prancha 37, com contador e envio
 *     novo — não ao beco sem saída do callback-error;
 *   - falha de qualquer outro link (Google) vai ao callback-error sem detalhe
 *     sensível (R06);
 *   - link de recuperação inválido volta ao formulário de recuperação para
 *     que a pessoa peça outro link, em vez de ficar presa no callback-error;
 *   - sucesso no link de confirmação entrega "/" — quem resolve o destino é o
 *     proxy, com a sessão recém-trocada; o callback não escolhe rota de membro.
 *
 * O `next` aqui já passou por sanitizeNext: só rota interna, nunca absoluta.
 */

export const CONFIRM_EMAIL_PATH = "/auth/confirmar-email"
export { RECOVERY_PATH }

export function callbackFailureTarget(sanitizedNext: string): string {
  if (sanitizedNext === CONFIRM_EMAIL_PATH) return `${CONFIRM_EMAIL_PATH}?estado=expirado`
  if (isRecoveryNext(sanitizedNext)) return "/recuperar-senha?origem=link"
  return "/auth/callback-error"
}

export function callbackSuccessTarget(sanitizedNext: string): string {
  return sanitizedNext === CONFIRM_EMAIL_PATH ? "/" : sanitizedNext
}

export function shouldOpenRecoveryIntent(
  redirectType: string | null,
  sanitizedNext: string,
): boolean {
  return redirectType === "recovery" && isRecoveryNext(sanitizedNext)
}

/**
 * O aceite só é aceito quando o navegador recebeu um intent HttpOnly emitido pela
 * Server Action depois que a caixa foi marcada. Query params são informativas;
 * não são autorização nem prova de aceite.
 */
export function shouldRecordSignupConsent(hasServerIntent: boolean): boolean {
  return hasServerIntent
}
