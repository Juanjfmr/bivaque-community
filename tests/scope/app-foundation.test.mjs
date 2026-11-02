import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "../..")
const read = (path) => readFileSync(join(root, path), "utf8")

test("a SPA tem dependências fixas, sem cn externo, e preview na porta contratada", () => {
  const app = JSON.parse(read("apps/app/package.json"))
  const releases = JSON.parse(read("docs/agents/prototipo-shadcn/versoes-1a.json"))
  for (const [name, version] of Object.entries({ ...app.dependencies, ...app.devDependencies })) {
    assert.match(version, /^\d+\.\d+\.\d+$/)
    const release = releases.find((item) => item.package === name && item.version === version)
    assert.ok(release, `Publicação não documentada: ${name}@${version}`)
    assert.ok(Date.parse(release.publishedAt) <= Date.parse("2026-10-11T00:00:00Z"))
  }
  assert.equal(app.dependencies.react, "19.1.0")
  assert.equal(app.dependencies.cn, undefined)
  assert.match(app.scripts.preview, /3200/)
  assert.match(read("apps/app/vite.config.ts"), /base: "\/app\/"/)
  assert.equal(JSON.parse(read("apps/app/components.json")).rsc, false)
})

test("build raiz e gate incluem app sem depender do arquivo de ambiente web", () => {
  const scripts = JSON.parse(read("package.json")).scripts
  assert.match(scripts.build, /@bivaque\/app build/)
  assert.match(read("scripts/gate.mjs"), /NEXT_PUBLIC_SUPABASE_URL/)
  assert.match(read("scripts/gate.mjs"), /name: "build:app"/)
})
