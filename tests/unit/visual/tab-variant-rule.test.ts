import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

// RECON-045: `tabs--secondary` was applied on three screens and defined in no
// stylesheet, so the selected tab looked identical to the others. Styling the
// one class fixes the instance; this guard fixes the mechanism. Every modifier
// class the product applies in JSX (the `name--modifier` convention) must have
// a matching `.name--modifier` rule in the product's own CSS. A newly copied
// modifier with no rule fails here instead of shipping invisible.

const APP_DIR = join(process.cwd(), "apps", "web", "app")
const MODIFIER = /^[a-z][a-zA-Z0-9]*(?:--[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)+$/

function walk(dir: string, extension: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".next" || entry.name === "node_modules") continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...walk(full, extension))
    else if (entry.name.endsWith(extension)) found.push(full)
  }
  return found
}

function modifierClasses(source: string): string[] {
  const classes: string[] = []
  const re = /class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g
  for (const match of source.matchAll(re)) {
    const value = match[1] ?? match[2] ?? match[3] ?? ""
    for (const token of value.split(/\s+/)) {
      if (MODIFIER.test(token)) classes.push(token)
    }
  }
  return classes
}

function definedClassNames(cssText: string): Set<string> {
  const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, "")
  const names = new Set<string>()
  const re = /\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g
  for (const match of withoutComments.matchAll(re)) names.add(match[1])
  return names
}

function orphans(sources: string[], cssText: string): string[] {
  const defined = definedClassNames(cssText)
  const used = new Set(sources.flatMap(modifierClasses))
  return [...used].filter((name) => !defined.has(name)).sort()
}

describe("modifier class rules", () => {
  it("flags a modifier applied in JSX with no matching CSS rule", () => {
    const sources = ['<Tabs className="tabs--secondary mt-4" />', "<div className={`foo--bar`} />"]
    expect(orphans(sources, ".tabs--secondary { min-width: 0 }")).toEqual(["foo--bar"])
    expect(orphans(sources, ".tabs--secondary {} .foo--bar {}")).toEqual([])
  })

  it("reads modifiers from className strings and template literals only", () => {
    expect(modifierClasses('<div className="flex tabs--secondary" />')).toEqual(["tabs--secondary"])
    expect(modifierClasses("<div className={`flex tabs--secondary`} />")).toEqual([
      "tabs--secondary",
    ])
    expect(modifierClasses('<div style={{ color: "mt-4" }} />')).toEqual([])
  })

  it("has no orphan modifier class on any app screen", () => {
    const css = walk(APP_DIR, ".css")
      .map((file) => readFileSync(file, "utf8"))
      .join("\n")
    const tsx = walk(APP_DIR, ".tsx").map((file) => readFileSync(file, "utf8"))
    expect(orphans(tsx, css)).toEqual([])
  })

  it("defines tabs--secondary once, in the product stylesheet the screens inherit", () => {
    const css = walk(APP_DIR, ".css").map((file) => ({
      file: relative(process.cwd(), file).replace(/\\/g, "/"),
      text: readFileSync(file, "utf8"),
    }))
    const defining = css.filter((entry) => definedClassNames(entry.text).has("tabs--secondary"))
    expect(defining.map((entry) => entry.file)).toEqual(["apps/web/app/globals.css"])
  })
})
