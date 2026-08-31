/**
 * Canal de suporte do piloto. Único lugar onde o contato é declarado.
 *
 * E-mail é o único canal externo, por decisão: ver §Canal de suporte.
 * Quem já está dentro da plataforma é atendido pela própria plataforma
 * (Task 11), não por canal externo.
 *
 * O valor pode ser sobrescrito pelo ambiente de produção, mas o canal aprovado
 * do Alpha também fica como fallback para não operar com endereço indefinido.
 */
export const SUPPORT_EMAIL = process.env["NEXT_PUBLIC_SUPPORT_EMAIL"] ?? "juanjfmr1@gmail.com"
export const SUPPORT_SLA_HOURS = 48
