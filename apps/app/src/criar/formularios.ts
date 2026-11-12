/**
 * A régua dos formulários do Criar, por campo.
 *
 * Ela repete os limites do servidor (`apps/web/lib/listings/catalog.ts` e
 * `apps/web/lib/indications/indications.ts`) porque o app é outro pacote e não
 * importa código do servidor para o bundle. Quem manda é o servidor; aqui só se
 * evita mandar o que já se sabe que volta 400 — e cada frase nasce no campo que
 * a originou, com a mesma palavra que o servidor usaria.
 */

export const LIMITES_DA_PERGUNTA = {
  titulo: 8,
  tituloMaximo: 300,
  assunto: 60,
} as const

export type ErrosDaPergunta = Readonly<{ titulo?: string; assunto?: string }>

export function errosDaPergunta(entrada: {
  readonly titulo: string
  readonly assunto: string
}): ErrosDaPergunta {
  const erros: { titulo?: string; assunto?: string } = {}
  const titulo = entrada.titulo.trim()
  if (titulo.length < LIMITES_DA_PERGUNTA.titulo) {
    erros.titulo = "Escreva o que você procura com um pouco mais de contexto."
  } else if (titulo.length > LIMITES_DA_PERGUNTA.tituloMaximo) {
    erros.titulo = `Encurte o pedido para até ${LIMITES_DA_PERGUNTA.tituloMaximo} caracteres.`
  }
  if (entrada.assunto.trim().length > LIMITES_DA_PERGUNTA.assunto) {
    erros.assunto = `O assunto vai até ${LIMITES_DA_PERGUNTA.assunto} caracteres.`
  }
  return erros
}

export const LIMITES_DO_DESAPEGO = {
  titulo: 3,
  tituloMaximo: 120,
  bairro: 80,
  descricao: 2000,
  /** O mesmo teto do servidor, em centavos. */
  precoMaximoCents: 100_000_000,
} as const

export type CampoDoDesapego = "titulo" | "bairro" | "preco" | "descricao"

export type ErrosDoDesapego = Readonly<Partial<Record<CampoDoDesapego, string>>>

/** O preço como a pessoa digita no campo, em centavos. */
function precoEmCentavos(bruto: string): number | null {
  const valor = bruto.trim()
  const partes = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(valor)
  if (partes === null) return null
  const centavos = Number(partes[1]) * 100 + Number((partes[2] ?? "").padEnd(2, "0"))
  return Number.isFinite(centavos) && centavos > 0 ? centavos : null
}

export function errosDoDesapego(entrada: {
  readonly titulo: string
  readonly bairro: string
  readonly preco: string
  readonly descricao: string
}): ErrosDoDesapego {
  const erros: { titulo?: string; bairro?: string; preco?: string; descricao?: string } = {}
  const titulo = entrada.titulo.trim()
  if (titulo.length < LIMITES_DO_DESAPEGO.titulo) {
    erros.titulo = `O título precisa de pelo menos ${LIMITES_DO_DESAPEGO.titulo} caracteres.`
  } else if (titulo.length > LIMITES_DO_DESAPEGO.tituloMaximo) {
    erros.titulo = "O título passa de 120 caracteres."
  }
  const bairro = entrada.bairro.trim()
  if (bairro === "") erros.bairro = "Informe o bairro."
  else if (bairro.length > LIMITES_DO_DESAPEGO.bairro)
    erros.bairro = "O bairro passa de 80 caracteres."
  const preco = entrada.preco.trim()
  if (preco === "") erros.preco = "Informe o preço do item."
  else {
    const centavos = precoEmCentavos(preco)
    if (centavos === null) erros.preco = "Informe um valor como 650 ou 650,00."
    else if (centavos > LIMITES_DO_DESAPEGO.precoMaximoCents) {
      erros.preco = "O valor informado é alto demais."
    }
  }
  const descricao = entrada.descricao.trim()
  if (descricao === "") erros.descricao = "Descreva o item."
  else if (descricao.length > LIMITES_DO_DESAPEGO.descricao) {
    erros.descricao = "A descrição passa de 2000 caracteres."
  }
  return erros
}

/** `true` quando dá para revisar: é o que habilita a ação primária. */
export function semErros(erros: Readonly<Partial<Record<string, string>>>): boolean {
  return Object.values(erros).every((erro) => erro === undefined)
}

/** "750.5" → "R$ 750,50": o preço como se lê em português. */
export function precoBRL(bruto: string): string {
  const valor = Number(bruto.trim())
  if (bruto.trim() === "" || !Number.isFinite(valor)) return "R$ —"
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
