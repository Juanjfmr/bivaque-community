import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const read = (...segments) => readFileSync(join(root, ...segments), "utf8")

// PORT-002 (lote 4 da entrada): os tokens da marca deixaram de ser exclusivos da
// landing. O bloco que estava em `.ld` passou para `.bv-skin`, a classe que toda
// tela portada carrega; a landing aplica as duas no mesmo elemento. A mudança é
// de escopo, não de valor: os pares claro e escuro continuam os mesmos da R70, e
// a comparação de captura (scripts/port/compare-landing.mjs) é a prova visual.
const tokens = read("apps", "web", "app", "brand-tokens.css")
const landing = read("apps", "web", "app", "landing", "landing.tsx")
const shell = read("apps", "web", "app", "components", "entry", "entry-shell.tsx")

test("os tokens vivem numa classe reutilizável, não na raiz da landing", () => {
  assert.match(tokens, /^\.bv-skin \{/m)
  assert.doesNotMatch(tokens, /^\.ld \{/m)
  assert.match(tokens, /@media \(prefers-color-scheme: dark\) \{\s*\.bv-skin \{/)
})

test("a landing carrega a classe reutilizável junto com a dela", () => {
  assert.match(landing, /className=\{`ld bv-skin \$\{notoSans\.variable\}/)
})

test("a casca da entrada usa a mesma classe", () => {
  assert.match(shell, /`bv-skin bv-entry/)
})

test("os valores dos dois temas continuam os da R70", () => {
  // Superfícies e a Brasa, que são as cores que a comparação de captura mede.
  const light = tokens.slice(0, tokens.indexOf("@media"))
  const dark = tokens.slice(tokens.indexOf("@media"))

  assert.match(light, /--md-sys-color-surface: rgb\(242 240 235\)/)
  assert.match(light, /--md-sys-color-on-surface: rgb\(37 48 51\)/)
  assert.match(light, /--bv-brasa: rgb\(184 74 58\)/)

  assert.match(dark, /--md-sys-color-surface: rgb\(23 30 32\)/)
  assert.match(dark, /--md-sys-color-on-surface: rgb\(236 234 228\)/)
  assert.match(dark, /--bv-brasa: rgb\(224 122 90\)/)
})

test("o CTA em Brasa continua preso à landing", () => {
  // A entrada usa o preenchido do Material (primary), como o protótipo. Se a
  // regra perdesse o `.ld`, todo botão preenchido da entrada ficaria Brasa.
  assert.match(tokens, /\.ld md-filled-button \{/)
})
