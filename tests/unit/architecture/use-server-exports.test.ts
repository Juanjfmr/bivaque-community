import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Um arquivo "use server" só pode exportar funções assíncronas (tipos somem na
// compilação). Exportar uma constante passa no typecheck e nos testes unitários
// e só quebra no `next build` — que nem sempre roda antes do commit. Esta
// varredura pega o erro no gate.

const appRoot = join(process.cwd(), "apps", "web")

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

const serverFiles = [...walk(join(appRoot, "app")), ...walk(join(appRoot, "lib"))].filter((file) =>
  /^\s*["']use server["']/.test(readFileSync(file, "utf8")),
)

const ALLOWED_EXPORT_LINE = [
  /^export\s+(type|interface)\s/,
  /^export\s+async\s+function\s/,
  /^export\s+default\s+async\s+function\s/,
  /^export\s*\{/,
]

describe('arquivos "use server" exportam só funções assíncronas', () => {
  it("encontra os arquivos de Server Actions", () => {
    expect(serverFiles.length).toBeGreaterThan(5)
  })

  it.each(serverFiles.map((file) => [file.slice(appRoot.length + 1), file]))(
    "%s",
    (_label, file) => {
      const source = readFileSync(file, "utf8")
      const offenders = source
        .split("\n")
        .filter((line) => /^export\s/.test(line))
        .filter((line) => !ALLOWED_EXPORT_LINE.some((pattern) => pattern.test(line)))
      expect(offenders).toEqual([])

      // `export { a, b }`: cada nome precisa ser uma async function do arquivo.
      const asyncNames = new Set(
        [...source.matchAll(/async\s+function\s+([A-Za-z0-9_]+)/g)].map((match) => match[1]),
      )
      const listed = [...source.matchAll(/^export\s*\{([^}]*)\}/gm)].flatMap((match) =>
        (match[1] ?? "")
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name.length > 0 && !name.startsWith("type ")),
      )
      expect(listed.filter((name) => !asyncNames.has(name))).toEqual([])
    },
  )
})
