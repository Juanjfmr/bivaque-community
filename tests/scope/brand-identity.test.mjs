import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const publicBrand = join(root, "apps", "web", "public", "brand")

const officialMarks = [
  "bivaque-graphic-patio.svg",
  "bivaque-logo-primary.svg",
  "bivaque-logo-primary-graphite.svg",
  "bivaque-logo-primary-white.svg",
  "bivaque-logo-primary-black.svg",
  "bivaque-logo-horizontal.svg",
  "bivaque-logo-horizontal-graphite.svg",
  "bivaque-logo-horizontal-white.svg",
  "bivaque-logo-horizontal-black.svg",
  "bivaque-logo-stacked.svg",
  "bivaque-logo-stacked-graphite.svg",
  "bivaque-logo-stacked-white.svg",
  "bivaque-logo-stacked-black.svg",
  "bivaque-wordmark.svg",
  "bivaque-wordmark-graphite.svg",
  "bivaque-wordmark-white.svg",
  "bivaque-wordmark-black.svg",
  "bivaque-symbol.svg",
  "bivaque-symbol-graphite.svg",
  "bivaque-symbol-white.svg",
  "bivaque-symbol-black.svg",
]

test("ships every approved web mark as transparent vector geometry", () => {
  for (const filename of officialMarks) {
    const path = join(publicBrand, filename)
    assert.equal(existsSync(path), true, `${filename} is missing`)

    const svg = readFileSync(path, "utf8")
    assert.match(svg, /<svg\b/)
    assert.match(svg, /\bviewBox="[^"]+"/)
    assert.doesNotMatch(svg, /<(?:image|text)\b/i)
    assert.doesNotMatch(svg, /\b(?:filter|mask|font-family)=/i)
    assert.doesNotMatch(svg, /\b(?:href|xlink:href)=["'](?:https?:|data:image)/i)
  }
})

test("ships the small-size and platform icon set", () => {
  const required = [
    "icons/bivaque-symbol-16.svg",
    "icons/bivaque-symbol-24.svg",
    "icons/bivaque-symbol-32.svg",
    "icons/bivaque-symbol-48.svg",
    "icons/favicon.svg",
    "icons/favicon.ico",
    "icons/apple-touch-icon.png",
    "icons/bivaque-pwa-192.png",
    "icons/bivaque-pwa-512.png",
    "icons/bivaque-maskable-512.png",
    "icons/bivaque-android-foreground.svg",
    "icons/bivaque-android-background.svg",
    "icons/bivaque-avatar-circle.svg",
    "icons/bivaque-avatar-square.svg",
    "icons/bivaque-ios-safe-area.svg",
  ]

  const missing = required.filter((path) => !existsSync(join(publicBrand, path)))
  assert.deepEqual(missing, [])
})

test("keeps approved identity data separate from the active runtime theme", () => {
  const official = readFileSync(
    join(root, "packages", "tokens", "src", "official-brand.ts"),
    "utf8",
  )
  const active = readFileSync(join(root, "packages", "tokens", "src", "index.ts"), "utf8")
  const guide = readFileSync(join(root, "docs", "brand", "README.md"), "utf8")

  assert.match(official, /graphite:\s*"#253033"/)
  assert.match(official, /paper:\s*"#F2F0EB"/)
  assert.match(official, /brasa:\s*"#B84A3A"/)
  assert.match(official, /activationCard:\s*"FRONTEND-VISUAL-AAA"/)
  assert.match(official, /darkModeAvailable:\s*false/)
  assert.match(active, /export \{ officialBrandIdentity \} from "\.\/official-brand"/)
  assert.match(guide, /continua light-only/)
})
