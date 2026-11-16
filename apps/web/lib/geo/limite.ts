/**
 * O limitador da geocodificação por pessoa (RUN-175 / ADR-20261116 §2).
 *
 * Janela deslizante em memória: 20 consultas reais por hora e por pessoa. O
 * cache hit não passa por aqui — só a ida ao provedor conta. Vinte é folgado
 * para quem publica (cada anúncio novo com CEP novo gasta uma) e apertado para
 * um laço: o custo por consulta é do provedor, e o teto existe para ele.
 *
 * shortcut: a janela vive no processo. Com mais de uma instância do servidor o
 * teto efetivo multiplica pelo número de instâncias; o abuso de uma pessoa
 * continua limitado por instância. Quando o custo do provedor doer, a conta vai
 * para o banco no molde de `private.entry_otp_limits` (SEC-007).
 */

export const JANELA_MS = 60 * 60 * 1000
export const TETO_POR_PESSOA = 20

const usos = new Map<string, number[]>()

export type VereditoDoLimite =
  | Readonly<{ liberado: true }>
  | Readonly<{ liberado: false; esperarMs: number }>

/** Consome uma consulta real ao provedor. Cache hit não chama esta função. */
export function consumirConsulta(pessoa: string, agora: number = Date.now()): VereditoDoLimite {
  const inicio = agora - JANELA_MS
  const anteriores = (usos.get(pessoa) ?? []).filter((instante) => instante > inicio)
  if (anteriores.length >= TETO_POR_PESSOA) {
    usos.set(pessoa, anteriores)
    const maisAntiga = anteriores[0] ?? agora
    return { liberado: false, esperarMs: maisAntiga + JANELA_MS - agora }
  }
  anteriores.push(agora)
  usos.set(pessoa, anteriores)
  return { liberado: true }
}
