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

  // Then it targets the producao branch only (a merge on main integrates, it does not publish),
  // has a separate production job that depends on gate, and pushes through the Supabase CLI.
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- producao\s*\n/)
  assert.doesNotMatch(workflow, /branches:\s*\n\s*- main/)
  assert.match(workflow, /migrate:\s*[\s\S]*needs:\s*gate/)
  assert.match(workflow, /environment:\s*production/)
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN:\s*\${{ secrets\.SUPABASE_ACCESS_TOKEN }}/)
  // --include-all é obrigatório: há migração fora de ordem entre as pendentes.
  assert.match(workflow, /pnpm exec supabase db push --include-all/)
})

test("a merge on main never deploys the site", () => {
  // Given the Vercel configuration at the repository root and at the project's Root Directory
  // (apps/web), which is where Vercel reads it from
  for (const file of ["vercel.json", join("apps", "web", "vercel.json")]) {
    const vercel = JSON.parse(readFileSync(join(root, file), "utf8"))

    // Then pushes to main do not create deployments; production follows the producao branch
    assert.equal(vercel.git?.deploymentEnabled?.main, false, file)
  }
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
