/**
 * Cópia humana para falhas transitórias da verificação de elegibilidade.
 *
 * O motivo desta função existe (plano de observabilidade, Task 10): o fluxo
 * de onboarding mostrava o código cru — `RATE_LIMITED`, `TIMEOUT`,
 * `SCHEMA_DRIFT` — direto na UI, e quem não entende a diferença entre "erro
 * temporário" e "você não é elegível" desiste achando que foi rejeitado.
 *
 * A distinção do runbook é preservada: o motivo exato de uma REJEIÇÃO nunca
 * é informado (dado sensível de elegibilidade). `RATE_LIMITED` e `TIMEOUT`
 * não são sinal de elegibilidade — são falha de infraestrutura, e esconder a
 * natureza delas só transforma um erro transitório em rejeição aparente.
 *
 * Regra de ouro: nenhum código cru, nenhum detalhe de infraestrutura chega à
 * UI. O fallback devolve a mesma cópia de instabilidade, sem ecoar o código
 * desconhecido.
 */

const RATE_LIMITED_COPY =
  "O Portal da Transparência está recebendo muitas consultas agora. Tente de novo em alguns minutos — seus dados não foram perdidos."
const TIMEOUT_COPY =
  "O Portal da Transparência demorou mais que o esperado para responder. Tente de novo em alguns minutos."
const UNAVAILABLE_COPY = (supportEmail: string) =>
  supportEmail
    ? `Não foi possível consultar o Portal da Transparência agora. Tente mais tarde ou fale com a gente: ${supportEmail}.`
    : "Não foi possível consultar o Portal da Transparência agora. Tente mais tarde."
const INSTABILITY_COPY = (supportEmail: string) =>
  supportEmail
    ? `O Portal da Transparência está instável no momento. Tente mais tarde ou fale com a gente: ${supportEmail}.`
    : "O Portal da Transparência está instável no momento. Tente mais tarde."

export function verificationErrorMessage(errorCode: string, supportEmail: string): string {
  switch (errorCode) {
    case "RATE_LIMITED":
      return RATE_LIMITED_COPY
    case "TIMEOUT":
    case "HTTP_ERROR":
      return TIMEOUT_COPY
    case "INVALID_KEY":
      return UNAVAILABLE_COPY(supportEmail)
    case "SCHEMA_DRIFT":
    case "EMPTY_RESPONSE":
      return INSTABILITY_COPY(supportEmail)
    default:
      return INSTABILITY_COPY(supportEmail)
  }
}
