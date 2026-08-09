/**
 * Canal de suporte do piloto. Único lugar onde o contato é declarado.
 *
 * E-mail é o único canal externo, por decisão: ver §Canal de suporte.
 * Quem já está dentro da plataforma é atendido pela própria plataforma
 * (Task 11), não por canal externo.
 *
 * O placeholder abaixo NÃO pode chegar em produção: tests/scope/
 * support-channel.test.mjs falha enquanto ele estiver presente.
 */
export const SUPPORT_EMAIL = process.env["NEXT_PUBLIC_SUPPORT_EMAIL"] ?? "<<DEFINIR>>"
export const SUPPORT_SLA_HOURS = 48
