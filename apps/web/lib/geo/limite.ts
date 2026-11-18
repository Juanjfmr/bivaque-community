/**
 * O limitador da geocodificação (RUN-175 / ADR-20261116 §2, emenda SEC-016).
 *
 * Janela deslizante em memória com dois tetos, conferidos antes da ida ao
 * provedor: 20 consultas reais por hora e por pessoa, e 300 consultas reais por
 * hora no processo inteiro. O cache hit não passa por aqui — só a chamada de
 * rede conta. Vinte é folgado para quem publica (cada anúncio novo com CEP novo
 * gasta uma) e apertado para um laço; o teto global existe para o custo do
 * provedor quando muita gente consulta ao mesmo tempo.
 *
 * A pessoa barrada pelo teto GLOBAL não gasta a cota dela: sem consulta, sem
 * consumo. A recusa tem o mesmo formato (`esperarMs`), então os chamadores
 * devolvem o mesmo 429 com `retry-after`.
 *
 * shortcut: a janela vive no processo. Com mais de uma instância do servidor o
 * teto efetivo multiplica pelo número de instâncias; o abuso de uma pessoa
 * continua limitado por instância. Quando o custo do provedor doer, a conta vai
 * para o banco no molde de `private.entry_otp_limits` (SEC-007).
 */

export const JANELA_MS = 60 * 60 * 1000
export const TETO_POR_PESSOA = 20
export const TETO_GLOBAL = 300

const usos = new Map<string, number[]>()
let globais: number[] = []

export type VereditoDoLimite =
  | Readonly<{ liberado: true }>
  | Readonly<{ liberado: false; esperarMs: number }>

/**
 * Zera as janelas. Só para teste: a janela vive no módulo, então um caso que
 * enche o processo contaminaria os seguintes do mesmo arquivo.
 */
export function reiniciarJanelasParaTeste(): void {
  usos.clear()
  globais = []
}

function recentes(instantes: number[], agora: number): number[] {
  const inicio = agora - JANELA_MS
  return instantes.filter((instante) => instante > inicio)
}

/** Consome uma consulta real ao provedor. Cache hit não chama esta função. */
export function consumirConsulta(pessoa: string, agora: number = Date.now()): VereditoDoLimite {
  const doProcesso = recentes(globais, agora)
  if (doProcesso.length >= TETO_GLOBAL) {
    globais = doProcesso
    const maisAntiga = doProcesso[0] ?? agora
    return { liberado: false, esperarMs: maisAntiga + JANELA_MS - agora }
  }
  globais = doProcesso

  const anteriores = recentes(usos.get(pessoa) ?? [], agora)
  if (anteriores.length >= TETO_POR_PESSOA) {
    usos.set(pessoa, anteriores)
    const maisAntiga = anteriores[0] ?? agora
    return { liberado: false, esperarMs: maisAntiga + JANELA_MS - agora }
  }
  anteriores.push(agora)
  usos.set(pessoa, anteriores)
  globais.push(agora)
  return { liberado: true }
}
