import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"))

test("creates only the approved workspace roots", () => {
  // Given the approved workspace layout
  const requiredPaths = ["apps/web", "packages/contracts", "packages/domain", "packages/tokens"]

  // When the repository foundation is inspected
  const pathStates = requiredPaths.map((path) => existsSync(join(root, path)))

  // Then every approved path exists and no mobile app is present
  assert.deepEqual(pathStates, [true, true, true, true])
  assert.equal(existsSync(join(root, "apps/mobile")), false)
})

test("exposes the minimal root quality commands", () => {
  // Given the root package manifest
  const rootPackage = readJson("package.json")

  // When its scripts are read
  const scripts = rootPackage.scripts

  // Then the later CI surface already has the required entry points
  assert.equal(typeof scripts.lint, "string")
  assert.equal(typeof scripts.typecheck, "string")
  assert.equal(typeof scripts.test, "string")
  assert.equal(typeof scripts["test:unit"], "string")
  assert.equal(typeof scripts["test:scope"], "string")
})

test("keeps the Next application on the server runtime", () => {
  // Given the web application configuration and smoke route
  const nextConfig = readFileSync(join(root, "apps/web/next.config.ts"), "utf8")
  const smokeRoute = readFileSync(join(root, "apps/web/app/api/health/route.ts"), "utf8")

  // When runtime settings are inspected
  const enablesStaticExport = /output\s*:\s*["']export["']/.test(nextConfig)

  // Then static export is absent and the route explicitly uses Node.js
  assert.equal(enablesStaticExport, false)
  assert.match(smokeRoute, /runtime\s*=\s*["']nodejs["']/)
})

test("uses HeroUI as the only component library", () => {
  // Given the web package dependencies
  const webPackage = readJson("apps/web/package.json")
  const dependencies = Object.keys(webPackage.dependencies)
  const prohibitedPackages = ["@radix-ui/", "@headlessui/", "@chakra-ui/", "shadcn"]

  // When component dependencies are classified
  const prohibitedDependency = dependencies.find((dependency) =>
    prohibitedPackages.some((prefix) => dependency.includes(prefix)),
  )

  // Then direct HeroUI packages are present without a second component library
  assert.equal(dependencies.includes("@heroui/react"), true)
  assert.equal(dependencies.includes("@heroui/styles"), true)
  assert.equal(prohibitedDependency, undefined)
})
