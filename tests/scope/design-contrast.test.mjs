import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const tokens = JSON.parse(
  readFileSync(join(root, "packages", "tokens", "src", "tokens.json"), "utf8"),
)

const resolveToken = (reference, seen = new Set()) => {
  const [layer, name] = reference.split(".")
  assert.ok(layer && name && Object.hasOwn(tokens[layer], name), `unknown token: ${reference}`)
  assert.equal(seen.has(reference), false, `cyclic token reference: ${reference}`)
  const value = tokens[layer][name]
  const match = /^var\(--(primitive|semantic|component)-([a-z0-9-]+)\)$/.exec(value)
  if (!match) return value
  return resolveToken(`${match[1]}.${match[2]}`, new Set([...seen, reference]))
}

const parseColor = (reference) => {
  const value = resolveToken(reference)
  if (value.startsWith("#")) {
    let hex = value.slice(1)
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((channel) => channel + channel)
        .join("")
    assert.match(hex, /^[0-9a-f]{6}$/i, `unsupported color token: ${reference}`)
    return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16))
  }

  const match = /^rgba?\(([^)]+)\)$/.exec(value)
  assert.ok(match, `unsupported color token: ${reference} = ${value}`)
  const channels = match[1].split(",").map((channel) => Number.parseFloat(channel.trim()))
  assert.equal(channels.length >= 3, true, `invalid color token: ${reference}`)
  return channels.slice(0, 3)
}

const luminance = (color) => {
  const channel = (raw) => {
    const normalized = raw / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2])
}

const contrast = (foreground, background) => {
  const foregroundLuminance = luminance(parseColor(foreground))
  const backgroundLuminance = luminance(parseColor(background))
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  )
}

test("every documented text/surface pair meets WCAG AA", () => {
  const expected = tokens.contrast.textForegrounds.flatMap((foreground) =>
    tokens.contrast.surfaceBackgrounds.map((background) => ({ foreground, background })),
  )
  const actual = tokens.contrast.textPairs
  const key = (pair) => `${pair.foreground} on ${pair.background}`
  assert.deepEqual(
    actual.map(key).sort(),
    expected.map(key).sort(),
    "the text matrix must cover every source foreground/surface combination exactly once",
  )

  for (const pair of actual) {
    const ratio = contrast(pair.foreground, pair.background)
    assert.ok(ratio >= 4.5, `${pair.foreground} on ${pair.background}: ${ratio.toFixed(2)}:1`)
  }
})

test("disabled text states meet WCAG AA without opacity", () => {
  for (const pair of tokens.contrast.stateTextPairs) {
    const ratio = contrast(pair.foreground, pair.background)
    assert.ok(ratio >= 4.5, `${pair.name}: ${ratio.toFixed(2)}:1`)
  }

  for (const name of ["button-primary-bg-disabled", "button-danger-bg-disabled"]) {
    assert.doesNotMatch(tokens.component[name], /opacity/i, `${name} must be a solid token`)
  }
})

test("every documented non-text pair meets the 3:1 boundary", () => {
  const pairs = tokens.contrast.nonTextPairs
  assert.ok(pairs.length >= 6, "focus and control-boundary coverage must be explicit")
  assert.equal(new Set(pairs.map((pair) => pair.name)).size, pairs.length)

  for (const name of [
    "focus-inner-on-primary",
    "focus-inner-on-danger",
    "focus-outer-on-canvas",
    "focus-outer-on-sunken",
    "control-border-on-field",
    "control-border-on-canvas",
  ]) {
    assert.ok(
      pairs.some((pair) => pair.name === name),
      `missing non-text pair: ${name}`,
    )
  }

  for (const pair of pairs) {
    const ratio = contrast(pair.foreground, pair.background)
    assert.ok(ratio >= 3, `${pair.name}: ${ratio.toFixed(2)}:1`)
  }

  assert.notEqual(
    resolveToken("semantic.control-border"),
    resolveToken("semantic.focus-outer"),
    "resting control boundary must differ from focus ring",
  )
})
