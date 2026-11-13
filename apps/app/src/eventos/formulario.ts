import { FalhaDaApi } from "@/lib/api/cliente"
import type { DadosDoEncontro } from "@/lib/dados/eventos"

/**
 * A régua do formulário de encontro no app.
 *
 * Ela repete os limites do servidor (`apps/web/lib/events/event-form.ts`) porque
 * o app é outro pacote e não importa código do servidor para o bundle. Quem
 * manda é o servidor: aqui só se evita mandar o que já se sabe que volta 400.
 *
 * Data e hora são digitadas e lidas em pt-BR (dd/mm/aaaa e 24 h). O campo
 * nativo `datetime-local` segue o idioma do navegador — num navegador em inglês
 * ele mostra mm/dd/yyyy e AM/PM —, então os dois campos são de texto e a
 * conversão para instante é feita aqui.
 */
export const LIMITES_DO_ENCONTRO = {
  titulo: 200,
  descricao: 2000,
  local: 200,
} as const

/** O que a pessoa digita: data e hora separadas, no formato brasileiro. */
export type RascunhoDoEncontro = Readonly<{
  titulo: string
  descricao: string
  /** dd/mm/aaaa */
  data: string
  /** HH:MM, 24 h */
  hora: string
  local: string
}>

export type CampoDoEncontro = "titulo" | "data" | "hora" | "local" | "descricao"

/** Cada erro fica no campo que o originou, nunca só no rodapé. */
export type ErrosDoEncontro = Readonly<Partial<Record<CampoDoEncontro, string>>>

const DOIS = (valor: number) => String(valor).padStart(2, "0")

/** dd/mm/aaaa → dia, mês e ano, ou `null` quando o texto não é uma data. */
function partesDaData(valor: string): { ano: number; mes: number; dia: number } | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim())
  if (partes === null) return null
  const dia = Number(partes[1])
  const mes = Number(partes[2])
  const ano = Number(partes[3])
  const data = new Date(ano, mes - 1, dia)
  // 31/02 vira 03/03 no calendário: comparar de volta recusa o dia inexistente.
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    return null
  }
  return { ano, mes, dia }
}

/** HH:MM em 24 h, ou `null`. */
function partesDaHora(valor: string): { hora: number; minuto: number } | null {
  const partes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(valor.trim())
  if (partes === null) return null
  return { hora: Number(partes[1]), minuto: Number(partes[2]) }
}

/** O instante que a pessoa digitou, no fuso dela; `null` quando não existe. */
export function instanteDoEncontro(entrada: Readonly<{ data: string; hora: string }>): Date | null {
  const data = partesDaData(entrada.data)
  const hora = partesDaHora(entrada.hora)
  if (data === null || hora === null) return null
  return new Date(data.ano, data.mes - 1, data.dia, hora.hora, hora.minuto)
}

/** Os erros por campo; vazio quando dá para enviar. */
export function errosDoEncontro(entrada: RascunhoDoEncontro): ErrosDoEncontro {
  const erros: Partial<Record<CampoDoEncontro, string>> = {}
  const titulo = entrada.titulo.trim()
  if (titulo.length < 2) erros.titulo = "O título precisa de pelo menos 2 caracteres."
  else if (titulo.length > LIMITES_DO_ENCONTRO.titulo) {
    erros.titulo = `O título pode ter no máximo ${LIMITES_DO_ENCONTRO.titulo} caracteres.`
  }
  if (entrada.descricao.trim().length > LIMITES_DO_ENCONTRO.descricao) {
    erros.descricao = `A descrição pode ter no máximo ${LIMITES_DO_ENCONTRO.descricao} caracteres.`
  }
  if (entrada.local.trim().length > LIMITES_DO_ENCONTRO.local) {
    erros.local = `O local pode ter no máximo ${LIMITES_DO_ENCONTRO.local} caracteres.`
  }
  if (entrada.data.trim() === "") erros.data = "Informe a data, como 05/12/2026."
  else if (partesDaData(entrada.data) === null) {
    erros.data = /^\d{2}\/\d{2}\/\d{4}$/.test(entrada.data.trim())
      ? "Essa data não existe. Confira o dia e o mês."
      : "Data em dia/mês/ano, como 05/12/2026."
  }
  if (entrada.hora.trim() === "") erros.hora = "Informe a hora, como 19:30."
  else if (partesDaHora(entrada.hora) === null) erros.hora = "Hora em 24 h, como 19:30."
  return erros
}

/** `true` quando os obrigatórios estão certos: é o que habilita a ação primária. */
export function encontroValido(entrada: RascunhoDoEncontro): boolean {
  return Object.keys(errosDoEncontro(entrada)).length === 0
}

/** O corpo enviado: sem espaço sobrando e com o instante em ISO. */
export function corpoDoEncontro(entrada: RascunhoDoEncontro): DadosDoEncontro | null {
  const quando = instanteDoEncontro(entrada)
  if (quando === null) return null
  return {
    titulo: entrada.titulo.trim(),
    descricao: entrada.descricao.trim(),
    local: entrada.local.trim(),
    comecaEm: quando.toISOString(),
  }
}

/** ISO do servidor para o que os campos mostram, no fuso de quem usa. */
export function paraDataEHora(iso: string): Readonly<{ data: string; hora: string }> {
  const quando = new Date(iso)
  if (Number.isNaN(quando.getTime())) return { data: "", hora: "" }
  return {
    data: `${DOIS(quando.getDate())}/${DOIS(quando.getMonth() + 1)}/${quando.getFullYear()}`,
    hora: `${DOIS(quando.getHours())}:${DOIS(quando.getMinutes())}`,
  }
}

/**
 * "Sábado, 05/12/2026 · às 19h30" — a data como se fala em português, com a
 * hora em 24 h.
 */
export function rotuloDeDataHora(quando: Date): string {
  if (Number.isNaN(quando.getTime())) return ""
  const dia = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(quando)
  const data = `${DOIS(quando.getDate())}/${DOIS(quando.getMonth() + 1)}/${quando.getFullYear()}`
  const hora =
    quando.getMinutes() === 0
      ? `${quando.getHours()}h`
      : `${quando.getHours()}h${DOIS(quando.getMinutes())}`
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${data} · às ${hora}`
}

/** Cada ação tem a sua frase quando o servidor não manda uma. */
export type AcaoQueFalha = "agenda" | "encontro" | "criar" | "editar" | "presenca" | "pergunta"

const PADRAO: Readonly<Record<AcaoQueFalha, string>> = {
  agenda: "Não foi possível carregar a agenda. Tente de novo.",
  encontro: "Não foi possível carregar o encontro. Tente de novo.",
  criar: "Não foi possível criar o encontro. Tente de novo.",
  editar: "Não foi possível salvar as alterações. Tente de novo.",
  presenca: "Não foi possível registrar sua presença. Tente de novo.",
  pergunta: "Não foi possível enviar. Seu texto foi mantido.",
}

/**
 * O que a pessoa lê quando uma escrita falha.
 *
 * A ordem importa: a frase do SERVIDOR vem primeiro — é a única que sabe o
 * motivo exato —, depois o motivo curto que o servidor devolveu, e só no fim a
 * frase da ação. Dizer "só quem organiza" para toda recusa transformava uma
 * pergunta bloqueada em acusação de autoria.
 */
export function mensagemDaFalha(falha: unknown, acao: AcaoQueFalha): string {
  if (!(falha instanceof FalhaDaApi)) return PADRAO[acao]
  if (falha.codigo === "sem-sessao") return "Sua sessão expirou. Entre de novo para continuar."
  if (falha.codigo === "limite") return "Muitas tentativas seguidas. Espere um pouco."
  if (falha.motivoDoServidor === "de-outra-cidade") {
    return "Este encontro é de outra cidade: presença e pergunta ficam para quem mora lá."
  }
  if (falha.motivoDoServidor === "sem-cidade") {
    return "Escolha a sua cidade antes de criar um encontro."
  }
  if (falha.motivoDoServidor === "nao-organiza") {
    return "Só quem organiza pode mudar este encontro."
  }
  if (falha.mensagem !== null) return falha.mensagem
  if (falha.codigo === "nao-encontrado") return "Este encontro não está mais disponível."
  return PADRAO[acao]
}

/** O encontro pedido não existe (ou não é visível): a tela é de indisponível. */
export function encontroSumiu(falha: unknown): boolean {
  return falha instanceof FalhaDaApi && falha.codigo === "nao-encontrado"
}

/** Sessão vencida: a saída é entrar de novo, não tentar de novo. */
export function sessaoVencida(falha: unknown): boolean {
  return falha instanceof FalhaDaApi && falha.codigo === "sem-sessao"
}

/** Recusa de acesso: entrar de novo não resolve, tentar de novo também não. */
export function acessoNegado(falha: unknown): boolean {
  return falha instanceof FalhaDaApi && falha.codigo === "recusado"
}

/** A chamada foi cancelada porque a tela saiu: não é falha para mostrar. */
export function foiAbortada(falha: unknown): boolean {
  return falha instanceof DOMException && falha.name === "AbortError"
}
