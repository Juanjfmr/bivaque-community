import { execFileSync } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { runInNewContext } from "node:vm"
import { expect, it, vi } from "vitest"

it("prepara a entrada nativa sem redirecionamento e preserva rotas existentes", () => {
  const raiz = mkdtempSync(join(tmpdir(), "bivaque-nativo-"))
  try {
    mkdirSync(join(raiz, "dist"))
    mkdirSync(join(raiz, "scripts"))
    writeFileSync(join(raiz, "dist", "index.html"), "<html><head></head><body>app</body></html>")
    copyFileSync(
      resolve("scripts/preparar-nativo.mjs"),
      join(raiz, "scripts", "preparar-nativo.mjs"),
    )
    execFileSync(process.execPath, [join(raiz, "scripts", "preparar-nativo.mjs")])
    const html = readFileSync(join(raiz, "dist-nativo", "index.html"), "utf8")
    const script = html.match(/<script>(.*?)<\/script>/)?.[1]
    expect(script).toBeDefined()
    const replaceState = vi.fn()
    runInNewContext(script ?? "", { location: { pathname: "/" }, history: { replaceState } })
    expect(replaceState).toHaveBeenCalledWith(null, "", "/app/")
    replaceState.mockClear()
    runInNewContext(script ?? "", {
      location: { pathname: "/app/entrar" },
      history: { replaceState },
    })
    expect(replaceState).not.toHaveBeenCalled()
    expect(html).toContain("<body>app</body>")
  } finally {
    rmSync(raiz, { recursive: true, force: true })
  }
})
