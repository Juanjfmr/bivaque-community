import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (entry === "node_modules" || entry === ".next") return []
    if (statSync(path).isDirectory()) return walk(path)
    return path.endsWith(".tsx") || path.endsWith(".css") ? [path] : []
  })

test("defines the canonical design-system token set from the generated web stylesheet", () => {
  // Given the generated stylesheet imported by the web global stylesheet
  const globals = readFileSync(join(root, "apps/web/app/globals.css"), "utf8")
  const generated = readFileSync(join(root, "packages/tokens/src/tokens.css"), "utf8")
  assert.match(globals, /@import "\.\.\/\.\.\/\.\.\/packages\/tokens\/src\/tokens\.css"/)

  // When the required token names are checked
  const required = [
    "--surface-raised",
    "--surface-sunken",
    "--surface-subtle",
    "--border",
    "--muted",
    "--accent-soft",
    "--danger",
    "--danger-soft",
    "--warning",
    "--success",
    "--backdrop",
    "--elevation-0",
    "--elevation-1",
    "--elevation-2",
    "--elevation-3",
    "--space-1",
    "--space-2",
    "--space-3",
    "--space-4",
    "--space-6",
    "--space-8",
    "--space-10",
    "--space-12",
    "--space-16",
    "--radius-sm",
    "--radius-lg",
    "--radius-full",
    "--text-xs",
    "--text-sm",
    "--text-base",
    "--text-lg",
    "--text-xl",
    "--text-2xl",
    "--text-3xl",
    "--duration-instant",
    "--duration-fast",
    "--duration-base",
    "--duration-slow",
    "--ease-out",
    "--ease-in",
    "--ease-spring",
    "--primitive-paper-50",
    "--primitive-pine-700",
    "--semantic-canvas",
    "--semantic-action-primary",
    "--component-button-primary-bg",
    "--component-card-bg",
  ]

  // Then every token from the spec is declared
  const missing = required.filter((token) => !generated.includes(`${token}:`))
  assert.deepEqual(missing, [])

  // And the reduced-motion path survives the token work
  assert.match(globals, /prefers-reduced-motion:\s*reduce/)
})

test("carries the palette authorised on 2026-09-06", () => {
  // Given the single token source
  const tokens = JSON.parse(readFileSync(join(root, "packages/tokens/src/tokens.json"), "utf8"))

  // When the approved values are checked
  // (docs/design/visual-guide-2026-09-06: verde profundo, fundo claro, sálvia)
  assert.equal(tokens.primitive["pine-700"], "#164734")
  assert.equal(tokens.primitive["paper-50"], "#FAFBF8")
  assert.equal(tokens.primitive["pine-100"], "#EEF1E7")

  // Then the product roles resolve to them, and the terracotta family is gone
  assert.equal(tokens.semantic["action-primary"], "var(--primitive-pine-700)")
  assert.equal(tokens.semantic.canvas, "var(--primitive-paper-50)")
  assert.equal(tokens.semantic.selected, "var(--primitive-pine-100)")
  assert.deepEqual(
    Object.keys(tokens.primitive).filter((name) => name.startsWith("terra-")),
    [],
  )
})

test("keeps the hairline in the --border token, not inlined", () => {
  // Given every component and stylesheet under apps/web
  const sources = walk(join(root, "apps/web")).map((path) => readFileSync(path, "utf8"))

  // When they are scanned for the old inlined hairline pattern
  const inlinedHairline = /border(?:-[trblxy])?-\[color-mix\(/

  // Then no component inlines a color-mix border anymore
  assert.equal(
    sources.some((source) => inlinedHairline.test(source)),
    false,
  )

  // And the alias resolves through the semantic border role.
  const generated = readFileSync(join(root, "packages/tokens/src/tokens.css"), "utf8")
  assert.match(generated, /--border:\s*var\(--semantic-border\)/)
  assert.match(
    generated,
    /--semantic-border:\s*color-mix\(in srgb, var\(--primitive-ink-900\) 14%, transparent\)/,
  )
  assert.doesNotMatch(generated, /rgba\(23, 33, 58, 0\.14\)/)
})

test("keeps colors in tokens, not in component inline styles", () => {
  // Given every source file under apps/web
  const sources = walk(join(root, "apps/web")).map((path) => readFileSync(path, "utf8"))

  // When they are scanned for inlined colors and raw tailwind reds
  const inlineColor = /style=\{\{[^}]*?(backgroundColor|color):/
  const rawReds = /(?:bg|border|text)-(?:red|rose)-[0-9]{2,3}\b/

  // Then no component inlines a background/foreground color anymore
  assert.equal(
    sources.some((source) => inlineColor.test(source)),
    false,
  )
  assert.equal(
    sources.some((source) => rawReds.test(source)),
    false,
  )

  const rawColor = /#[0-9A-Fa-f]{3,8}\b/
  const cssSheets = walk(join(root, "apps/web/app")).filter(
    (path) => path.endsWith(".css") && path !== join(root, "apps/web/app/globals.css"),
  )
  assert.equal(
    cssSheets.some((path) => rawColor.test(readFileSync(path, "utf8"))),
    false,
  )
})

test("exports primitive, semantic and component token layers", () => {
  // Given the shared tokens package source
  const tokens = readFileSync(join(root, "packages/tokens/src/index.ts"), "utf8")

  // When its architectural layers are inspected
  const groups = [
    "export const primitives",
    "export const semanticTokens",
    "export const componentTokens",
    "export const nativeTokens",
  ]

  // Then the package carries the same architectural layers the stylesheet declares.
  const missing = groups.filter((group) => !tokens.includes(group))
  assert.deepEqual(missing, [])

  // And the compatibility adapter remains safe for existing consumers.
  assert.match(tokens, /productName:\s*"Bivaque"/)
  assert.match(tokens, /surfaceRaised:/)
  assert.match(tokens, /backdrop:/)
  assert.match(tokens, /tokens\.json/)
})

test("defines motion utilities with reduced-motion intact", () => {
  // Given the web application global stylesheet
  const globals = readFileSync(join(root, "apps/web/app/globals.css"), "utf8")

  // When the motion layer is inspected
  const utilities = [
    "motion-card-enter",
    "motion-scrim-enter",
    "motion-panel-enter",
    "motion-press",
    "motion-lift",
  ]

  // Then the enter/press/lift utilities exist and read from tokens
  const missing = utilities.filter((utility) => !globals.includes(`.${utility}`))
  assert.deepEqual(missing, [])

  // And every interactive element still resolves motion via the reduced-motion block
  assert.match(globals, /animation-duration:\s*0s/)
  assert.match(globals, /transition-duration:\s*0s/)
})

test("keeps component states in the token source and derives ink-based values", () => {
  const tokens = JSON.parse(readFileSync(join(root, "packages/tokens/src/tokens.json"), "utf8"))
  const requiredStates = ["default", "hover", "pressed", "disabled", "loading"]

  const resolve = (reference, seen = new Set()) => {
    const [layer, name] = reference.split(".")
    assert.ok(layer && name && Object.hasOwn(tokens[layer], name), `unknown token: ${reference}`)
    assert.equal(seen.has(reference), false, `cyclic token reference: ${reference}`)
    const value = tokens[layer][name]
    const match = /^var\(--(primitive|semantic|component)-([a-z0-9-]+)\)$/.exec(value)
    return match ? resolve(`${match[1]}.${match[2]}`, new Set([...seen, reference])) : value
  }

  for (const component of ["button-primary-bg", "button-danger-bg", "field-bg", "field-border"]) {
    for (const state of requiredStates) {
      assert.ok(tokens.component[`${component}-${state}`], `missing ${component}-${state}`)
    }

    // Um estado pode herdar de outro, e diz isso apontando para ele: `field-bg-loading`
    // referencia `component.field-bg-disabled`. Um campo carregando não tem cor própria
    // — ele fica indisponível e recebe movimento, que é o contrato de Skeleton na §6.
    // Exigir cinco cores distintas aqui foi o que produziu borda vermelha em campo
    // pressionado e verde em campo carregando: cores emprestadas de outros significados,
    // escolhidas para satisfazer a contagem. A regra correta é que estado nenhum resolva
    // por acidente para o valor de outro — herdar é explícito e aponta para o pai.
    const inherits = (state) => {
      const value = tokens.component[`${component}-${state}`]
      const match = /^var\(--component-([a-z0-9-]+)\)$/.exec(value)
      if (!match) return null
      const parent = match[1].replace(`${component}-`, "")
      assert.ok(
        requiredStates.includes(parent),
        `${component}-${state} inherits from ${match[1]}, which is not a state of this component`,
      )
      return parent
    }

    const ownStates = requiredStates.filter((state) => inherits(state) === null)
    const resolvedOwn = ownStates.map((state) => resolve(`component.${component}-${state}`))
    assert.equal(
      new Set(resolvedOwn).size,
      ownStates.length,
      `${component} states without a declared parent must resolve to distinct values`,
    )
  }

  assert.notEqual(resolve("semantic.control-border"), resolve("semantic.focus-outer"))
  for (const value of Object.values(tokens.component).filter(
    (value) => typeof value === "string",
  )) {
    assert.doesNotMatch(value, /opacity/i, "disabled states must not use opacity")
  }

  for (const value of [
    tokens.semantic.border,
    tokens.semantic.backdrop,
    tokens.semantic["elevation-raised"],
    tokens.semantic["elevation-overlay"],
  ]) {
    assert.match(value, /var\(--primitive-ink-900\)/)
    assert.doesNotMatch(value, /23, 33, 58/)
  }
})
