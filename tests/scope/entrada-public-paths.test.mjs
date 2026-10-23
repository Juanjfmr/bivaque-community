import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const proxy = readFileSync(join(root, "apps", "web", "proxy.ts"), "utf8")

// PORT-002 (lote 4 da entrada), ADR-20261022-entrada-do-prototipo:
// - item 6: depois de apagar a conta a pessoa vai para /conta-apagada, sem
//   sessão;
// - item 2: o convite de familiar por código é público, porque quem chega por
//   ele ainda não tem conta;
// - item 7: a Ajuda também é pública (PORT-006). A tela mostra "Meus chamados"
//   quando há sessão, mas o conteúdo de ajuda não pode depender de entrar —
//   quem não consegue entrar é quem mais precisa dele.
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

test("a Ajuda é pública: quem não consegue entrar precisa das respostas", () => {
  assert.equal(isPublic("/ajuda"), true)
  assert.equal(publicPaths().includes("/ajuda"), true)
})

test("a Ajuda mora fora do grupo que exige sessão", () => {
  // O grupo (shell) tem o portão de sessão no layout e na navegação: uma
  // página pública dentro dele voltaria a exigir login.
  assert.equal(existsSync(join(root, "apps", "web", "app", "(shell)", "ajuda")), false)
  assert.equal(existsSync(join(root, "apps", "web", "app", "(public)", "ajuda", "page.tsx")), true)
})

test("as rotas novas citam o ADR da entrada", () => {
  assert.match(proxy, /ADR-20261022-entrada-do-prototipo/)
})
