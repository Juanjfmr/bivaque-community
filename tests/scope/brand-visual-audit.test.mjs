import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

test("integrates the approved identity into deterministic screen audits", () => {
  const capture = readFileSync(join(root, "scripts", "visual", "capture.mjs"), "utf8")

  assert.match(capture, /brand-presence/)
  assert.match(capture, /provisional-brand/)
  assert.match(capture, /brand-minimum-size/)
  assert.match(capture, /brand-contrast/)
  assert.match(capture, /patio-as-primary-mark/)
  assert.match(capture, /officialBrandMarks/)
})

test("makes BrandMark machine-readable to the capture audit", () => {
  const component = readFileSync(
    join(root, "apps", "web", "app", "components", "bivaque", "brand-mark.tsx"),
    "utf8",
  )

  assert.match(component, /data-bivaque-brand="official"/)
  assert.match(component, /data-brand-asset=\{asset\}/)
  assert.match(component, /data-brand-tone=\{tone\}/)
})

test("requires human brand judgment in the visual rubric", () => {
  const guide = readFileSync(join(root, "docs", "agents", "VISUAL_GUIDE.md"), "utf8")
  const driver = readFileSync(join(root, "docs", "agents", "QWEN_BUILD_PROMPT.md"), "utf8")
  const contract = readFileSync(join(root, "docs", "brand", "SCREEN_AUDIT.md"), "utf8")

  assert.match(guide, /Marca: Glifo oficial/)
  assert.match(driver, /Brand integrity/)
  assert.match(contract, /DEFERRED — FRONTEND-VISUAL-AAA/)
})
