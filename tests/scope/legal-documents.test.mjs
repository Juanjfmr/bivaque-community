import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// Guarda de escopo dos documentos que o membro aceita.
//
// Três coisas podiam desalinhar em silêncio, e uma delas já tinha desalinhado:
//
// 1. `CONSENT_VERSION` em packages/domain não tinha nenhum vínculo mecânico com
//    o documento cujo aceite ele registra. Publicar texto novo sem virar o
//    inteiro grava aceite apontando para a versão errada — e o registro do
//    aceite é justamente a prova de que a pessoa concordou com AQUELE texto.
// 2. O estado de revisão morava dentro do corpo aceito (achado da auditoria
//    onboarding-aaa-v1-2026-08-22, card BLOCK-LEGAL-ENTRY). Agora mora no front
//    matter, e um documento `draft` tem que apontar para um card de bloqueio que
//    esteja realmente aberto no board — senão o rascunho vira permanente sem
//    ninguém ver.
// 3. Um documento `published` não pode carregar `<<DEFINIR>>`. Esse é o mesmo
//    marcador que tests/scope/support-channel.test.mjs usa, e aqui ele guarda o
//    que só o dono decide: controlador, encarregado, canal e foro.

const root = join(import.meta.dirname, "..", "..")
const legalDir = join(root, "docs", "legal")
const boardPath = join(root, "tools", "backend-kanban", "public", "board.json")
const consentPath = join(root, "packages", "domain", "src", "consent.ts")

const PLACEHOLDER = "<<DEFINIR>>"
const VALID_STATUS = new Set(["draft", "published"])

// Documentos cuja versão é gravada na linha de aceite, e a constante que a grava.
const VERSION_BINDING = {
  "PRIVACIDADE.md": "CONSENT_VERSION",
  "CODIGO_DE_CONDUTA.md": "CODE_OF_CONDUCT_VERSION",
}

const docs = readdirSync(legalDir)
  .filter((name) => name.endsWith(".md"))
  .sort()

// Parser deliberadamente mínimo: chaves de primeiro nível do bloco YAML do topo.
// Não vale a pena uma dependência de YAML para ler cinco campos escalares.
function frontMatter(markdown) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(markdown)
  if (!match) return null
  const fields = {}
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([a-z_]+):[ \t]*(.*)$/.exec(line)
    if (field) fields[field[1]] = field[2].trim()
  }
  return fields
}

const board = JSON.parse(readFileSync(boardPath, "utf8"))
const cardsById = new Map(board.cards.map((card) => [card.id, card]))

const domainVersions = (() => {
  const source = readFileSync(consentPath, "utf8")
  const found = {}
  for (const match of source.matchAll(/export const ([A-Z_]+) = (\d+)/g)) {
    found[match[1]] = Number(match[2])
  }
  return found
})()

test("o diretório docs/legal traz os três documentos do acordo", () => {
  assert.deepEqual(docs, ["CODIGO_DE_CONDUTA.md", "PRIVACIDADE.md", "TERMOS_E_CONDICOES.md"])
})

test("todo documento legal declara front matter completo", () => {
  const problems = []
  for (const name of docs) {
    const fields = frontMatter(readFileSync(join(legalDir, name), "utf8"))
    if (!fields) {
      problems.push(`${name}: sem front matter`)
      continue
    }
    for (const key of ["id", "version", "status", "updated_at"]) {
      if (!fields[key]) problems.push(`${name}: falta '${key}'`)
    }
    if (fields.status && !VALID_STATUS.has(fields.status)) {
      problems.push(`${name}: status '${fields.status}' inválido (draft|published)`)
    }
    if (fields.version && !/^\d+$/.test(fields.version)) {
      problems.push(`${name}: version '${fields.version}' não é inteiro`)
    }
  }
  assert.deepEqual(problems, [], problems.join("; "))
})

test("a versão do documento casa com a constante que grava o aceite", () => {
  const problems = []
  for (const [name, constant] of Object.entries(VERSION_BINDING)) {
    const fields = frontMatter(readFileSync(join(legalDir, name), "utf8"))
    const declared = Number(fields?.version)
    const deployed = domainVersions[constant]
    assert.equal(
      typeof deployed,
      "number",
      `${constant} não foi encontrada em packages/domain/src/consent.ts`,
    )
    if (declared !== deployed) {
      problems.push(
        `${name} declara version ${declared} mas ${constant} vale ${deployed}. ` +
          "Texto novo exige virar os dois juntos: a linha de aceite aponta para a versão " +
          "do texto que foi mostrado.",
      )
    }
  }
  assert.deepEqual(problems, [], problems.join(" "))
})

test("documento em rascunho aponta para um card de bloqueio aberto", () => {
  const problems = []
  for (const name of docs) {
    const fields = frontMatter(readFileSync(join(legalDir, name), "utf8"))
    if (fields?.status !== "draft") continue

    const blocker = fields.review_blocker
    if (!blocker) {
      problems.push(`${name}: status draft sem 'review_blocker'`)
      continue
    }
    const card = cardsById.get(blocker)
    if (!card) {
      problems.push(`${name}: review_blocker '${blocker}' não existe no board`)
      continue
    }
    if (card.status === "done") {
      problems.push(
        `${name}: review_blocker '${blocker}' está 'done' mas o documento segue draft. ` +
          "Ou o texto foi aprovado (status: published) ou o card foi fechado cedo demais.",
      )
    }
  }
  assert.deepEqual(problems, [], problems.join(" "))
})

test("documento publicado não carrega decisão pendente do dono", () => {
  const problems = []
  for (const name of docs) {
    const markdown = readFileSync(join(legalDir, name), "utf8")
    const fields = frontMatter(markdown)
    if (fields?.status !== "published") continue

    if (markdown.includes(PLACEHOLDER)) {
      problems.push(
        `${name}: publicado com ${PLACEHOLDER}. Controlador, encarregado, canal e foro ` +
          "precisam estar preenchidos antes de o texto virar acordo vigente.",
      )
    }
    if (fields.pending !== undefined && fields.pending !== "") {
      problems.push(`${name}: publicado com 'pending' ainda preenchido`)
    }
  }
  assert.deepEqual(problems, [], problems.join(" "))
})
