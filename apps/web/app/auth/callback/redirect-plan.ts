/**
 * Decisões de destino do /auth/callback, puras para poderem ser travadas por
 * teste sem runtime Next. A regra que elas guardam:
 *
 *   - falha no link que veio da TELA DE CONFIRMAÇÃO (next=/auth/confirmar-email)
 *     devolve a pessoa ao painel expirado da prancha 37, com contador e envio
 *     novo — não ao beco sem saída do callback-error;
 *   - falha de qualquer outro link (Google, recuperação) vai ao callback-error
 *     sem detalhe sensível (R06);
 *   - sucesso no link de confirmação entrega "/" — quem resolve o destino é o
 *     proxy, com a sessão recém-trocada; o callback não escolhe rota de membro.
 *
 * O `next` aqui já passou por sanitizeNext: só rota interna, nunca absoluta.
 */

export const CONFIRM_EMAIL_PATH = "/auth/confirmar-email"

export function callbackFailureTarget(sanitizedNext: string): string {
  return sanitizedNext === CONFIRM_EMAIL_PATH
    ? `${CONFIRM_EMAIL_PATH}?estado=expirado`
    : "/auth/callback-error"
}

export function callbackSuccessTarget(sanitizedNext: string): string {
  return sanitizedNext === CONFIRM_EMAIL_PATH ? "/" : sanitizedNext
}

/**
 * O marcador `consent` chega dentro do link de confirmação — URL assinada e
 * emitida pelo próprio GoTrue no envio, não cookie que o cliente escreve. Ele
 * diz apenas "esta conta nasceu de um cadastro que aceitou os textos na versão
 * corrente"; as versões gravadas são as constantes do servidor.
 */
export function shouldRecordSignupConsent(
  consentParam: string | null,
  currentVersion: number,
): boolean {
  return consentParam !== null && consentParam === String(currentVersion)
}
