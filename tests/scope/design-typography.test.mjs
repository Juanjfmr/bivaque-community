import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const read = (...parts) => readFileSync(join(root, ...parts), "utf8")
const tokens = JSON.parse(read("packages", "tokens", "src", "tokens.json"))

const roles = {
  display: { size: "2.5rem", weight: "650", lineHeight: "3rem", letterSpacing: "-0.015em" },
  pageTitle: {
    size: "1.75rem",
    weight: "650",
    lineHeight: "2.125rem",
    letterSpacing: "-0.011em",
  },
  sectionTitle: {
    size: "1.25rem",
    weight: "650",
    lineHeight: "1.75rem",
    letterSpacing: "-0.006em",
  },
  cardTitle: { size: "1rem", weight: "600", lineHeight: "1.5rem", letterSpacing: "0" },
  body: { size: "1rem", weight: "400", lineHeight: "1.625rem", letterSpacing: "0" },
  label: { size: "0.875rem", weight: "600", lineHeight: "1.25rem", letterSpacing: "0.01em" },
  meta: { size: "0.8125rem", weight: "400", lineHeight: "1.125rem", letterSpacing: "0.005em" },
}

test("defines seven complete typography roles in the token source", () => {
  for (const [role, definition] of Object.entries(roles)) {
    for (const [property, expected] of Object.entries(definition)) {
      const tokenName = `type-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}-${
        property === "size"
          ? "size"
          : property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
      }`
      assert.equal(
        tokens.primitive[tokenName],
        expected,
        `${tokenName} must keep the documented ${property}`,
      )
      const semanticName = `typography-${tokenName.slice(5)}`
      assert.equal(
        tokens.semantic[semanticName],
        `var(--primitive-${tokenName})`,
        `${semanticName} must derive its primitive value`,
      )
    }
  }

  assert.equal(tokens.primitive["type-reading-measure"], "72ch")
  assert.equal(tokens.primitive["type-reading-min-characters"], "45")
  assert.equal(tokens.primitive["type-reading-max-characters"], "72")
})

test("ships the generated typography layer and all documented legacy sizes", () => {
  const css = read("packages", "tokens", "src", "tokens.css")
  const document = read("docs", "agents", "DESIGN_SYSTEM.md")

  for (const role of Object.keys(roles)) {
    const cssRole = role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    for (const property of ["size", "weight", "line-height", "letter-spacing"]) {
      assert.match(css, new RegExp(`--semantic-typography-${cssRole}-${property}:`))
    }
  }

  assert.match(
    css,
    /--semantic-typography-reading-measure:\s*var\(--primitive-type-reading-measure\)/,
  )
  assert.match(document, /Display \| 40 \/ 48 \| 650/)
  assert.match(document, /Page title \| 28 \/ 34 \| 650/)
  assert.match(document, /Section title \| 20 \/ 28 \| 650/)
  assert.match(document, /`text-lg` \(18 px\)/)
  assert.match(document, /`text-2xl` \(24 px\)/)
  assert.match(document, /Legacy large/)
  assert.match(document, /Legacy extra-large/)
})

test("uses the local variable font loader with fallback metric adjustment", () => {
  const layout = read("apps", "web", "app", "layout.tsx")
  assert.match(layout, /next\/font\/local/)
  assert.match(layout, /weight:\s*"100 900"/)
  assert.match(layout, /display:\s*"swap"/)
  assert.match(layout, /preload:\s*true/)
  assert.match(layout, /adjustFontFallback:\s*"Arial"/)
  assert.match(layout, /variable:\s*"--font-public-sans"/)
  assert.match(layout, /className=\{publicSans\.variable\}/)

  for (const file of [
    "public-sans-latin-wght-normal.woff2",
    "public-sans-latin-ext-wght-normal.woff2",
    "OFL.txt",
  ]) {
    assert.equal(existsSync(join(root, "apps", "web", "app", "fonts", file)), true, file)
  }

  for (const file of [
    "public-sans-latin-wght-normal.woff2",
    "public-sans-latin-ext-wght-normal.woff2",
  ]) {
    assert.equal(read("apps", "web", "app", "fonts", file).slice(0, 4), "wOF2")
  }
})

test("keeps typography in globals token-driven and exposes semantic utilities", () => {
  const globals = read("apps", "web", "app", "globals.css")
  for (const utility of [
    "type-display",
    "type-page-title",
    "type-section-title",
    "type-card-title",
    "type-body",
    "type-label",
    "type-meta",
    "measure-reading",
  ]) {
    assert.match(globals, new RegExp(`\\.${utility}`))
  }

  assert.match(globals, /h1\s*\{[\s\S]*semantic-typography-page-title/)
  assert.match(globals, /h2\s*\{[\s\S]*semantic-typography-section-title/)
  assert.match(globals, /p,\s*li\s*\{[\s\S]*semantic-typography-body/)
  assert.match(globals, /label,\s*button,\s*\[role="button"\][\s\S]*semantic-typography-label/)
  assert.doesNotMatch(globals, /font-size:\s*\d|font-weight:\s*\d|line-height:\s*\d(?:\.\d+)?\s*;/)
})

test("audits external font requests and reading measure", () => {
  const capture = read("scripts", "visual", "capture.mjs")
  assert.match(capture, /external-font-request/)
  assert.match(capture, /performance\.getEntriesByType\("resource"\)/)
  assert.match(capture, /reading-measure/)
  assert.match(capture, /readingMeasureMax/)

  assert.doesNotMatch(capture, /fonts\.googleapis\.com|fonts\.gstatic\.com/)
})
