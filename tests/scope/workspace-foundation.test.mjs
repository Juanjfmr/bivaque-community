import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"))

test("creates the approved workspace roots", () => {
  // Given the approved workspace layout
  const requiredPaths = ["apps/web", "packages/contracts", "packages/domain", "packages/tokens"]

  // When the repository foundation is inspected
  const pathStates = requiredPaths.map((path) => existsSync(join(root, path)))
  const appRoots = readdirSync(join(root, "apps"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  // Then the existing workspace roots are present. apps/mobile is an approved,
  // optional React Native + Expo root. apps/prototipo is the shadcn/ui prototype
  // approved by the owner on 2026-10-24 (interface only, demo data). No arbitrary
  // other application is allowed.
  assert.deepEqual(pathStates, [true, true, true, true])
  assert.deepEqual(
    appRoots.filter((appRoot) => !["app", "mobile", "prototipo", "web"].includes(appRoot)),
    [],
  )
  assert.equal(appRoots.includes("web"), true)
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

  // Os testes DOS WORKSPACES entram pelo gate por este passo. Sem ele, as 76
  // asercoes do apps/mobile e as 19 do apps/web ficavam escritas e nunca
  // executadas: test:unit so varre tests/unit na raiz. A assercao existe para
  // o passo nao sumir em silencio numa limpeza de scripts.
  assert.equal(typeof scripts["test:workspaces"], "string")
  assert.match(scripts.test, /test:workspaces/)
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

test("keeps the component library surface to HeroUI and Material Web during the migration", () => {
  // Given the web package dependencies
  const webPackage = readJson("apps/web/package.json")
  const dependencies = Object.keys(webPackage.dependencies)
  const prohibitedPackages = ["@radix-ui/", "@headlessui/", "@chakra-ui/", "shadcn"]

  // When component dependencies are classified
  const prohibitedDependency = dependencies.find((dependency) =>
    prohibitedPackages.some((prefix) => dependency.includes(prefix)),
  )

  // Then HeroUI continua sendo a biblioteca das telas ainda não portadas e o
  // Material Web entra como a segunda e única outra, na versão exata do
  // protótipo. ADR-20261022-porte-visual-material-web, item 4: durante a
  // migração tela a tela o contrato aceita exatamente essas duas; quando a
  // última tela for portada, ele volta a exigir uma só.
  assert.equal(dependencies.includes("@heroui/react"), true)
  assert.equal(dependencies.includes("@heroui/styles"), true)
  assert.equal(prohibitedDependency, undefined)
  assert.equal(dependencies.includes("@material/web"), true)
  assert.equal(webPackage.dependencies["@material/web"], "2.5.0")
})
