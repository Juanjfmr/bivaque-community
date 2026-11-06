/**
 * A régua do Guia para as rotas do app (RUN-009 / ADR-20261105 §2).
 *
 * O que a rota aceita e o que ela devolve mora aqui, num lugar só: a tela
 * antiga já valida a sugestão nas tabelas de `guide-article.ts`, e duplicar o
 * limite por rota faria o app recusar o que a web aceita.
 *
 * A ordem do diretório é (name, id) e o cursor é opaco (`nome|id`) — a mesma
 * forma do F05, para a virada da página não repetir nem perder entrada.
 */

export const CATEGORIAS_DO_GUIA = ["school", "hospital", "transporter", "courier"] as const
export type CategoriaDoGuia = (typeof CATEGORIAS_DO_GUIA)[number]

export const LIMITE_PADRAO_DO_GUIA = 20
export const LIMITE_MAXIMO_DO_GUIA = 50

const TAMANHO_MAXIMO_DO_TERMO = 80
const TAMANHO_MAXIMO_DA_DESCRICAO = 2000
const TAMANHO_MAXIMO_DA_REFERENCIA = 500

export function ehCategoriaDoGuia(valor: string): valor is CategoriaDoGuia {
  return (CATEGORIAS_DO_GUIA as readonly string[]).includes(valor)
}

/**
 * O termo vai para dentro de um filtro `or` do PostgREST, onde `,` `(` `"` e
 * `%`/`*` têm sintaxe própria. Só o texto que a pessoa digitou sobrevive; o
 * resto vira espaço. Vazio depois da limpeza é "sem busca", não busca quebrada.
 */
export function termoDeBusca(valor: string | null): string {
  if (valor === null) return ""
  return valor
    .replace(/[,()"\\%*/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TAMANHO_MAXIMO_DO_TERMO)
}

/** Termo absurdamente longo é pedido inválido, não busca silenciosamente cortada. */
export function termoAceito(valor: string | null): boolean {
  return valor === null || valor.trim().length <= TAMANHO_MAXIMO_DO_TERMO
}

export function cursorDaEntrada(nome: string, id: string): string {
  return `${nome}|${id}`
}

/**
 * Valor dentro de `"…"` num filtro do PostgREST: `\` e `"` são sintaxe e
 * precisam de escape. Sem isso, um nome como `Colégio "Militar"` quebra a
 * página 2, e um cursor forjado vira filtro.
 */
export function valorEntreAspas(valor: string): string {
  return valor.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

export function lerCursor(valor: string): { nome: string; id: string } | null {
  const separador = valor.lastIndexOf("|")
  if (separador <= 0) return null
  const nome = valor.slice(0, separador)
  const id = valor.slice(separador + 1)
  if (nome.trim() === "" || !/^[0-9a-f-]{36}$/i.test(id)) return null
  return { nome, id }
}

export type SugestaoPedida = Readonly<{ descricao: string; referencia: string | null }>

/**
 * O corpo da sugestão: só texto que a pessoa escreveu. O artigo, o solicitante
 * e a cidade vêm do banco — nunca do corpo. Devolve `null` para pedido torto.
 */
export function sugestaoDoCorpo(corpo: Readonly<Record<string, unknown>>): SugestaoPedida | null {
  const descricao = typeof corpo["descricao"] === "string" ? corpo["descricao"].trim() : ""
  if (descricao.length < 1 || descricao.length > TAMANHO_MAXIMO_DA_DESCRICAO) return null
  const referenciaBruta = corpo["referencia"]
  if (referenciaBruta !== undefined && typeof referenciaBruta !== "string") return null
  const referencia = typeof referenciaBruta === "string" ? referenciaBruta.trim() : ""
  if (referencia.length > TAMANHO_MAXIMO_DA_REFERENCIA) return null
  return { descricao, referencia: referencia === "" ? null : referencia }
}
