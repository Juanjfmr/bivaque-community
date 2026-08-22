import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { checkSource } from "../../scripts/agents/task-contract.mjs"

// Trava a ESTRUTURA do harness — os papéis, as ferramentas que cada papel pode ter, as
// skills que os documentos prometem e a validade dos contratos. A sequência de execução
// (implementer -> reviewer -> runtime-verifier) não é travada aqui: ver
// docs/agents/AGENT_ARCHITECTURE.md §9.

const root = join(import.meta.dirname, "..", "..")
const agentsDir = join(root, ".claude", "agents")
const skillsDir = join(root, ".claude", "skills")

// Os sete papéis da arquitetura v1. Quem escreve e quem não escreve é parte do papel:
// verificador que edita vira executor e perde a função que justifica existir.
const AGENTS = {
  explorer: { model: "haiku", writes: false },
  implementer: { model: "sonnet", writes: true },
  reviewer: { model: "opus", writes: false },
  "runtime-verifier": { model: "sonnet", writes: false },
  "security-auditor": { model: "opus", writes: false },
  "visual-designer": { model: "opus", writes: true },
  "experiment-judge": { model: "opus", writes: false },
}

// Aposentados na Phase 0 (2026-08-22). Voltar com um deles é reabrir a divergência
// que a auditoria fechou — ver docs/agents/HARNESS-PHASE0-2026-08-22.md §2.
const RETIRED_AGENTS = ["code-reviewer", "explore-haiku", "test-runner", "test-writer"]

const SKILLS = [
  "adversarial-review",
  "execute-task",
  "experiment-protocol",
  "gate-before-done",
  "plan-execution",
  "runtime-proof",
  "visual-system-experiment",
]

const WRITE_TOOLS = ["Write", "Edit", "MultiEdit", "NotebookEdit"]

const readFrontmatter = (path) => {
  const source = readFileSync(path, "utf8")
  const matched = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)
  assert.notEqual(matched, null, `${path}: sem frontmatter`)
  const fields = {}
  let currentKey = null
  for (const line of matched[1].split(/\r?\n/)) {
    const keyed = /^([a-zA-Z_-]+):\s*(.*)$/.exec(line)
    if (keyed) {
      currentKey = keyed[1]
      fields[currentKey] = keyed[2].trim()
    } else if (currentKey) {
      fields[currentKey] = `${fields[currentKey]} ${line.trim()}`.trim()
    }
  }
  return fields
}

test("versions exactly the seven roles of the v1 agent architecture", () => {
  // Given the versioned agent definitions
  const files = readdirSync(agentsDir).filter((entry) => entry.endsWith(".md"))

  // When their names are compared with the architecture
  const names = files.map((file) => file.replace(/\.md$/, "")).sort()

  // Then the seven roles are present and the retired ones stay retired
  assert.deepEqual(names, Object.keys(AGENTS).sort())
  for (const retired of RETIRED_AGENTS) {
    assert.equal(existsSync(join(agentsDir, `${retired}.md`)), false, `${retired} foi aposentado`)
  }
})

test("declares complete frontmatter on every agent", () => {
  for (const name of Object.keys(AGENTS)) {
    // Given an agent definition
    const fields = readFrontmatter(join(agentsDir, `${name}.md`))

    // When its frontmatter is inspected
    // Then it identifies itself, says when to use it, and pins a model
    assert.equal(fields.name, name, `${name}: frontmatter name diverge do arquivo`)
    assert.ok(
      (fields.description ?? "").length > 40,
      `${name}: description curta demais para rotear`,
    )
    assert.ok((fields.tools ?? "").length > 0, `${name}: sem tools declaradas`)
    assert.equal(fields.model, AGENTS[name].model, `${name}: modelo diverge da arquitetura`)
  }
})

test("keeps read-only roles unable to write", () => {
  for (const [name, role] of Object.entries(AGENTS)) {
    if (role.writes) continue

    // Given a role whose value depends on not being the executor
    const { tools } = readFrontmatter(join(agentsDir, `${name}.md`))

    // When its tool list is classified
    const declared = tools.split(",").map((tool) => tool.trim())
    const writeTool = declared.find((tool) =>
      WRITE_TOOLS.some((write) => tool === write || tool.startsWith(`${write}(`)),
    )

    // Then no write tool is present
    assert.equal(writeTool, undefined, `${name} é somente-leitura e declarou \`${writeTool}\``)
  }
})

test("versions the skills the documents promise", () => {
  for (const skill of SKILLS) {
    // Given a skill the harness documents require
    const skillFile = join(skillsDir, skill, "SKILL.md")

    // When the repository is inspected
    assert.equal(existsSync(skillFile), true, `skill \`${skill}\` não está versionada no repo`)
    const fields = readFrontmatter(skillFile)

    // Then it carries the frontmatter that makes it routable
    assert.equal(fields.name, skill)
    assert.ok(
      (fields.description ?? "").length > 40,
      `${skill}: description curta demais para rotear`,
    )
  }
})

test("keeps hooks free of a developer machine path", () => {
  // Given every hook script
  const hooksDir = join(root, ".claude", "hooks")
  const hooks = readdirSync(hooksDir).filter((entry) => entry.endsWith(".sh"))

  // When each is scanned for an absolute path
  for (const hook of hooks) {
    const source = readFileSync(join(hooksDir, hook), "utf8")

    // Then none is bound to one machine's checkout
    assert.equal(
      /[A-Za-z]:[\\/]Users[\\/]/.test(source),
      false,
      `${hook}: caminho absoluto de máquina`,
    )
    assert.equal(
      /\/home\/[a-z]+\/bivaque/.test(source),
      false,
      `${hook}: caminho absoluto de máquina`,
    )
  }
})

test("holds every task contract to the validator", () => {
  // Given the contracts directory
  const tasksDir = join(root, "docs", "agents", "tasks")
  const contracts = readdirSync(tasksDir).filter((entry) => entry.endsWith(".task.yml"))

  // When each contract is validated
  assert.ok(contracts.includes("TEMPLATE.task.yml"), "o template do contrato precisa existir")
  for (const contract of contracts) {
    const result = checkSource(readFileSync(join(tasksDir, contract), "utf8"))

    // Then it passes — an invalid contract never reaches execution
    assert.equal(result.valid, true, `${contract}: ${result.errors.join(" | ")}`)
  }
})

test("keeps the repository rules pointing at the architecture", () => {
  // Given the two documents an agent reads first
  const agentsMd = readFileSync(join(root, "AGENTS.md"), "utf8")
  const claudeMd = readFileSync(join(root, "CLAUDE.md"), "utf8")

  // When they are scanned for the harness entry point
  // Then neither can drift away from it silently
  assert.match(agentsMd, /docs\/agents\/AGENT_ARCHITECTURE\.md/)
  assert.match(claudeMd, /docs\/agents\/AGENT_ARCHITECTURE\.md/)
})
