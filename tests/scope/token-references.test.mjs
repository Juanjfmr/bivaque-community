import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (entry === "node_modules" || entry === ".next") return []
    if (statSync(path).isDirectory()) return walk(path)
    return path.endsWith(".tsx") || path.endsWith(".ts") || path.endsWith(".css") ? [path] : []
  })

// Um `var(--x)` cujo `--x` ninguém define não falha alto: no CSS a propriedade
// vira guaranteed-invalid e o elemento herda outra coisa; num SVG, fill/stroke
// inválidos herdam do <svg> raiz. O resultado é um botão que some, uma seção que
// perde o fundo, uma marca decorativa que fica invisível — sempre em silêncio, e
// sempre depois de alguém renomear um token.
//
// Aconteceu de verdade ao trocar a paleta "Papel & Mata" pela identidade oficial:
// oito referências ficaram órfãs em cinco arquivos (--forest-deep, --gold,
// --signal). Três eu achei na captura, duas um revisor achou, e as outras três só
// apareceram quando fui contar. Nenhuma quebrou build, lint ou typecheck.
test("every var(--token) referenced by the app resolves to a declared token", () => {
  // Given every source file under apps/web
  const sources = walk(join(root, "apps/web")).map((path) => ({
    path,
    text: readFileSync(path, "utf8"),
  }))

  // And the set of custom properties actually declared anywhere in the app,
  // plus the ones next/font injects and the ones HeroUI's theme layer owns.
  const declared = new Set([
    // next/font expõe estas via className no <html>, não por declaração CSS nossa.
    "--font-noto-serif",
    "--font-noto-sans",
  ])
  for (const { text } of sources) {
    for (const match of text.matchAll(/(--[a-z0-9-]+)\s*:/gi)) {
      declared.add(match[1])
    }
  }

  // When every var() reference is collected
  const orphans = []
  for (const { path, text } of sources) {
    for (const match of text.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
      const token = match[1]
      // Tokens do HeroUI e do Tailwind vêm de fora do nosso código-fonte.
      if (token.startsWith("--heroui") || token.startsWith("--tw-")) continue
      if (!declared.has(token)) {
        orphans.push(`${path.slice(root.length + 1)} → ${token}`)
      }
    }
  }

  // Then none of them points at a token nobody declares
  assert.deepEqual(orphans, [])
})
