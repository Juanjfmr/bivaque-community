import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const proxy = readFileSync(join(root, "apps", "web", "proxy.ts"), "utf8")

// PORT-002 (lote 4 da entrada), ADR-20261022-entrada-do-prototipo:
// - item 6: depois de apagar a conta a pessoa vai para /conta-apagada, sem
//   sessão;
// - item 2: o convite de familiar por código é público, porque quem chega por
//   ele ainda não tem conta.
// A Ajuda pública (item 7) é outra frente e continua exigindo sessão; se alguém
// a colocar nesta lista "de passagem", este teste falha.
function publicPaths() {
  const block = /const PUBLIC_PATHS = \[([\s\S]*?)\]/.exec(proxy)?.[1]
  assert.ok(block, "PUBLIC_PATHS precisa continuar declarada em apps/web/proxy.ts")
  return [...block.matchAll(/"([^"]+)"/g)].flatMap((match) => (match[1] ? [match[1]] : []))
}

// A mesma comparação que o proxy usa: prefixo do caminho.
const isPublic = (pathname) => publicPaths().some((path) => pathname.startsWith(path))

test("a conta apagada é pública sem sessão", () => {
  assert.equal(isPublic("/conta-apagada"), true)
})

test("o convite de familiar é público sem sessão", () => {
  assert.equal(isPublic("/convite"), true)
  assert.equal(isPublic("/convite/ABCD1234"), true)
})

test("a Ajuda continua atrás do portão de sessão", () => {
  assert.equal(isPublic("/ajuda"), false)
  assert.equal(publicPaths().includes("/ajuda"), false)
})

test("as rotas novas citam o ADR da entrada", () => {
  assert.match(proxy, /ADR-20261022-entrada-do-prototipo/)
})
