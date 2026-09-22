/**
 * Canal de suporte do piloto. Único lugar onde o contato é declarado.
 *
 * E-mail é o único canal externo, por decisão: ver §Canal de suporte.
 * Quem já está dentro da plataforma é atendido pela própria plataforma
 * (Task 11), não por canal externo.
 *
 * O endereço é uma caixa de função definida por NEXT_PUBLIC_SUPPORT_EMAIL no
 * ambiente. Nunca há endereço pessoal hardcoded: sem a variável, o valor é o
 * sentinela `<<DEFINIR>>`, que o gate de escopo recusa em produção. O prefixo
 * NEXT_PUBLIC_ é intencional — a tela exibe o endereço ao membro, então ele é
 * público por natureza; o que não pode existir é uma caixa pessoal no bundle.
 */
export const SUPPORT_EMAIL = process.env["NEXT_PUBLIC_SUPPORT_EMAIL"] ?? "<<DEFINIR>>"
export const SUPPORT_SLA_HOURS = 48
