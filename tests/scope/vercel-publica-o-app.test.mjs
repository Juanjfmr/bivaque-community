import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

// SEC-007: o app é servido em /app pelo mesmo domínio (SPA ADR §8), e o Next só
// serve o que está em apps/web/public/app. Com `buildCommand` construindo só o
// web, o deploy subia sem o app: /app dava 404. O comando da Vercel precisa
// construir o app, exportá-lo para o public do web e só então construir o web.
// O projeto da Vercel do web tem Root Directory em apps/web: lá vale o
// apps/web/vercel.json, que precisa subir à raiz antes de construir. O da raiz
// fica alinhado para um projeto apontado à raiz do monorepo.
for (const arquivo of ["vercel.json", join("apps", "web", "vercel.json")]) {
  test(`${arquivo}: o buildCommand constrói o app, exporta para o web e constrói o web`, () => {
    const vercel = JSON.parse(readFileSync(join(root, arquivo), "utf8"))
    const passos = String(vercel.buildCommand)
      .split("&&")
      .map((passo) => passo.trim())
      .filter((passo) => passo !== "cd ../..")

    const app = passos.findIndex((passo) => /--filter @bivaque\/app build$/.test(passo))
    const exportar = passos.findIndex((passo) =>
      /^node scripts\/export-app-to-web\.mjs$/.test(passo),
    )
    const web = passos.findIndex((passo) => /--filter web build$/.test(passo))

    assert.ok(app >= 0, "falta construir o app")
    assert.ok(exportar > app, "a exportação vem depois do build do app")
    assert.ok(web > exportar, "o build do web vem depois da exportação")
  })
}

test("o script de exportação escreve onde o Next serve o app", () => {
  const script = readFileSync(join(root, "scripts", "export-app-to-web.mjs"), "utf8")
  assert.match(script, /join\("apps", "web", "public", "app"\)/)
})
