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

test("defines the DESIGN_SPEC section 1 token set in globals.css", () => {
  // Given the web application global stylesheet
  const globals = readFileSync(join(root, "apps/web/app/globals.css"), "utf8")

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
    "--space-12",
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
  ]

  // Then every token from the spec is declared
  const missing = required.filter((token) => !globals.includes(`${token}:`))
  assert.deepEqual(missing, [])

  // And the reduced-motion path survives the token work
  assert.match(globals, /prefers-reduced-motion:\s*reduce/)
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

  // And the extracted token is the foreground hairline mix
  const globals = readFileSync(join(root, "apps/web/app/globals.css"), "utf8")
  assert.match(globals, /--border:\s*color-mix\(in oklch, var\(--foreground\) 12%, transparent\)/)
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
})

test("exports the full token set from @bivaque/tokens", () => {
  // Given the shared tokens package source
  const tokens = readFileSync(join(root, "packages/tokens/src/index.ts"), "utf8")

  // When its exported groups are inspected
  const groups = ["color:", "elevation:", "space:", "radius:", "text:", "motion:"]

  // Then the package carries the same sets the stylesheet declares
  const missing = groups.filter((group) => !tokens.includes(group))
  assert.deepEqual(missing, [])

  // And the privacy-safe brand surface stays intact for existing consumers
  assert.match(tokens, /productName:\s*"Bivaque"/)
  assert.match(tokens, /surfaceRaised:/)
  assert.match(tokens, /backdrop:/)
})
