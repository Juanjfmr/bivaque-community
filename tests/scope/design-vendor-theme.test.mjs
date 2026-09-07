import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const tokens = JSON.parse(
  readFileSync(join(root, "packages", "tokens", "src", "tokens.json"), "utf8"),
)
const vendorDir = join(root, "node_modules", "@heroui", "styles", "dist")

const walkCss = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return walkCss(path)
    return path.endsWith(".css") ? [path] : []
  })

const vendorSources = walkCss(vendorDir).map((path) => readFileSync(path, "utf8"))
const vendorReferences = new Set(
  vendorSources.flatMap((source) =>
    [...source.matchAll(/var\(--([a-z0-9-]+)\)/g)].map(([, name]) => name),
  ),
)

const decisionGroups = {
  color: [
    "background",
    "foreground",
    "surface",
    "surface-foreground",
    "surface-secondary",
    "surface-secondary-foreground",
    "surface-tertiary",
    "surface-tertiary-foreground",
    "overlay",
    "overlay-foreground",
    "muted",
    "default",
    "default-foreground",
    "accent",
    "accent-foreground",
    "success",
    "success-foreground",
    "warning",
    "warning-foreground",
    "danger",
    "danger-foreground",
    "field-foreground",
    "field-placeholder",
    "border",
    "separator",
    "focus",
    "link",
    "backdrop",
  ],
  state: [
    "surface-hover",
    "default-hover",
    "default-soft",
    "default-soft-foreground",
    "default-soft-hover",
    "accent-hover",
    "accent-soft",
    "accent-soft-foreground",
    "accent-soft-hover",
    "success-hover",
    "success-soft",
    "success-soft-foreground",
    "success-soft-hover",
    "warning-hover",
    "warning-soft",
    "warning-soft-foreground",
    "warning-soft-hover",
    "danger-hover",
    "danger-soft",
    "danger-soft-foreground",
    "danger-soft-hover",
    "field-background",
    "field-border",
    "field-border-hover",
    "field-border-focus",
    "field-focus",
    "field-hover",
    "disabled-opacity",
  ],
  shape: [
    "radius",
    "radius-xl",
    "radius-2xl",
    "radius-3xl",
    "border-width",
    "border-width-field",
    "ring-offset-width",
    "spacing",
  ],
  motion: [
    "ease-linear",
    "ease-smooth",
    "ease-out",
    "ease-out-fluid",
    "ease-out-quad",
    "ease-out-quart",
    "default-transition-duration",
    "default-transition-timing-function",
  ],
}

const decisionVariables = Object.values(decisionGroups)
  .flat()
  .filter((name) => vendorReferences.has(name))
const sourceAliases = tokens.web.aliases
const resolve = (value, seen = new Set()) => {
  const match = /^var\(--(primitive|semantic|component)-([a-z0-9-]+)\)$/.exec(value)
  if (!match) return value
  const reference = `${match[1]}.${match[2]}`
  assert.equal(seen.has(reference), false, `cyclic token reference: ${reference}`)
  assert.ok(Object.hasOwn(tokens[match[1]], match[2]), `unknown token: ${reference}`)
  return resolve(tokens[match[1]][match[2]], new Set([...seen, reference]))
}

test("HeroUI decision variables are dynamically covered by the permanent adapter", () => {
  assert.ok(vendorReferences.size > 0, "HeroUI stylesheet must be installed for this contract")
  assert.ok(
    decisionVariables.length > 30,
    "the explicit decision inventory must cover the theme surface",
  )

  const missing = decisionVariables.filter((name) => !Object.hasOwn(sourceAliases, name))
  assert.deepEqual(missing, [])

  const generated = readFileSync(join(root, "packages", "tokens", "src", "tokens.css"), "utf8")
  const notGenerated = decisionVariables.filter((name) => !generated.includes(`--${name}:`))
  assert.deepEqual(notGenerated, [])

  // Excluded variables are deliberately vendor internals (component-local geometry,
  // Tailwind utilities and unenabled component internals), not an accidental waiver of
  // color, state, shape or motion decisions. The inventory stays explicit as the package changes.
  const excludedReasons = new Map([
    ["component-local", "button-bg and field-bg are derived inside HeroUI selectors"],
    ["utility", "tw-* variables are generated utility implementation details"],
    ["geometry", "trigger-width and viewport variables are layout internals"],
    ["disabled", "HeroUI consumes disabled-opacity, whose source value is 1"],
  ])
  assert.ok(excludedReasons.size >= 3)
})

test("interactive surfaces have distinct resting and hover tokens", () => {
  const pairs = [
    ["surface", "surface-hover"],
    ["default", "default-hover"],
    ["accent", "accent-hover"],
    ["success", "success-hover"],
    ["warning", "warning-hover"],
    ["danger", "danger-hover"],
    ["field-background", "field-hover"],
    ["default-soft", "default-soft-hover"],
    ["accent-soft", "accent-soft-hover"],
    ["success-soft", "success-soft-hover"],
    ["warning-soft", "warning-soft-hover"],
    ["danger-soft", "danger-soft-hover"],
  ]
  for (const [resting, hover] of pairs) {
    assert.notEqual(
      resolve(sourceAliases[resting]),
      resolve(sourceAliases[hover]),
      `${resting} must change on hover`,
    )
  }
})

test("neutral HeroUI surfaces resolve to the Bivaque palette", () => {
  const palette = new Set(
    Object.values(tokens.primitive).filter((value) => /^#[0-9A-Fa-f]{6}$/.test(value)),
  )
  for (const name of [
    "background",
    "surface",
    "surface-hover",
    "default",
    "default-hover",
    "field-background",
  ]) {
    assert.ok(
      palette.has(resolve(sourceAliases[name])),
      `${name} must resolve to a palette primitive`,
    )
  }
  assert.equal(resolve(sourceAliases.surface), "#FFFFFF")
  assert.notEqual(resolve(sourceAliases.default), resolve(sourceAliases.surface))
})

test("disabled controls use opaque token pairs with AA-safe text and visible boundaries", () => {
  const luminance = (hex) => {
    const channels = hex
      .slice(1)
      .match(/../g)
      .map((channel) => Number.parseInt(channel, 16) / 255)
    const linear = channels.map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  }
  const contrast = (foreground, background) => {
    const foregroundLuminance = luminance(foreground)
    const backgroundLuminance = luminance(background)
    return (
      (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
    )
  }

  const pairs = [
    // O texto do primário desabilitado deixou de ser o mesmo do ativo em
    // 2026-09-06: a nota de correção da prancha 30 do guia visual pede cinza
    // escuro sobre superfície clara opaca, e um único `fg` para os cinco
    // estados não comporta isso. A exigência de 4,5:1 continua — o que mudou é
    // qual token é conferido, não o limite.
    ["component.button-primary-fg-disabled", "component.button-primary-bg-disabled", 4.5],
    ["component.button-danger-fg", "component.button-danger-bg-disabled", 4.5],
    ["semantic.text-primary", "component.field-bg-disabled", 4.5],
    ["component.field-border-disabled", "component.field-bg-disabled", 3],
  ]
  const pathValue = (path) => {
    const [layer, name] = path.split(".")
    return resolve(tokens[layer][name])
  }
  for (const [foregroundPath, backgroundPath, minimum] of pairs) {
    const foreground = pathValue(foregroundPath)
    const background = pathValue(backgroundPath)
    assert.match(foreground, /^#[0-9A-Fa-f]{6}$/)
    assert.match(background, /^#[0-9A-Fa-f]{6}$/)
    assert.ok(
      contrast(foreground, background) >= minimum,
      `${foregroundPath} on ${backgroundPath} is too weak`,
    )
  }
  assert.equal(resolve(sourceAliases["disabled-opacity"]), "1")
  assert.equal(
    Object.values({ ...tokens.semantic, ...tokens.component, ...sourceAliases }).some((value) =>
      /opacity\s*:/i.test(value),
    ),
    false,
  )
})

test("motion decisions resolve through system tokens", () => {
  for (const name of decisionGroups.motion.filter((name) => vendorReferences.has(name))) {
    assert.match(sourceAliases[name], /^var\(--(primitive|semantic|component)-[a-z0-9-]+\)$/)
    assert.match(resolve(sourceAliases[name]), /ms|cubic-bezier/)
  }
})

test("product code does not consume adapter-only aliases", () => {
  const sourcePaths = [join(root, "apps", "web", "app", "globals.css")]
  const componentDir = join(root, "apps", "web", "app", "components", "bivaque")
  sourcePaths.push(
    ...readdirSync(componentDir)
      .filter((entry) => entry.endsWith(".tsx"))
      .map((entry) => join(componentDir, entry)),
  )
  const sources = sourcePaths.map((path) => readFileSync(path, "utf8")).join("\n")
  const nonLibraryAliases = Object.keys(sourceAliases).filter((name) => !vendorReferences.has(name))

  for (const name of nonLibraryAliases) {
    assert.doesNotMatch(
      sources,
      new RegExp(`var\\(--${name}\\)`),
      `product code reads adapter-only --${name}`,
    )
    assert.doesNotMatch(
      sources,
      new RegExp(`(?:bg|text|border|ring|outline|shadow|duration|ease)-${name}(?=[\\s"']|$)`),
      `product code reads adapter-only utility ${name}`,
    )
  }
})
