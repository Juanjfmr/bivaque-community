import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const read = (...parts) => readFileSync(join(root, ...parts), "utf8")

test("the canonical design system covers the complete product-design contract", () => {
  const source = read("docs", "agents", "DESIGN_SYSTEM.md")
  const requiredSections = [
    "## 1. Autoridade e uso",
    "## 2. Caráter de marca",
    "## 3. Princípios de experiência",
    "## 4. Foundations",
    "## 5. Arquitetura de tokens",
    "## 6. Componentes",
    "## 7. Padrões de produto",
    "## 8. Layout responsivo",
    "## 9. Acessibilidade",
    "## 10. Conteúdo, imagens e ícones",
    "## 11. Qualidade e governança",
    "## 12. Adoção e decisões abertas",
  ]

  for (const section of requiredSections) {
    assert.ok(source.includes(section), `missing canonical section: ${section}`)
  }
  assert.match(source, /primitive\s+→\s+semantic\s+→\s+component/)
})

test("documented token paths resolve in the canonical token source", () => {
  const source = read("docs", "agents", "DESIGN_SYSTEM.md")
  const tokens = JSON.parse(read("packages", "tokens", "src", "tokens.json"))
  const inventory = source.match(/#### Nomes[\s\S]*?(?=\n### )/)?.[0] ?? ""
  const paths = [...inventory.matchAll(/`(primitive|semantic|component)\.([a-z0-9-]+)`/g)].map(
    ([, layer, name]) => [layer, name],
  )
  assert.ok(paths.length >= 20, "the document must carry a real token inventory")

  const missing = paths
    .filter(([layer, name]) => !Object.hasOwn(tokens[layer], name))
    .map(([layer, name]) => `${layer}.${name}`)
  assert.deepEqual(missing, [])

  assert.equal(Object.hasOwn(tokens, "documentation"), false)
  const documentedTokenNames = [
    ...source.matchAll(/`(primitive|semantic|component)\.([a-z0-9-]+)`/g),
  ]
  const unresolved = documentedTokenNames
    .filter(([, layer, name]) => !Object.hasOwn(tokens[layer], name))
    .map(([, layer, name]) => `${layer}.${name}`)
  assert.deepEqual(unresolved, [])

  const legacyNames = [
    "color.action.primary",
    "surface.sunken",
    "text.secondary",
    "button.primary.background",
    "field.invalid.border",
  ]
  assert.deepEqual(
    legacyNames.filter((name) => source.includes(`\`${name}\``)),
    [],
    "token names in the canonical document must use the source namespace",
  )
})

test("legacy design documents redirect to the one canonical system", () => {
  for (const file of ["DESIGN_SPEC.md", "VISUAL_GUIDE.md"]) {
    const source = read("docs", "agents", file)
    assert.match(source, /redirecionamento de compatibilidade/)
    assert.match(source, /DESIGN_SYSTEM\.md/)
    assert.match(source, /não é uma segunda autoridade|Não adicione regras aqui/)
  }
})

test("the design-system decision records independent review as a closing condition", () => {
  const adr = read("docs", "decisions", "ADR-20260901-design-system.md")
  assert.match(adr, /risk: R2/)
  assert.match(adr, /três críticas independentes/i)
  assert.match(adr, /Alternatives considered/)
  assert.match(adr, /Success metric/)
  assert.match(adr, /Reopen condition/)
})

test("the web token stylesheet is generated from the canonical token source", () => {
  const result = spawnSync(process.execPath, ["scripts/tokens/generate.mjs", "--check"], {
    cwd: root,
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
})

test("the browser theme color is derived from the token adapter", () => {
  const page = read("apps", "web", "app", "page.tsx")
  assert.match(page, /themeColor:\s*brandTokens\.color\.accent/)
  assert.doesNotMatch(page, /2f7654/i)
})

test("reporting never exposes database errors and keeps a usable disclosure control", () => {
  const reportButton = read("apps", "web", "app", "components", "bivaque", "report-button.tsx")
  const chatThread = read("apps", "web", "app", "components", "bivaque", "chat-thread.tsx")

  assert.doesNotMatch(reportButton, /setError\(insertError\.message\)/)
  assert.doesNotMatch(chatThread, /setReportError\(error\.message\)/)
  assert.match(chatThread, /min-h-11 min-w-11/)
  assert.match(chatThread, /htmlFor=\{`report-reason-\$\{msg\.id\}`\}/)
  assert.match(chatThread, /Não inclua CPF, telefone ou endereço/)
  assert.match(chatThread, /aria-controls=\{`message-report-\$\{msg\.id\}`\}/)
  assert.match(chatThread, /aria-errormessage=/)
  assert.match(chatThread, /autoFocus/)
  assert.match(reportButton, /htmlFor="report-reason"/)
  assert.match(reportButton, /aria-errormessage=/)
})
