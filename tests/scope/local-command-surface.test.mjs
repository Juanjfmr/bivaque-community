import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"))

test("exposes the local root command surface", () => {
  // Given the root package manifest
  const rootPackage = readJson("package.json")

  // When the local scripts are inspected
  const scripts = rootPackage.scripts

  // Then build, database, and E2E commands are available from the root
  assert.equal(scripts.build, "pnpm --filter web build")
  assert.equal(scripts["db:reset"], "supabase db reset --local")
  assert.equal(scripts["test:db"], "supabase test db")
  assert.equal(scripts["db:test"], undefined)
  assert.equal(scripts["db:lint"], "supabase db lint --local --level error")
  assert.equal(
    scripts["generate:types"],
    "supabase gen types --lang typescript --local --schema public > supabase/database.generated.ts && node scripts/normalize-generated-types.mjs",
  )
  // O lote normal EXCLUI os specs marcados @stateful, e o lote stateful roda em
  // serial. Antes disso a suíte inteira rodava num processo só e specs que
  // escrevem nas mesmas linhas (grupo privado, save da mesma conta, pedidos
  // pendentes da vila) colidiam entre si — falha intermitente que passava quando
  // o spec rodava sozinho. A tag existia num spec e não tinha consumidor; agora
  // tem, e este contrato impede que ela seja removida sem que o CI perceba.
  assert.equal(scripts["test:e2e"], "playwright test --grep-invert @stateful")
  assert.equal(scripts["test:e2e:stateful"], "playwright test --grep @stateful --workers=1")
  assert.equal(scripts["test:e2e:all"], "pnpm test:e2e && pnpm test:e2e:stateful")
})

test("pins Playwright and the local Supabase CLI", () => {
  // Given the root package manifest
  const rootPackage = readJson("package.json")

  // When dev dependencies are inspected
  const devDependencies = rootPackage.devDependencies

  // Then browser and database CLIs are reproducibly pinned
  assert.equal(devDependencies["@playwright/test"], "1.51.1")
  assert.equal(devDependencies.supabase, "2.107.0")
})

test("defines the required Playwright viewport projects", () => {
  // Given the Playwright config file
  const configPath = join(root, "playwright.config.ts")

  // When the config source is inspected
  assert.equal(existsSync(configPath), true)
  const config = readFileSync(configPath, "utf8")

  // Then the CI smoke surface has mobile, tablet, and desktop projects
  assert.match(config, /name:\s*["']mobile-375["'][\s\S]*width:\s*375/)
  assert.match(config, /name:\s*["']tablet-768["'][\s\S]*width:\s*768/)
  assert.match(config, /name:\s*["']desktop-1440["'][\s\S]*width:\s*1440/)
})
