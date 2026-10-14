import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"
import { parse } from "acorn"

// This is a static inventory, not an action/runtime verifier. Never execute app code here.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const sourceRoot = path.join(root, "prototypes/bivaque-html/src")
const options = new Map()
for (let i = 2; i < process.argv.length; i += 2) options.set(process.argv[i], process.argv[i + 1])
const output = path.resolve(
  root,
  options.get("--output") || ".visual/bivaque-html-round01/inventory-before.json",
)
const evidenceRoot = path.resolve(root, ".visual/bivaque-html-round01")
if (
  path.dirname(output) !== evidenceRoot ||
  !path.basename(output).startsWith("inventory") ||
  !output.endsWith(".json")
) {
  throw new Error("Output must be an inventory* file inside .visual/bivaque-html-round01")
}
const hash = (text) => createHash("sha256").update(text).digest("hex")
const manifest = JSON.parse(await fs.readFile(path.join(sourceRoot, "manifest.json"), "utf8"))
let assembled = await fs.readFile(path.join(sourceRoot, manifest.template), "utf8")
const sources = []
let app = ""
for (const [index, slot] of manifest.slots.entries()) {
  let content = ""
  for (const file of slot.files) {
    const text = await fs.readFile(path.join(sourceRoot, file), "utf8")
    if (index === 3)
      sources.push({ file: `prototypes/bivaque-html/src/${file}`, start: app.length, text })
    if (index === 3) app += text
    content += text
  }
  assembled = assembled.replace(slot.token, () => content)
}
const candidateHash = hash(assembled)
const tree = parse(app, { ecmaVersion: "latest", locations: true, sourceType: "script" })
const parents = new WeakMap()
const nodes = []
const functionTypes = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
])
function walk(node, parent = null) {
  if (!node || typeof node.type !== "string") return
  parents.set(node, parent)
  nodes.push(node)
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) for (const child of value) walk(child, node)
    else if (value && typeof value.type === "string") walk(value, node)
  }
}
walk(tree)
function scope(node) {
  for (let current = parents.get(node); current; current = parents.get(current)) {
    if (functionTypes.has(current.type)) return current
  }
  return tree
}
function owner(node) {
  for (let current = node; current; current = parents.get(current)) {
    if (functionTypes.has(current.type) && current.id?.name) return current.id.name
  }
  return "bootstrap"
}
function location(node) {
  const source = [...sources].reverse().find((item) => item.start <= node.start)
  const prefix = source.text.slice(0, node.start - source.start)
  return { file: source.file, line: prefix.split("\n").length, function: owner(node) }
}
const bindings = new WeakMap()
for (const node of nodes) {
  if (node.type !== "VariableDeclarator" || node.id.type !== "Identifier") continue
  const key = scope(node)
  if (!bindings.has(key)) bindings.set(key, new Map())
  bindings.get(key).set(node.id.name, node.init)
}
const unknown = (node) => `__DYNAMIC_${node?.start ?? "UNKNOWN"}__`
const uniq = (items) => [...new Map(items.map((item) => [JSON.stringify(item), item])).values()]
const cap = (items) => uniq(items).slice(0, 256)
function callbackBinding(name, current, depth) {
  const parameter = current.params?.[0]
  if (parameter?.type !== "ArrayPattern") return null
  const index = parameter.elements.findIndex((element) => element?.name === name)
  const call = parents.get(current)
  if (index < 0 || call?.type !== "CallExpression" || call.callee.type !== "MemberExpression")
    return null
  return cap(
    values(call.callee.object, depth + 1).flatMap((rows) =>
      Array.isArray(rows)
        ? rows.map((row) => (Array.isArray(row) ? row[index] : unknown(current)))
        : [],
    ),
  )
}
function values(node, depth = 0, seen = new Set()) {
  if (!node || depth > 18 || seen.has(node)) return [unknown(node)]
  const next = new Set(seen).add(node)
  const evaluate = (child) => values(child, depth + 1, next)
  if (node.type === "Literal") return [node.value]
  if (node.type === "Identifier") {
    for (let current = scope(node); current; current = scope(current)) {
      const initial = bindings.get(current)?.get(node.name)
      if (initial) return values(initial, depth + 1, next)
      const callback = callbackBinding(node.name, current, depth)
      if (callback?.length) return callback
      if (current === tree) break
    }
    return [unknown(node)]
  }
  if (node.type === "ConditionalExpression" || node.type === "LogicalExpression") {
    return cap(
      evaluate(node.consequent || node.left).concat(evaluate(node.alternate || node.right)),
    )
  }
  if (node.type === "ArrayExpression") {
    let rows = [[]]
    for (const element of node.elements) {
      const variants =
        element?.type === "SpreadElement" ? evaluate(element.argument) : evaluate(element)
      rows = cap(
        rows.flatMap((row) =>
          variants.map((value) =>
            row.concat(element?.type === "SpreadElement" && Array.isArray(value) ? value : [value]),
          ),
        ),
      )
    }
    return rows
  }
  if (node.type === "ObjectExpression") {
    const object = {}
    for (const property of node.properties) {
      if (property.type !== "Property") continue
      const key = property.key.name ?? property.key.value
      object[key] = evaluate(property.value)[0]
    }
    return [object]
  }
  if (node.type === "MemberExpression") {
    const keys = node.computed ? evaluate(node.property) : [node.property.name]
    const result = evaluate(node.object).flatMap((object) => keys.map((key) => object?.[key]))
    return result.some((item) => item !== undefined)
      ? cap(result.filter((item) => item !== undefined))
      : [unknown(node)]
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    return cap(
      evaluate(node.left).flatMap((left) =>
        evaluate(node.right).map((right) => String(left) + right),
      ),
    )
  }
  if (node.type === "TemplateLiteral") {
    let strings = [node.quasis[0].value.cooked || ""]
    for (let index = 0; index < node.expressions.length; index++) {
      strings = cap(
        strings.flatMap((text) =>
          evaluate(node.expressions[index]).map(
            (value) =>
              text +
              (typeof value === "string" || typeof value === "number"
                ? value
                : unknown(node.expressions[index])) +
              node.quasis[index + 1].value.cooked,
          ),
        ),
      )
    }
    return strings
  }
  if (node.type === "CallExpression") {
    if (node.callee.name === "esc" || node.callee.name === "String")
      return evaluate(node.arguments[0])
    if (node.callee.type === "MemberExpression" && node.callee.object.name === "Object") {
      const objects = evaluate(node.arguments[0]).filter(
        (object) => object && typeof object === "object",
      )
      if (node.callee.property.name === "entries")
        return objects.map((object) => Object.entries(object))
      if (node.callee.property.name === "keys") return objects.map((object) => Object.keys(object))
    }
  }
  return [unknown(node)]
}
const emitters = []
const handlers = []
const templates = []
const modalCalls = []
const routeCalls = []
const eventBindings = []
const routes = []
const helperIndexes = new Map([
  ["btn", 1],
  ["iconBtn", 1],
  ["profileRow", 3],
  ["sectionTitle", 2],
  ["empty", 3],
  ["filterChips", 2],
])
function emit(node, kind, variants, details = {}) {
  for (const action of cap(variants)) {
    if (typeof action !== "string" || !action) continue
    emitters.push({ action, kind, ...location(node), ...details })
  }
}
const domainHandlers = new Set(["perform", "groupAction", "messagingAction", "profileGlobalAction"])
for (const node of nodes) {
  if (
    node.type === "TemplateLiteral" &&
    node.quasis.some((part) => part.value.cooked?.includes("data-action"))
  ) {
    for (const html of values(node))
      templates.push({ html: String(html), ...location(node), astOffset: node.start })
  }
  if (
    node.type === "Literal" &&
    typeof node.value === "string" &&
    node.value.includes("data-action")
  ) {
    if (node.value.includes("<"))
      templates.push({ html: node.value, ...location(node), astOffset: node.start })
    else if (node.value.trim().startsWith("data-action="))
      templates.push({
        html: `<inventory ${node.value}></inventory>`,
        ...location(node),
        astOffset: node.start,
      })
  }
  if (
    node.type === "SwitchCase" &&
    parents.get(node)?.discriminant?.name === "action" &&
    domainHandlers.has(owner(node))
  ) {
    if (node.test?.type === "Literal")
      handlers.push({ action: node.test.value, kind: "switch-case", ...location(node) })
  }
  if (
    node.type === "BinaryExpression" &&
    ["===", "=="].includes(node.operator) &&
    domainHandlers.has(owner(node))
  ) {
    const literal =
      node.left.name === "action" ? node.right : node.right.name === "action" ? node.left : null
    if (literal?.type === "Literal" && typeof literal.value === "string")
      handlers.push({ action: literal.value, kind: "action-comparison", ...location(node) })
  }
  if (
    node.type === "AssignmentExpression" &&
    node.left?.type === "MemberExpression" &&
    node.left.property.name === "action" &&
    node.left.object?.property?.name === "dataset"
  ) {
    emit(node, "dataset-assignment", values(node.right))
  }
  if (node.type !== "CallExpression") continue
  const name = node.callee.name
  if (helperIndexes.has(name) && node.arguments[helperIndexes.get(name)]) {
    emit(node, `helper:${name}`, values(node.arguments[helperIndexes.get(name)]), {
      expression: app
        .slice(
          node.arguments[helperIndexes.get(name)].start,
          node.arguments[helperIndexes.get(name)].end,
        )
        .slice(0, 160),
    })
  }
  if (
    node.callee.type === "MemberExpression" &&
    node.callee.property.name === "setAttribute" &&
    node.arguments[0]?.value === "data-action"
  )
    emit(node, "setAttribute", values(node.arguments[1]))
  if (["perform", "messagingAction", "groupAction"].includes(name))
    emit(node, `programmatic:${name}`, values(node.arguments[0]))
  if (["openCreate", "makeSwipe"].includes(name) && node.arguments[1]) {
    for (const rows of values(node.arguments[1])) {
      if (Array.isArray(rows))
        for (const row of rows)
          if (Array.isArray(row))
            emit(node, `array:${name}`, [row[2]], {
              label: typeof row[1] === "string" ? row[1] : null,
            })
    }
    // Also inspect tuple returns inside spreads/.map; do not lose menu actions
    // just because the enclosing runtime collection cannot be statically expanded.
    const argument = node.arguments[1]
    for (const row of nodes.filter(
      (child) =>
        child.type === "ArrayExpression" &&
        child.start >= argument.start &&
        child.end <= argument.end &&
        child.elements.length >= 3,
    )) {
      emit(row, `array-tuple:${name}`, values(row.elements[2]))
    }
  }
  if (name === "showDialog")
    modalCalls.push({
      titles: values(node.arguments[0]),
      kind: node.arguments[3] ? values(node.arguments[3]) : ["generic"],
      ...location(node),
    })
  if (name === "navigate")
    routeCalls.push({ targets: values(node.arguments[0]), ...location(node) })
  if (node.callee.type === "MemberExpression" && node.callee.property.name === "addEventListener") {
    eventBindings.push({
      events: values(node.arguments[0]),
      target: app.slice(node.callee.object.start, node.callee.object.end).slice(0, 160),
      ...location(node),
    })
  }
  if (
    node.callee.type === "MemberExpression" &&
    node.callee.property.name === "includes" &&
    node.arguments[0]?.name === "action" &&
    domainHandlers.has(owner(node))
  ) {
    for (const list of values(node.callee.object))
      if (Array.isArray(list))
        for (const action of list) {
          if (typeof action === "string" && !action.includes("__DYNAMIC"))
            handlers.push({ action, kind: "dispatch-guard-membership", ...location(node) })
        }
  }
}
for (const node of nodes) {
  if (node.type !== "ObjectExpression" || owner(node) !== "render") continue
  for (const property of node.properties) {
    if (property.value?.type === "Identifier" && property.value.name.startsWith("render")) {
      const renderer = nodes.find(
        (item) => item.type === "FunctionDeclaration" && item.id.name === property.value.name,
      )
      const requiresId = renderer
        ? nodes.some(
            (item) =>
              item.start >= renderer.start &&
              item.end <= renderer.end &&
              item.type === "MemberExpression" &&
              item.object.name === "route" &&
              item.property.name === "id",
          )
        : null
      routes.push({
        name: property.key.name || property.key.value,
        renderer: property.value.name,
        type: requiresId ? "detail-with-id" : "list-or-root",
        ...location(property),
      })
    }
  }
}
// Browser DOM is used only as an HTML parser for inert template contents, not runtime evidence.
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
})
let domRows
let shellRows
try {
  const page = await browser.newPage()
  domRows = await page.evaluate(
    (chunks) =>
      chunks.map((chunk) => {
        const element = document.createElement("template")
        // A computed tag in btn() is unresolved until called. Use a valid inert tag
        // for parsing its attributes; preserve its action marker and AST provenance.
        element.innerHTML = chunk.html.replace(/(<\/?)__DYNAMIC_\d+__/g, "$1inventory-dynamic-tag")
        return [...element.content.querySelectorAll("[data-action]")].map((control) => ({
          action: control.getAttribute("data-action"),
          value: control.getAttribute("data-value"),
          tag: control.localName,
          ...Object.fromEntries(Object.entries(chunk).filter(([key]) => key !== "html")),
        }))
      }),
    templates,
  )
  const shell = await fs.readFile(path.join(sourceRoot, manifest.template), "utf8")
  shellRows = await page.evaluate((html) => {
    const template = document.createElement("template")
    template.innerHTML = html
    return [...template.content.querySelectorAll("[data-action]")].map((control) => ({
      action: control.getAttribute("data-action"),
      value: control.getAttribute("data-value"),
      tag: control.localName,
    }))
  }, shell)
  for (const row of shellRows) {
    const needle = `data-action="${row.action}"`
    const offset = shell.indexOf(needle)
    emitters.push({
      ...row,
      kind: "shell-dom",
      file: `prototypes/bivaque-html/src/${manifest.template}`,
      line: shell.slice(0, offset).split("\n").length,
      function: "shell-template",
    })
  }
} finally {
  await browser.close()
}
for (const rows of domRows)
  for (const row of rows) {
    const template = nodes.find((node) => node.start === row.astOffset)
    const needle = `data-action="${row.action}"`
    const literalOffset = app.indexOf(needle, row.astOffset)
    const start =
      literalOffset >= row.astOffset && literalOffset < template.end ? literalOffset : row.astOffset
    emitters.push({
      ...row,
      ...location({ start }),
      function: row.function,
      kind: "ast-template-dom",
    })
  }
const concrete = (action) => typeof action === "string" && !action.includes("__DYNAMIC_")
const concreteEmissions = uniq(emitters.filter((item) => concrete(item.action)))
const dynamicEmitters = uniq(emitters.filter((item) => !concrete(item.action))).map((item) => {
  const offset = Number(item.action.split("__DYNAMIC_")[1]?.split("__")[0])
  const expression = nodes.find((node) => node.start === offset)
  return {
    ...item,
    expression:
      item.expression ||
      (expression ? app.slice(expression.start, expression.end).slice(0, 160) : null),
    resolution:
      "retained-unresolved; generic helper/dispatcher forwarding must be read with its concrete call sites",
  }
})
const concreteHandlers = uniq(handlers.filter((item) => concrete(item.action)))
const actions = [...new Set(concreteEmissions.map((item) => item.action))].sort()
const evidenceFile =
  options.get("--evidence") || ".visual/bivaque-html-round00-1/independent-functional/report.json"
let proof = null
try {
  proof = JSON.parse(await fs.readFile(path.resolve(root, evidenceFile), "utf8"))
} catch {}
const proofMatches =
  proof?.candidateHash === candidateHash &&
  proof?.status === "PASS" &&
  Array.isArray(proof.cases) &&
  proof.cases.length > 0 &&
  proof.cases.every((item) => item.status === "PASS" && Array.isArray(item.checkpoints))
const messagingProof = new Map([
  ["open-thread", "keyboard-opens-selected-thread"],
  ["send-message", "send-immediate-escaped-demo-feedback"],
  ["thread-origin", "thread-origin-and-back"],
  ["thread-menu", "local-menu-pin-delete-confirm-and-undo"],
  ["pin-thread", "local-menu-pin-delete-confirm-and-undo"],
  ["swipe-delete-thread", "local-menu-pin-delete-confirm-and-undo"],
])
let classifications = {}
if (options.has("--classification"))
  classifications = JSON.parse(
    await fs.readFile(path.resolve(root, options.get("--classification")), "utf8"),
  )
const inventory = actions.map((action) => {
  const matches = concreteHandlers.filter((item) => item.action === action)
  const checkpoint = messagingProof.get(action)
  const requiredCheckpoints = proof?.actionCheckpoints?.[action] || (checkpoint ? [checkpoint] : [])
  const tested =
    proofMatches &&
    Array.isArray(requiredCheckpoints) &&
    requiredCheckpoints.length > 0 &&
    requiredCheckpoints.every((name) => typeof name === "string") &&
    proof.cases.every((item) =>
      requiredCheckpoints.every((name) => item.checkpoints.includes(name)),
    )
  const declared = classifications[action]
  if (
    declared &&
    (![2, 4, 5].includes(declared.category) || !declared.reason || !declared.authority)
  )
    throw new Error(`Invalid explicit classification for ${action}`)
  return {
    action,
    classification: declared?.category ?? (tested ? 1 : matches.length ? 4 : 3),
    status: declared
      ? { 2: "existing-defective", 4: "future-round", 5: "incompatible" }[declared.category]
      : tested
        ? "functional-tested"
        : matches.length
          ? "implemented-unverified"
          : "no-handler",
    emitters: concreteEmissions.filter((item) => item.action === action),
    handlers: matches,
    dependencies:
      !declared && !tested && matches.length
        ? ["Verificação runtime do domínio em rodada futura"]
        : [],
    description:
      !declared && !tested && matches.length
        ? "Handler existente; funcionalidade ainda não verificada. Categoria 4 refere-se à prova pendente, sem remover a função."
        : null,
    runtimeEvidence: tested
      ? { path: evidenceFile, checkpoints: requiredCheckpoints, candidateHash: proof.candidateHash }
      : null,
    explicitDecision: declared || null,
  }
})
let comparison = null
if (options.has("--compare")) {
  const before = JSON.parse(await fs.readFile(path.resolve(root, options.get("--compare")), "utf8"))
  comparison = {
    beforeHash: before.candidateHash,
    added: inventory
      .filter((item) => !before.actions.some((old) => old.action === item.action))
      .map((item) => item.action),
    removed: before.actions.filter((old) => !inventory.some((item) => item.action === old.action)),
    changed: inventory.flatMap((item) => {
      const old = before.actions.find((previous) => previous.action === item.action)
      return old && (old.status !== item.status || old.handlers.length !== item.handlers.length)
        ? [{ action: item.action, before: old.status, after: item.status }]
        : []
    }),
  }
}
const result = {
  formatVersion: 1,
  phase: options.get("--phase") || "before",
  candidateHash,
  scannerSha256: hash(await fs.readFile(fileURLToPath(import.meta.url))),
  methodology:
    "Acorn AST lexical finite-value analysis + inert Chromium DOM parsing; no application execution",
  categories: {
    1: "functional-tested",
    2: "existing-defective",
    3: "no-handler",
    4: "future-round",
    5: "incompatible",
    unverified:
      "classification 4 / implemented-unverified: existing handler depends on future domain runtime verification",
  },
  counts: {
    routes: routes.length,
    actions: inventory.length,
    missing: inventory.filter((item) => item.status === "no-handler").length,
    tested: inventory.filter((item) => item.classification === 1).length,
    dynamicEmitters: dynamicEmitters.length,
    templatesParsed: templates.length,
  },
  actions: inventory,
  routes,
  routeCalls,
  modals: modalCalls,
  eventBindings,
  dynamicEmitters,
  orphanHandlers: concreteHandlers.filter((item) => !actions.includes(item.action)),
  comparison,
  limitations: [
    "No handler case proves runtime behavior",
    "Unknown runtime/localStorage-dependent values are retained as dynamic emitters, never silently excluded",
    "Finite-value analysis caps variants at 256 and recursion at 18; complex runtime expressions remain unresolved",
    "Closed-group auto-approval and other product defects require explicit evidence/classification",
    "Inert DOM parsing is not a click test",
  ],
}
await fs.mkdir(evidenceRoot, { recursive: true })
await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`)
const summary = [
  `# Inventário de navegação — ${result.phase}`,
  "",
  `Candidato SHA256: \`${candidateHash}\`. Scanner SHA256: \`${result.scannerSha256}\`.`,
  "",
  `${routes.length} rotas, ${inventory.length} ações concretas, ${result.counts.missing} sem handler, ` +
    `${result.counts.tested} testadas com evidência, ${inventory.filter((item) => item.status === "implemented-unverified").length} implementadas sem prova específica.`,
  `${dynamicEmitters.length} emissores genéricos/dinâmicos retidos; ${templates.length} variantes HTML analisadas em DOM inerte.`,
  "",
  "Acorn analisa declarações, callbacks, cases e comparações de ação; Chromium apenas parseia templates inertes. Não há execução da aplicação nem teste de clique neste scanner.",
  "Status 1 exige evidência de runtime compatível com o hash; case sem prova fica implemented-unverified / categoria 4 com dependência de verificação runtime futura do domínio. Isso não remove a função nem afirma que está testada. Defeitos e incompatibilidades só entram por decisão explícita com reason/authority no --classification.",
  "",
  "## Todas as ações concretas",
  "",
  "| Ação | Estado | Origem de um emissor | Handler |",
  "| --- | --- | --- | --- |",
  ...inventory.map(
    (item) =>
      `| ${item.action} | ${item.status} | ${item.emitters[0].file}:${item.emitters[0].line} | ${item.handlers.map((handler) => `${handler.function}:${handler.line}`).join(", ") || "ausente"} |`,
  ),
  "",
  "O JSON mantém TODOS os emissores/origens, variantes dinâmicas, rotas, calls/modais e bindings; esta tabela é somente índice.",
  "",
  "## Reproduzir antes/depois",
  "",
  "```powershell",
  "node scripts/bivaque-html/navigation-inventory.mjs --output .visual/bivaque-html-round01/inventory-before.json --phase before",
  "node scripts/bivaque-html/navigation-inventory.mjs --output .visual/bivaque-html-round01/inventory-after.json --phase after --compare .visual/bivaque-html-round01/inventory-before.json",
  "```",
  "",
  "Configure PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH quando necessário. --evidence troca o report de runtime, que pode fornecer actionCheckpoints: {action: [checkpoint, ...]} (todos presentes nos cases PASS e hash correspondente); --classification recebe JSON action -> {category: 2|4|5, reason, authority}. Sem nova prova compatível, o scanner nunca transforma handler em funcional testado.",
]
await fs.writeFile(output.replace(/\.json$/, ".md"), `${summary.join("\n")}\n`)
console.log(
  JSON.stringify(
    {
      output: path.relative(root, output),
      candidateHash,
      ...result.counts,
      missingActions: inventory
        .filter((item) => item.status === "no-handler")
        .map((item) => item.action),
    },
    null,
    2,
  ),
)
