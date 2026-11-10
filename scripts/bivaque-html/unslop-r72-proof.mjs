#!/usr/bin/env node
// Verificacao dirigida e nao destrutiva do primeiro lote Unslop da R72.
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync, existsSync } from "node:fs"
import { resolve, join } from "node:path"

const root = resolve(import.meta.dirname, "../..")
const proto = join(root, "prototypes/bivaque-html")
const source = (path) => readFileSync(join(proto, "src", path), "utf8")
const manifest = JSON.parse(source("manifest.json"))
const css = source("styles/unslop-r72.css")
const baseline = readFileSync(join(proto, "reference/Bivaque_Material_Web.original.html"))
const digest = createHash("sha256").update(baseline).digest("hex")

assert.equal(digest, "29a402c4e717ab2826c2e2aa0c3da6bac7f7b2b390090ed22c5ff1f2cbb385a4", "Referencia original nao pode mudar")
assert.equal(manifest.referenceSha256, digest)
assert.equal(manifest.slots.length, 4)
assert.equal(manifest.slots[0].files.at(-1), "styles/unslop-r72.css")
assert.equal(manifest.slots[0].files.filter(x => x === "styles/unslop-r72.css").length, 1)

const home = source("features/home/desktop.js")
const community = source("features/community/views.js")
const cards = source("shell/primitives.js")
const attrs = source("features/listings/attributes.js")
const detail = source("features/listings/detail.js")
const palette = source("styles/base.css")

assert.match(home, /indica..es/)
assert.doesNotMatch(home, /avatarStack\(bizSays\(b\)/)
assert.match(community, /class="community-summary"/)
assert.doesNotMatch(community, /class="context-strip" style="margin-top:0"/)
assert.match(cards, /price-kicker/)
assert.match(cards, /itemTotal\(item\)/)
assert.match(detail, /itemTotal\(i\)/)
assert.doesNotMatch(attrs, /com condom.nio<\/p>/)
assert.match(css, /min-height:\s*44px/)
assert.match(css, /data-seg="question-filter"/)
assert.match(palette, /--bv-brasa:#B84A3A/)
assert.match(palette, /--bv-brasa:#E07A5A/)

const output = join(proto, "dist/Bivaque_Material_Web.html")
assert.ok(existsSync(output), "Execute python scripts/bivaque-html/build.py antes desta prova")
const built = readFileSync(output, "utf8")
assert.match(built, /price-kicker/)
assert.match(built, /community-summary/)
assert.match(built, /styles.*?Unslop|Unslop/)

console.log("PASS: referencia congelada, manifesto, escopo e HTML de revisao")
