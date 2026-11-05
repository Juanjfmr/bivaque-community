import { FalhaDaApi } from "@/lib/api/cliente"
import type { DadosDoEncontro } from "@/lib/dados/eventos"

/**
 * A régua do formulário de encontro no app.
 *
 * Ela repete os limites do servidor (`apps/web/lib/events/event-form.ts`) porque
 * o app é outro pacote e não importa código do servidor para o bundle. Quem
 * manda é o servidor: aqui só se evita mandar o que já se sabe que volta 400.
 */
export const LIMITES_DO_ENCONTRO = {
  titulo: 200,
  descricao: 2000,
  local: 200,
} as const

/** A mensagem para a pessoa, ou `null` quando dá para enviar. */
export function validarEncontro(entrada: DadosDoEncontro): string | null {
  const titulo = entrada.titulo.trim()
  if (titulo.length < 2) return "O título precisa de pelo menos 2 caracteres."
  if (titulo.length > LIMITES_DO_ENCONTRO.titulo) {
    return `O título pode ter no máximo ${LIMITES_DO_ENCONTRO.titulo} caracteres.`
  }
  if (entrada.descricao.trim().length > LIMITES_DO_ENCONTRO.descricao) {
    return `A descrição pode ter no máximo ${LIMITES_DO_ENCONTRO.descricao} caracteres.`
  }
  if (entrada.local.trim().length > LIMITES_DO_ENCONTRO.local) {
    return `O local pode ter no máximo ${LIMITES_DO_ENCONTRO.local} caracteres.`
  }
  if (entrada.comecaEm.trim() === "") return "Informe a data e a hora do encontro."
  if (Number.isNaN(new Date(entrada.comecaEm).getTime())) return "Data e hora inválidas."
  return null
}

/** O corpo enviado: sem espaço sobrando e com o instante em ISO. */
export function corpoDoEncontro(entrada: DadosDoEncontro): DadosDoEncontro {
  return {
    titulo: entrada.titulo.trim(),
    descricao: entrada.descricao.trim(),
    local: entrada.local.trim(),
    comecaEm: new Date(entrada.comecaEm).toISOString(),
  }
}

/** ISO do servidor para o valor do campo `datetime-local`, no fuso de quem usa. */
export function paraCampoDeDataHora(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ""
  const dois = (valor: number) => String(valor).padStart(2, "0")
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}T${dois(data.getHours())}:${dois(data.getMinutes())}`
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
