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

/**
 * O que a pessoa lê quando uma escrita falha. A decisão é pelo código do
 * cliente (`status` do servidor), nunca pelo texto da resposta.
 */
export function mensagemDaFalha(falha: unknown): string {
  if (falha instanceof FalhaDaApi) {
    if (falha.codigo === "sem-sessao") return "Sua sessão expirou. Entre de novo para continuar."
    if (falha.codigo === "recusado") return "Só quem organiza pode mudar este encontro."
    if (falha.codigo === "nao-encontrado") return "Este encontro não está mais disponível."
    if (falha.codigo === "limite") return "Muitas tentativas seguidas. Espere um pouco."
    if (falha.mensagem !== null) return falha.mensagem
  }
  return "Não foi possível salvar agora. Tente de novo."
}
