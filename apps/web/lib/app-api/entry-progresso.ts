/**
 * O rascunho da entrada: forma e validaÃ§Ã£o no servidor (LAN-F01,
 * ADR-20261102-progresso-da-entrada).
 *
 * A rota Ã© a Ãºnica escritora da tabela `entry_progress`, entÃ£o a validaÃ§Ã£o mora
 * aqui, num mÃ³dulo puro, e nÃ£o no cliente. TrÃªs regras nÃ£o sÃ£o negociÃ¡veis:
 *
 * 1. **Nada de segredo no rascunho.** CPF, documento, senha e token nunca sÃ£o
 *    gravados â€” o CPF Ã© consultado no servidor e sÃ³ o resultado volta; o e-mail
 *    do cÃ³digo Ã© derivado da sessÃ£o, nÃ£o do corpo. Chave com esse nome Ã© recusa,
 *    nÃ£o campo ignorado, para o erro aparecer em teste.
 * 2. **Forma fechada.** SÃ³ as chaves conhecidas do estado entram; chave
 *    desconhecida Ã© recusa. Assim o JSONB nÃ£o vira depÃ³sito de dado pessoal.
 * 3. **Tamanho limitado.** O rascunho Ã© um punhado de escolhas; um corpo grande
 *    demais Ã© recusado antes de chegar ao banco.
 *
 * A lista de etapas Ã© a mesma de `apps/app/src/previa-f01/fluxo.ts`; o teste
 * `tests/unit/app-api/entry-progresso.test.ts` compara as duas para nÃ£o drifar.
 */

export const ETAPAS_DO_FLUXO = [
  "porta",
  "email",
  "codigo",
  "aceite",
  "cpf",
  "nome",
  "cidade",
  "verificacao",
  "documento",
  "previa-cidade",
  "interesses",
  "combinado",
  "avisos",
  "inicio",
] as const

export type EtapaDoFluxo = (typeof ETAPAS_DO_FLUXO)[number]

export const VERSAO_DO_FLUXO = 2

export type MomentoDoRascunho = "chegando" | "morando" | "saindo"

export type EstadoDoRascunho = Readonly<{
  nome?: Readonly<{ nome: string; sobrenome: string }>
  cidade?: string
  momento?: MomentoDoRascunho
  interesses?: readonly string[]
  grupos?: readonly string[]
  avisos?: "ativados" | "agora-nao"
  convite?: boolean
}>

export type Progresso = Readonly<{
  versao: number
  etapa: EtapaDoFluxo
  estado: EstadoDoRascunho
}>

export function progressoInicial(): Progresso {
  return { versao: VERSAO_DO_FLUXO, etapa: "porta", estado: {} }
}

export type MotivoDeRecusa =
  | "corpo-invalido"
  | "versao-invalida"
  | "etapa-invalida"
  | "estado-invalido"
  | "campo-proibido"
  | "grande-demais"

export type Validacao =
  | { readonly ok: true; readonly progresso: Progresso }
  | { readonly ok: false; readonly motivo: MotivoDeRecusa }

/** O limite do rascunho inteiro, em bytes de JSON serializado. */
export const LIMITE_DO_ESTADO = 6 * 1024

// Chaves que um rascunho NUNCA tem: dado sensÃ­vel fica no servidor e nÃ£o no
// estado retomÃ¡vel. A comparaÃ§Ã£o Ã© sem caixa porque o JSON Ã© escrito Ã  mÃ£o.
const CAMPOS_PROIBIDOS = new Set([
  "cpf",
  "documento",
  "documentos",
  "senha",
  "password",
  "token",
  "authorization",
  "email",
  "emailmascarado",
  "payload",
])

const CHAVES_DO_ESTADO = new Set([
  "nome",
  "cidade",
  "momento",
  "interesses",
  "grupos",
  "avisos",
  "convite",
])

const MOMENTOS: readonly string[] = ["chegando", "morando", "saindo"]
const AVISOS: readonly string[] = ["ativados", "agora-nao"]

const LIMITE_DO_NOME = 80
const LIMITE_DA_CIDADE = 120
const LIMITE_DO_TEXTO_CURTO = 60
const LIMITE_DE_INTERESSES = 24
const LIMITE_DE_GRUPOS = 100

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor)

const ehTexto = (valor: unknown, maximo: number): valor is string =>
  typeof valor === "string" && valor.trim() !== "" && valor.length <= maximo

function listaDeTextos(valor: unknown, limite: number, tamanho: number): string[] | null {
  if (!Array.isArray(valor) || valor.length > limite) return null
  const itens: string[] = []
  for (const item of valor) {
    if (!ehTexto(item, tamanho)) return null
    itens.push(item.trim())
  }
  return itens
}

/**
 * Valida o corpo do `PUT /api/app/entry/progress`.
 *
 * Devolve o progresso **normalizado** (sÃ³ as chaves conhecidas, textos sem
 * espaÃ§o nas pontas), nÃ£o o corpo original: a rota grava o resultado, nunca o
 * que o cliente mandou.
 */
export function validarProgresso(entrada: unknown): Validacao {
  if (!ehObjeto(entrada)) return { ok: false, motivo: "corpo-invalido" }

  const versao = entrada["versao"]
  if (typeof versao !== "number" || !Number.isInteger(versao) || versao < 1 || versao > 1000) {
    return { ok: false, motivo: "versao-invalida" }
  }

  const etapa = entrada["etapa"]
  if (typeof etapa !== "string" || !(ETAPAS_DO_FLUXO as readonly string[]).includes(etapa)) {
    return { ok: false, motivo: "etapa-invalida" }
  }

  const bruto = entrada["estado"]
  if (bruto !== undefined && !ehObjeto(bruto)) return { ok: false, motivo: "estado-invalido" }
  const estadoBruto: Record<string, unknown> = bruto ?? {}

  for (const chave of Object.keys(estadoBruto)) {
    const minuscula = chave.toLowerCase()
    if (CAMPOS_PROIBIDOS.has(minuscula)) return { ok: false, motivo: "campo-proibido" }
    if (!CHAVES_DO_ESTADO.has(chave)) return { ok: false, motivo: "estado-invalido" }
  }

  const estado: {
    nome?: { nome: string; sobrenome: string }
    cidade?: string
    momento?: MomentoDoRascunho
    interesses?: string[]
    grupos?: string[]
    avisos?: "ativados" | "agora-nao"
    convite?: boolean
  } = {}

  if (estadoBruto["nome"] !== undefined) {
    const nome = estadoBruto["nome"]
    if (
      !ehObjeto(nome) ||
      !ehTexto(nome["nome"], LIMITE_DO_NOME) ||
      !ehTexto(nome["sobrenome"], LIMITE_DO_NOME)
    ) {
      return { ok: false, motivo: "estado-invalido" }
    }
    estado.nome = { nome: nome["nome"].trim(), sobrenome: nome["sobrenome"].trim() }
  }

  if (estadoBruto["cidade"] !== undefined) {
    if (!ehTexto(estadoBruto["cidade"], LIMITE_DA_CIDADE)) {
      return { ok: false, motivo: "estado-invalido" }
    }
    estado.cidade = estadoBruto["cidade"].trim()
  }

  if (estadoBruto["momento"] !== undefined) {
    if (typeof estadoBruto["momento"] !== "string" || !MOMENTOS.includes(estadoBruto["momento"])) {
      return { ok: false, motivo: "estado-invalido" }
    }
    estado.momento = estadoBruto["momento"] as MomentoDoRascunho
  }

  if (estadoBruto["interesses"] !== undefined) {
    const interesses = listaDeTextos(
      estadoBruto["interesses"],
      LIMITE_DE_INTERESSES,
      LIMITE_DO_TEXTO_CURTO,
    )
    if (interesses === null) return { ok: false, motivo: "estado-invalido" }
    estado.interesses = interesses
  }

  if (estadoBruto["grupos"] !== undefined) {
    const grupos = listaDeTextos(estadoBruto["grupos"], LIMITE_DE_GRUPOS, LIMITE_DO_TEXTO_CURTO)
    if (grupos === null) return { ok: false, motivo: "estado-invalido" }
    estado.grupos = grupos
  }

  if (estadoBruto["avisos"] !== undefined) {
    if (typeof estadoBruto["avisos"] !== "string" || !AVISOS.includes(estadoBruto["avisos"])) {
      return { ok: false, motivo: "estado-invalido" }
    }
    estado.avisos = estadoBruto["avisos"] as "ativados" | "agora-nao"
  }

  if (estadoBruto["convite"] !== undefined) {
    if (typeof estadoBruto["convite"] !== "boolean") return { ok: false, motivo: "estado-invalido" }
    estado.convite = estadoBruto["convite"]
  }

  const progresso: Progresso = {
    versao,
    etapa: etapa as EtapaDoFluxo,
    estado,
  }

  if (JSON.stringify(progresso).length > LIMITE_DO_ESTADO) {
    return { ok: false, motivo: "grande-demais" }
  }

  return { ok: true, progresso }
}
