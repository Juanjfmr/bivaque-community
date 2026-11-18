/**
 * Força Armada e OM na tela do app (F10 / RUN-170): o enum fechado que a rota
 * aceita, com os rótulos que a pessoa lê.
 *
 * É a CÓPIA de apresentação do módulo compartilhado da web
 * (`apps/web/lib/profile/affiliation.ts`); a fronteira de valor continua sendo
 * aquela, chamada pela rota `/api/app/voce/afiliacao`, e o check do banco. O app
 * não importa código do Next — o que muda aqui é só o que a tela oferece.
 */

export const FORCAS_ARMADAS = [
  { id: "marinha", rotulo: "Marinha" },
  { id: "exercito", rotulo: "Exército" },
  { id: "aeronautica", rotulo: "Aeronáutica" },
] as const

/**
 * O `Select` da base não aceita item de valor vazio e precisa mostrar o estado
 * "não declarado". Esta escolha vira `null` no corpo: limpar o campo é o apagar
 * de verdade (D3), e a rota traduz `null` em DELETE da linha.
 */
export const SEM_FORCA = "nenhuma"

export const OPCOES_DE_FORCA = [
  { valor: SEM_FORCA, titulo: "Nenhuma" },
  ...FORCAS_ARMADAS.map((forca) => ({ valor: forca.id, titulo: forca.rotulo })),
]

/** Teto da OM — o mesmo de `display_name`, e o do check do banco. */
export const LIMITE_DA_OM = 80

/** O valor gravado como escolha da tela; qualquer coisa fora do enum é "Nenhuma". */
export function forcaDoValor(valor: string | null): string {
  return FORCAS_ARMADAS.some((forca) => forca.id === valor) ? String(valor) : SEM_FORCA
}

/** O corpo da rota: a sentinela de "Nenhuma" é ausência de declaração. */
export function valorDaForca(escolha: string): string | null {
  return escolha === SEM_FORCA ? null : escolha
}
