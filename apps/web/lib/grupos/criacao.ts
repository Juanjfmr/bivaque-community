/**
 * A régua de criar grupo, uma só para a rota do app.
 *
 * Ela repete os limites do banco (`name` 2-80 em 20260802001000, `description`
 * até 500 e `rules` até 600 em 20261024120000) e a validação que a tela antiga
 * faz em `groups/page.tsx`: nome com pelo menos 3 letras e comparação sem
 * acento nem caixa para "já existe um grupo com esse nome". Quem manda é o
 * banco; aqui só se evita mandar o que já se sabe que volta 400.
 *
 * Puro e sem import de servidor, para ser lido pela rota e testado direto.
 */

export const NOME_MIN = 3
export const NOME_MAX = 80
export const DESCRICAO_MAX = 500
export const REGRAS_MAX = 600

export type DadosDoNovoGrupo = Readonly<{
  nome: string
  descricao: string
  regras: string
  /** Fechado pede aprovação para entrar: `visibility = private`. */
  fechado: boolean
}>

export type NovoGrupoLido =
  | { readonly ok: true; readonly grupo: DadosDoNovoGrupo }
  | { readonly ok: false; readonly mensagem: string }

/** A mensagem da recusa, ou `null` quando o grupo pode ser criado. */
export function validarNovoGrupo(grupo: DadosDoNovoGrupo): string | null {
  if (grupo.nome.length < NOME_MIN) return "Dê um nome ao grupo, com pelo menos 3 letras."
  if (grupo.nome.length > NOME_MAX) {
    return `O nome do grupo pode ter no máximo ${NOME_MAX} caracteres.`
  }
  if (grupo.descricao.length > DESCRICAO_MAX) {
    return `A descrição pode ter no máximo ${DESCRICAO_MAX} caracteres.`
  }
  if (grupo.regras.length > REGRAS_MAX) {
    return `As regras podem ter no máximo ${REGRAS_MAX} caracteres.`
  }
  return null
}

/** O corpo do app lido para a criação; tipo errado é erro de dados. */
export function lerNovoGrupo(corpo: Record<string, unknown>): NovoGrupoLido {
  const { nome, descricao = "", regras = "", fechado = false } = corpo
  if (
    typeof nome !== "string" ||
    typeof descricao !== "string" ||
    typeof regras !== "string" ||
    typeof fechado !== "boolean"
  ) {
    return { ok: false, mensagem: "Dados do grupo inválidos." }
  }
  const grupo: DadosDoNovoGrupo = {
    nome: nome.trim(),
    descricao: descricao.trim(),
    regras: regras.trim(),
    fechado,
  }
  const mensagem = validarNovoGrupo(grupo)
  return mensagem === null ? { ok: true, grupo } : { ok: false, mensagem }
}

/** "Famílias" e "familias" são o mesmo nome, como na tela antiga. */
export function nomeNormalizado(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

/**
 * `true` quando a cidade já tem um grupo com esse nome.
 *
 * shortcut: a checagem é sobre os nomes que a sessão enxerga (RLS), não há
 * índice único em `groups.name` — dois pedidos simultâneos com o mesmo nome
 * podem passar. Trocar por unicidade no banco quando nome virar identidade.
 */
export function nomeEmUso(nomes: readonly string[], nome: string): boolean {
  const alvo = nomeNormalizado(nome)
  return nomes.some((existente) => nomeNormalizado(existente) === alvo)
}
