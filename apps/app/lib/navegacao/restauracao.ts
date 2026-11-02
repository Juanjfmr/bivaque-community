import { type DescritorDeFoco, type EstadoDaEntrada, seletorDoDescritor } from "./entrada"
import { SELETOR_DO_TITULO } from "./foco"

/**
 * A carga dos dados e elementos de uma entrada.
 *
 * A restauração de rolagem e foco espera este sinal explícito — não existe teto
 * de quadros nem tempo de parede. `concluida` resolve `true` quando os
 * elementos podem ser usados e `false` quando a pessoa saiu antes.
 */
export type CargaDaEntrada = {
  readonly concluida: Promise<boolean>
  cancelar(): void
}

/**
 * Carga que fica pendente até alguém liberar. A tela montada confirma quando os
 * elementos estão no DOM (`confirmar`); uma carga cuja tela saiu de cena é
 * liberada pela prova (`liberarSemTela`).
 */
export type CargaPendente = CargaDaEntrada & {
  confirmar(): void
  liberarSemTela(): void
}

export const CARGA_CONCLUIDA: CargaDaEntrada = {
  concluida: Promise.resolve(true),
  cancelar: () => {},
}

export function criarCargaPendente(): CargaPendente {
  let concluir: (valor: boolean) => void = () => {}
  const concluida = new Promise<boolean>((resolve) => {
    concluir = resolve
  })
  let resolvida = false
  const resolver = (valor: boolean) => {
    if (resolvida) return
    resolvida = true
    concluir(valor)
  }
  return {
    concluida,
    confirmar: () => resolver(true),
    liberarSemTela: () => resolver(true),
    cancelar: () => resolver(false),
  }
}

/** O que a restauração precisa da tela, injetado para poder ser testado puro. */
export type AmbienteDeRestauracao = {
  scrollar(para: number): void
  encontrar(seletor: string): Element | null
  visivel(elemento: Element): boolean
  focar(elemento: Element): void
}

export type RegistroDaRestauracao = {
  readonly rolagemAplicada: number
  readonly focoAplicado: string | null
  readonly alvoAusente: boolean
  readonly cancelada: boolean
}

/**
 * Aplica a rolagem e o foco guardados na entrada, depois que a carga dela
 * terminou. Alvo ausente cai no título da tela.
 */
export async function restaurarEntrada(opcoes: {
  readonly rolagem: number
  readonly foco: DescritorDeFoco | null
  readonly carga: CargaDaEntrada
  readonly ambiente: AmbienteDeRestauracao
  readonly alvoPadrao?: string
  readonly sinal?: AbortSignal
}): Promise<RegistroDaRestauracao> {
  const { rolagem, foco, carga, ambiente } = opcoes
  const alvoPadrao = opcoes.alvoPadrao ?? SELETOR_DO_TITULO

  const cancelada: RegistroDaRestauracao = {
    rolagemAplicada: 0,
    focoAplicado: null,
    alvoAusente: false,
    cancelada: true,
  }

  const concluiu = await carga.concluida
  // A resposta pode chegar depois de a pessoa sair: o sinal decide.
  if (!concluiu || opcoes.sinal?.aborted === true) return cancelada

  ambiente.scrollar(rolagem)

  const alvoUtilizavel = (seletor: string): Element | null => {
    const elemento = ambiente.encontrar(seletor)
    return elemento && ambiente.visivel(elemento) ? elemento : null
  }

  if (foco === null) {
    const titulo = ambiente.encontrar(alvoPadrao)
    if (titulo) ambiente.focar(titulo)
    return {
      rolagemAplicada: rolagem,
      focoAplicado: titulo ? alvoPadrao : null,
      alvoAusente: false,
      cancelada: false,
    }
  }

  const seletor = seletorDoDescritor(foco)
  const alvo = alvoUtilizavel(seletor)
  if (alvo) {
    ambiente.focar(alvo)
    return { rolagemAplicada: rolagem, focoAplicado: seletor, alvoAusente: false, cancelada: false }
  }

  const titulo = ambiente.encontrar(alvoPadrao)
  if (titulo) ambiente.focar(titulo)
  return {
    rolagemAplicada: rolagem,
    focoAplicado: titulo ? alvoPadrao : null,
    alvoAusente: true,
    cancelada: false,
  }
}

/**
 * Registra a rolagem da entrada. Sem altura rolável o evento veio do layout
 * encolhendo (a lista saiu), não da pessoa: a posição guardada não muda.
 */
export function registrarRolagem(
  atual: EstadoDaEntrada,
  alturaRolavel: number,
  posicao: number,
): EstadoDaEntrada {
  if (alturaRolavel <= 0) return atual
  return { ...atual, rolagem: posicao }
}
