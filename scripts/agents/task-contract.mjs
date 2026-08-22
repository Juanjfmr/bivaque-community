#!/usr/bin/env node
// task-contract.mjs — o contrato de tarefa é a unidade de execução do harness.
//
// Um agente é intercambiável; o contrato não. Este módulo lê um contrato
// (`docs/agents/tasks/*.task.yml`) e responde uma pergunta determinística:
// "isto pode ser executado por um agente, ou falta contrato?".
//
//   node scripts/agents/task-contract.mjs                 # valida docs/agents/tasks/
//   node scripts/agents/task-contract.mjs <arquivo...>    # valida arquivos dados
//   node scripts/agents/task-contract.mjs --json          # saída estruturada
//
// Exit 0 = todo contrato válido. Exit 1 = pelo menos um inválido.
//
// O parser cobre de propósito um subconjunto restrito de YAML (mapa, lista,
// escalar folded `>`), para não trazer dependência nova e para que um contrato
// exótico falhe alto em vez de ser interpretado errado.

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

export const TASKS_DIR = join("docs", "agents", "tasks")

export const REQUIRED_FIELDS = [
  "task_id",
  "objective",
  "authority",
  "baseline",
  "allowed_paths",
  "forbidden",
  "acceptance",
  "proof",
  "risk",
  "risk_level",
  "reviewer_must_differ_from_executor",
  "closure",
]

export const RISK_LEVELS = ["R0", "R1", "R2", "R3"]

// Baseline UNKNOWN é recusado de propósito: medir antes de mexer é o que separa
// correção de reescrita especulativa.
export const BASELINE_STATES = ["FAIL-EVIDENCED", "PASS-EVIDENCED", "NOT-APPLICABLE"]

// Vocabulário de elevação automática. NÃO é duplicado aqui: é lido de
// docs/decisions/RISK_MATRIX.md, que é a fonte de verdade. Duplicar a lista em código
// criaria drift entre a régua e o validador — e faria o scanner de privacidade acusar
// termos proibidos em código de produto, com razão.
export const RISK_MATRIX_PATH = join(
  import.meta.dirname,
  "..",
  "..",
  "docs",
  "decisions",
  "RISK_MATRIX.md",
)

let cachedTerms = null

export function readElevationTerms(path = RISK_MATRIX_PATH) {
  if (cachedTerms) return cachedTerms
  const matrix = readFileSync(path, "utf8")
  const section = matrix.slice(matrix.indexOf("Automatic elevation terms"))
  const fenced = /```text\r?\n([\s\S]*?)```/.exec(section)
  if (!fenced) throw new Error(`RISK_MATRIX.md sem bloco de termos de elevação (${path})`)
  cachedTerms = fenced[1]
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0)
  return cachedTerms
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const matcherCache = new Map()

// Termo casa por PALAVRA, não por substring. Com `includes`, "rls" casava com "urls",
// "secret" com "secretaria" e "auth" com "author" — um contrato R1 falando em "URLs de
// compartilhamento" era recusado como R3.
//
// A flexão é por PALAVRA, não sufixo no fim do termo. Metade do vocabulário da
// RISK_MATRIX termina em -ão e pluraliza irregular (notificação → notificações), e
// termo composto flexiona a cabeça, não a cauda (recuperação de conta →
// recuperações de conta). Sem isso, "refazer as notificações" ficava R0 enquanto
// "refazer a notificação" subia para R2 — e o plural é como se escreve objetivo.
function inflectWord(word) {
  if (word.endsWith("ão")) return `${escapeRegExp(word.slice(0, -2))}(?:ão|ões)`
  return `${escapeRegExp(word)}(?:e?s)?`
}

function termMatcher(term) {
  const cached = matcherCache.get(term)
  if (cached) return cached
  const pattern = term.split(/\s+/).map(inflectWord).join(String.raw`\s+`)
  const matcher = new RegExp(String.raw`\b${pattern}\b`, "i")
  matcherCache.set(term, matcher)
  return matcher
}

export const matchesTerm = (haystack, term) => termMatcher(term).test(haystack)

// Termos que sobem direto para R3 — trust boundary, dado pessoal, destrutivo.
// `private` sem ponto: a forma que o AGENTS.md usa é "schema `private`", e exigir
// o ponto literal deixava passar como R0 exatamente o caso que precisa de R3.
export const R3_TERMS = [
  "rls",
  "policy",
  "policies",
  "supabase/migrations",
  "cpf",
  "secret",
  "private",
]

// "Existence is not evidence." Pelo menos uma prova precisa ser executável.
export const RUNTIME_PROOF_PATTERN =
  /\b(gate|test|tests|testes|vitest|pgtap|test:db|test:e2e|test:scope|playwright|e2e|psql|browser|navegador|captura|screenshot|curl)\b/i

export const DEFAULT_RETRY_BUDGET = 3

// Esgotar o orçamento de tentativas nunca produz PASS. Produz uma parada legível.
export const BUDGET_OUTCOMES = ["FAIL", "BLOCKED", "HUMAN_DECISION"]

const KEY_PATTERN = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/

function parseScalar(raw) {
  const text = raw.trim()
  if (text === "") return ""
  if (text === "true") return true
  if (text === "false") return false
  if (/^-?\d+$/.test(text)) return Number(text)
  const quoted = /^"(.*)"$/.exec(text) ?? /^'(.*)'$/.exec(text)
  return quoted ? quoted[1] : text
}

function readLines(source) {
  const lines = []
  const rawLines = String(source).split(/\r?\n/)
  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index]
    // Comentário só é removido em linha sem aspas: um `#` dentro de string é conteúdo.
    const stripped = raw.includes('"') || raw.includes("'") ? raw : raw.replace(/(^|\s)#.*$/, "$1")
    if (stripped.trim() === "") continue
    lines.push({
      indent: stripped.length - stripped.trimStart().length,
      text: stripped.trimEnd().trimStart(),
      number: index + 1,
    })
  }
  return lines
}

function parseBlockScalar(lines, cursor, indent, folded) {
  const collected = []
  let index = cursor
  while (index < lines.length && lines[index].indent > indent) {
    collected.push(lines[index].text)
    index += 1
  }
  return [collected.join(folded ? " " : "\n"), index]
}

function parseNode(lines, cursor, indent) {
  if (cursor >= lines.length) return [null, cursor]

  if (lines[cursor].text.startsWith("- ") || lines[cursor].text === "-") {
    const items = []
    let index = cursor
    while (index < lines.length && lines[index].indent === indent) {
      const { text } = lines[index]
      if (!text.startsWith("- ") && text !== "-") break
      items.push(parseScalar(text.slice(1)))
      index += 1
    }
    return [items, index]
  }

  const map = {}
  let index = cursor
  while (index < lines.length && lines[index].indent === indent) {
    const line = lines[index]
    const matched = KEY_PATTERN.exec(line.text)
    if (!matched) {
      throw new Error(`linha ${line.number}: esperava \`chave: valor\`, li \`${line.text}\``)
    }
    const [, key, rest] = matched
    index += 1

    if (rest === ">" || rest === "|") {
      const [value, next] = parseBlockScalar(lines, index, line.indent, rest === ">")
      map[key] = value
      index = next
      continue
    }

    if (rest === "") {
      if (index < lines.length && lines[index].indent > line.indent) {
        const [value, next] = parseNode(lines, index, lines[index].indent)
        map[key] = value
        index = next
      } else {
        map[key] = ""
      }
      continue
    }

    map[key] = parseScalar(rest)
  }
  return [map, index]
}

export function parseContract(source) {
  const lines = readLines(source)
  if (lines.length === 0) return {}
  const [value] = parseNode(lines, 0, lines[0].indent)
  return value ?? {}
}

const isNonEmptyList = (value) => Array.isArray(value) && value.length > 0
const asText = (value) =>
  Array.isArray(value)
    ? value.join(" ")
    : typeof value === "object" && value
      ? Object.values(value).join(" ")
      : String(value ?? "")

// Nível de risco exigido pelo conteúdo do contrato, independente do que ele declara.
export function requiredRiskLevel(contract) {
  // Só o que a tarefa TOCA eleva o risco. `forbidden` é cerca, não superfície:
  // proibir mexer em migration não pode transformar a tarefa em R3.
  const haystack = [
    contract.objective,
    asText(contract.allowed_paths),
    asText(contract.acceptance),
    contract.risk,
  ]
    .map((part) => String(part ?? "").toLowerCase())
    .join(" ")

  if (R3_TERMS.some((term) => matchesTerm(haystack, term))) return "R3"
  if (readElevationTerms().some((term) => matchesTerm(haystack, term))) return "R2"
  return "R0"
}

export function validateContract(contract) {
  const errors = []
  const push = (message) => errors.push(message)

  for (const field of REQUIRED_FIELDS) {
    if (contract[field] === undefined || contract[field] === "")
      push(`campo obrigatório ausente: \`${field}\``)
  }

  if (contract.task_id && !/^[A-Z][A-Z0-9]*-\d{3}$/.test(String(contract.task_id))) {
    push(`\`task_id\` deve ser <PREFIXO>-<NNN> (ex.: DS-021), li \`${contract.task_id}\``)
  }

  if (contract.objective !== undefined && String(contract.objective).trim().length < 12) {
    push("`objective` precisa dizer o que muda no produto, não um rótulo")
  }

  for (const field of ["authority", "allowed_paths", "forbidden", "acceptance", "proof"]) {
    if (contract[field] !== undefined && !isNonEmptyList(contract[field])) {
      push(`\`${field}\` precisa ser uma lista não vazia`)
    }
  }

  const baselineStatus =
    contract.baseline && typeof contract.baseline === "object"
      ? contract.baseline.status
      : contract.baseline
  if (contract.baseline !== undefined && !BASELINE_STATES.includes(String(baselineStatus))) {
    push(
      `\`baseline.status\` deve ser um de ${BASELINE_STATES.join(", ")} — meça antes de executar`,
    )
  }

  if (isNonEmptyList(contract.allowed_paths)) {
    const unbounded = contract.allowed_paths.find((path) =>
      ["**", ".", "./", "*"].includes(String(path).trim()),
    )
    if (unbounded)
      push(`\`allowed_paths\` sem fronteira (\`${unbounded}\`) — blast radius não declarado`)
  }

  if (
    isNonEmptyList(contract.proof) &&
    !contract.proof.some((entry) => RUNTIME_PROOF_PATTERN.test(String(entry)))
  ) {
    push("`proof` não tem prova executável — existir no código não é evidência de comportamento")
  }

  const declared = String(contract.risk_level ?? "").toUpperCase()
  if (contract.risk_level !== undefined && !RISK_LEVELS.includes(declared)) {
    push(`\`risk_level\` deve ser um de ${RISK_LEVELS.join(", ")}, li \`${contract.risk_level}\``)
  }

  const required = requiredRiskLevel(contract)
  if (
    RISK_LEVELS.includes(declared) &&
    RISK_LEVELS.indexOf(declared) < RISK_LEVELS.indexOf(required)
  ) {
    push(
      `elevação automática: o conteúdo do contrato é ${required}, declarado ${declared} (ver RISK_MATRIX.md)`,
    )
  }

  // O nível efetivo é o MAIOR entre declarado e exigido: declarar baixo não
  // rebaixa a tarefa, só adiciona um erro de declaração.
  const effective = RISK_LEVELS.includes(declared)
    ? RISK_LEVELS[Math.max(RISK_LEVELS.indexOf(declared), RISK_LEVELS.indexOf(required))]
    : required
  if (effective === "R3" && !contract.adr) {
    push(
      "R3 exige `adr:` apontando para um ADR aprovado em docs/decisions/ — decisão R3 não é do agente",
    )
  }
  if (contract.adr && !String(contract.adr).includes("docs/decisions/")) {
    push("`adr` deve apontar para um arquivo em docs/decisions/")
  }

  if (contract.reviewer_must_differ_from_executor !== undefined) {
    const independent = contract.reviewer_must_differ_from_executor === true
    if (!independent && effective !== "R0") {
      push(`revisor independente é obrigatório em ${effective} — só R0 pode dispensar`)
    }
  }

  const closure = contract.closure && typeof contract.closure === "object" ? contract.closure : {}
  if (
    contract.closure !== undefined &&
    closure.requires_runtime_evidence !== true &&
    effective !== "R0"
  ) {
    push(
      "`closure.requires_runtime_evidence` deve ser true — fechar sem evidência de runtime é o que já mentiu no mapa antigo",
    )
  }

  // Contrato sem `retry_budget` não é contrato sem teto: cai no padrão, e o teto
  // efetivo sai no resultado para que quem executa leia um número, não uma promessa.
  const effectiveRetryBudget =
    contract.retry_budget === undefined ? DEFAULT_RETRY_BUDGET : contract.retry_budget
  const budgetInRange =
    Number.isInteger(effectiveRetryBudget) && effectiveRetryBudget >= 1 && effectiveRetryBudget <= 5
  if (!budgetInRange) {
    push(
      "`retry_budget` deve ser inteiro entre 1 e 5 — sem teto, o agente queima horas num item só",
    )
  }

  // Um contrato pode ser válido e, ainda assim, não poder fechar agora: `blocked_by`
  // registra isso onde quem executa lê. A alternativa — encolher `proof` até caber no
  // que fica verde — é ajustar a régua ao resultado, que é o que este harness combate.
  const blocked = contract.blocked_by !== undefined && String(contract.blocked_by).trim() !== ""
  if (contract.blocked_by !== undefined && !blocked) {
    push("`blocked_by` precisa dizer o que bloqueia a prova, ou ser removido")
  }

  if (contract.on_budget_exhausted !== undefined) {
    const outcome = String(contract.on_budget_exhausted).toUpperCase()
    if (!BUDGET_OUTCOMES.includes(outcome)) {
      push(
        `\`on_budget_exhausted\` deve ser um de ${BUDGET_OUTCOMES.join(", ")} — esgotar tentativa nunca vira PASS`,
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    effectiveRiskLevel: effective,
    effectiveRetryBudget,
    blocked,
  }
}

export function checkSource(source) {
  try {
    const contract = parseContract(source)
    return { ...validateContract(contract), contract }
  } catch (error) {
    return { valid: false, errors: [error.message], effectiveRiskLevel: null, contract: null }
  }
}

function collectFiles(args) {
  if (args.length > 0) return args
  try {
    if (!statSync(TASKS_DIR).isDirectory()) return []
  } catch {
    return []
  }
  return readdirSync(TASKS_DIR)
    .filter((entry) => entry.endsWith(".task.yml"))
    .sort()
    .map((entry) => join(TASKS_DIR, entry))
}

function main() {
  const args = process.argv.slice(2)
  const asJson = args.includes("--json")
  const files = collectFiles(args.filter((arg) => !arg.startsWith("--")))

  const reports = files.map((file) => {
    const result = checkSource(readFileSync(file, "utf8"))
    return {
      file,
      valid: result.valid,
      errors: result.errors,
      riskLevel: result.effectiveRiskLevel,
      retryBudget: result.effectiveRetryBudget,
      blocked: result.blocked,
    }
  })

  const failed = reports.filter((report) => !report.valid)

  if (asJson) {
    console.log(JSON.stringify({ green: failed.length === 0, reports }, null, 2))
  } else if (reports.length === 0) {
    console.log(`Nenhum contrato em ${TASKS_DIR}/ — nada a validar.`)
  } else {
    for (const report of reports) {
      const flags = report.blocked ? ", BLOQUEADO" : ""
      const summary = report.valid
        ? ` (${report.riskLevel}, retry ${report.retryBudget}${flags})`
        : ""
      console.log(`${report.valid ? "  ok " : "FAIL "} ${report.file}${summary}`)
      for (const error of report.errors) console.log(`       · ${error}`)
    }
    console.log(
      failed.length === 0
        ? `\n${reports.length} contrato(s) válido(s).`
        : `\n${failed.length} contrato(s) inválido(s) — contrato incompleto não vai para execução.`,
    )
  }

  process.exit(failed.length > 0 ? 1 : 0)
}

if (process.argv[1]?.endsWith("task-contract.mjs")) main()
