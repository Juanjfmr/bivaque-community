/**
 * Texto: normalizar para busca e derivar iniciais.
 *
 * Os dois helpers vêm do protótipo (`utilities/format.js`): `norm` e `initals`.
 * O terceiro par do arquivo original, `esc`, **não** é portado: em JSX quem
 * escapa é o próprio React. O único ponto em que o app monta string de atributo
 * à mão é o seletor do descritor de foco, e ele escapa ali mesmo
 * (`lib/navegacao/entrada.ts`, `seletorDoDescritor`).
 */

/** Sem acento, minúsculo — como no protótipo (`norm`). */
export function normalizar(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/** Até duas iniciais em maiúsculas; sem nome, `BV` (protótipo: `initals`). */
export function iniciais(nome: unknown): string {
  const partes = String(nome ?? "")
    .trim()
    .split(/\s+/)
    .filter((parte) => parte !== "")
  if (partes.length === 0) return "BV"
  return `${partes[0]?.[0] ?? ""}${partes.length > 1 ? (partes.at(-1)?.[0] ?? "") : ""}`.toUpperCase()
}

/**
 * Um dos quatro tons da família das ilustrações para quem não tem foto, sempre
 * o mesmo para o mesmo nome — o cartão de Você, a barra e a lateral pintam a
 * pessoa igual (REGUA-003).
 */
export function tomDoNome(nome: string): 0 | 1 | 2 | 3 {
  let soma = 0
  for (const letra of nome) soma = (soma + (letra.codePointAt(0) ?? 0)) % 997
  return (soma % 4) as 0 | 1 | 2 | 3
}
