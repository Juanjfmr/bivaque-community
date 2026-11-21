import { execFileSync } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { runInNewContext } from "node:vm"
import { expect, it, vi } from "vitest"

it("pula o build nativo quando as duas origens estão ausentes", () => {
  const raiz = mkdtempSync(join(tmpdir(), "bivaque-nativo-"))
  try {
    mkdirSync(join(raiz, "dist-nativo"))
    writeFileSync(join(raiz, "dist-nativo", "antigo"), "remover")
    mkdirSync(join(raiz, "scripts"))
    copyFileSync(
      resolve("scripts/preparar-nativo.mjs"),
      join(raiz, "scripts", "preparar-nativo.mjs"),
    )
    const resultado = execFileSync(process.execPath, [join(raiz, "scripts", "preparar-nativo.mjs")], {
      cwd: raiz,
      env: { ...process.env, VITE_API_BASE: "", VITE_SUPABASE_URL: "" },
      encoding: "utf8",
    })
    expect(resultado).toContain("Build nativo pulado")
    expect(() => readFileSync(join(raiz, "dist-nativo", "antigo"))).toThrow()
  } finally {
    rmSync(raiz, { recursive: true, force: true })
  }
})

it("falha se apenas uma origem está configurada", () => {
  const raiz = mkdtempSync(join(tmpdir(), "bivaque-nativo-"))
  try {
    mkdirSync(join(raiz, "scripts"))
    copyFileSync(
      resolve("scripts/preparar-nativo.mjs"),
      join(raiz, "scripts", "preparar-nativo.mjs"),
    )
    expect(() =>
      execFileSync(process.execPath, [join(raiz, "scripts", "preparar-nativo.mjs")], {
        cwd: raiz,
        env: { ...process.env, VITE_API_BASE: "https://api.example.invalid", VITE_SUPABASE_URL: "" },
        encoding: "utf8",
      }),
    ).toThrow(/Configure VITE_SUPABASE_URL com uma URL absoluta para o build nativo/)
  } finally {
    rmSync(raiz, { recursive: true, force: true })
  }
})

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
    execFileSync(process.execPath, [join(raiz, "scripts", "preparar-nativo.mjs")], {
      env: {
        ...process.env,
        VITE_API_BASE: "https://api.example.invalid",
        VITE_SUPABASE_URL: "https://storage.example.invalid",
      },
    })
    const html = readFileSync(join(raiz, "dist-nativo", "index.html"), "utf8")
    const script = readFileSync(join(raiz, "dist-nativo", "raiz.js"), "utf8")
    expect(html).toContain(
      `content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://api.example.invalid https://storage.example.invalid; img-src 'self' data: blob: https://api.example.invalid https://storage.example.invalid; object-src 'none'; base-uri 'none'; frame-src 'none'"`,
    )
    expect(html).not.toMatch(/<script(?:\s[^>]*)?>\s*[^<\s]/)
    expect(html).not.toContain("unsafe-eval")
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
