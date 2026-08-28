import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import test from "node:test"

const ROOT = process.cwd()
const APP_DIR = join(ROOT, "apps", "web", "app")
const REGISTRY_PATH = join(ROOT, "docs", "product-map", "PAGE_REGISTRY.yaml")
const registryText = readFileSync(REGISTRY_PATH, "utf8")
const registryLines = registryText.split(/\r?\n/)

function topLevelBlock(name) {
  const marker = `${name}:`
  const start = registryLines.findIndex((line) => line === marker)
  assert.notEqual(start, -1, `Missing ${marker} in PAGE_REGISTRY.yaml`)

  let end = registryLines.length
  for (let index = start + 1; index < registryLines.length; index += 1) {
    if (/^[a-z_]+:/.test(registryLines[index])) {
      end = index
      break
    }
  }

  return registryLines.slice(start + 1, end)
}

function scalar(value) {
  if (value === undefined) return ""
  return value.replace(/^['"]|['"]$/g, "")
}

function mapList(name) {
  const rows = []
  let current = null

  for (const line of topLevelBlock(name)) {
    const item = line.match(/^- ([a-z_]+):(?: (.*))?$/)
    if (item) {
      current = { [item[1]]: scalar(item[2]) }
      rows.push(current)
      continue
    }

    const field = line.match(/^  ([a-z_]+):(?: (.*))?$/)
    if (field && current) current[field[1]] = scalar(field[2])
  }

  return rows
}

function scalarList(name) {
  return topLevelBlock(name)
    .map((line) => line.match(/^- (.+)$/)?.[1])
    .filter(Boolean)
}

function inheritedExitIds() {
  return topLevelBlock("navigation_profiles")
    .map((line) => line.match(/^    - ([A-Z]+-\d+)$/)?.[1])
    .filter(Boolean)
}

function walkPages(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkPages(absolute))
    } else if (entry.isFile() && entry.name === "page.tsx") {
      files.push(relative(ROOT, absolute).split(sep).join("/"))
    }
  }
  return files
}

function routeFromFile(file) {
  const prefix = "apps/web/app/"
  assert.ok(file.startsWith(prefix), `Unexpected app page path: ${file}`)
  const relativePage = file.slice(prefix.length)
  const directory = relativePage === "page.tsx" ? "" : relativePage.replace(/\/page\.tsx$/, "")
  const segments = directory
    .split("/")
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
  return segments.length === 0 ? "/" : `/${segments.join("/")}`
}

function unique(values, label) {
  const duplicates = [...new Set(values.filter((value, index) => values.indexOf(value) !== index))]
  assert.deepEqual(duplicates, [], `Duplicate ${label}: ${duplicates.join(", ")}`)
}

const pages = mapList("pages")
const verifiedEdges = mapList("verified_edges")
const systemEdges = mapList("system_edges")
const auditFlags = mapList("audit_flags")
const externalEntries = scalarList("external_entry_pages")
const inheritedExits = inheritedExitIds()
const pageIds = new Set(pages.map((page) => page.id))

test("product page registry covers every App Router page exactly once", () => {
  const declaredCount = Number(registryText.match(/\n  ui_pages: (\d+)/)?.[1])
  assert.equal(pages.length, declaredCount, "scope.ui_pages must match registry page count")

  unique(
    pages.map((page) => page.id),
    "page ids",
  )
  unique(
    pages.map((page) => page.route),
    "routes",
  )
  unique(
    pages.map((page) => page.file),
    "page files",
  )

  const discovered = walkPages(APP_DIR).sort()
  const registered = pages.map((page) => page.file).sort()
  assert.deepEqual(
    registered,
    discovered,
    "PAGE_REGISTRY.yaml drift: add/remove the page and assign a stable page id in the same change",
  )
})

test("registered routes are derived from their actual App Router files", () => {
  const mismatches = pages
    .map((page) => ({ id: page.id, declared: page.route, derived: routeFromFile(page.file) }))
    .filter((page) => page.declared !== page.derived)

  assert.deepEqual(mismatches, [], "Route/file mismatch in PAGE_REGISTRY.yaml")
})

test("navigation graph references only registered pages", () => {
  for (const edge of verifiedEdges) {
    assert.ok(pageIds.has(edge.from), `verified edge source is not registered: ${edge.from}`)
    assert.ok(pageIds.has(edge.to), `verified edge target is not registered: ${edge.to}`)
  }

  const symbolicSystemSources = new Set(["any_protected", "any_member_route"])
  for (const edge of systemEdges) {
    assert.ok(
      pageIds.has(edge.from) || symbolicSystemSources.has(edge.from),
      `system edge source is not registered/allowed: ${edge.from}`,
    )
    assert.ok(pageIds.has(edge.to), `system edge target is not registered: ${edge.to}`)
  }

  for (const id of externalEntries) {
    assert.ok(pageIds.has(id), `external entry page is not registered: ${id}`)
  }

  for (const id of inheritedExits) {
    assert.ok(pageIds.has(id), `navigation profile exit is not registered: ${id}`)
  }
})

test("navigation exceptions stay explicit and dead controls cannot be accepted as baseline", () => {
  const flaggedPages = new Set(auditFlags.map((flag) => flag.page))
  for (const page of pages.filter((page) => page.inbound_status)) {
    assert.ok(
      flaggedPages.has(page.id),
      `${page.id} has inbound_status=${page.inbound_status} without a matching audit flag`,
    )
  }

  for (const flag of auditFlags) {
    assert.ok(pageIds.has(flag.page), `audit flag ${flag.id} points to unknown page ${flag.page}`)
  }

  const blocking = auditFlags.filter(
    (flag) => flag.type === "dead_control" && flag.status === "confirmed_static",
  )
  assert.deepEqual(
    blocking,
    [],
    `Confirmed dead controls must be fixed before the map can pass: ${blocking.map((flag) => flag.id).join(", ")}`,
  )
})
