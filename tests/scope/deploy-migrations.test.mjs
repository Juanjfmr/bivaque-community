import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

test("production migrations run from CI only, after the gate", () => {
  // Given the deployment workflow
  const workflowPath = join(root, ".github", "workflows", "deploy-migrations.yml")

  // When it exists and its structure is read
  assert.equal(existsSync(workflowPath), true)
  const workflow = readFileSync(workflowPath, "utf8")

  // Then it targets main, has a separate production job that depends on gate,
  // and pushes through the Supabase CLI using repository secrets.
  assert.match(workflow, /on:\s*\n\s*push:\s*\n\s*branches:\s*\n\s*- main/)
  assert.match(workflow, /migrate:\s*[\s\S]*needs:\s*gate/)
  assert.match(workflow, /environment:\s*production/)
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN:\s*\${{ secrets\.SUPABASE_ACCESS_TOKEN }}/)
  assert.match(workflow, /pnpm exec supabase db push/)
})

test("no local command surface pushes or links to production", () => {
  // Given the root package manifest
  const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
  const scripts = Object.values(rootPackage.scripts)

  // When scripts are inspected for production database handles
  const productionSurface = scripts.filter(
    (script) => typeof script === "string" && /supabase (db )?(push|link)|--linked/.test(script),
  )

  // Then production remains reachable only through the CI workflow
  assert.deepEqual(productionSurface, [])
  assert.equal(rootPackage.scripts["db:reset"], "supabase db reset --local")
})
