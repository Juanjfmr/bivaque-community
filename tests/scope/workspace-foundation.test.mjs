import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"))

test("creates the approved web, mobile and shared workspace roots", () => {
  const requiredPaths = [
    "apps/web",
    "apps/mobile",
    "packages/contracts",
    "packages/domain",
    "packages/tokens",
  ]

  const pathStates = requiredPaths.map((path) => existsSync(join(root, path)))

  assert.deepEqual(pathStates, [true, true, true, true, true])
})

test("defines the mobile foundation as Expo Router with shared Bivaque tokens", () => {
  const mobilePackage = readJson("apps/mobile/package.json")
  const entryScreen = readFileSync(join(root, "apps/mobile/app/index.tsx"), "utf8")

  assert.equal(mobilePackage.main, "expo-router/entry")
  assert.equal(typeof mobilePackage.dependencies.expo, "string")
  assert.equal(typeof mobilePackage.dependencies["expo-router"], "string")
  assert.equal(mobilePackage.dependencies["@bivaque/tokens"], "workspace:*")
  assert.equal(existsSync(join(root, "apps/mobile/app/login.tsx")), true)
  assert.equal(existsSync(join(root, "apps/mobile/app/signup.tsx")), true)
  assert.match(entryScreen, /router\.push\("\/login"\)/)
  assert.match(entryScreen, /router\.push\("\/signup"\)/)
})

test("exposes the minimal root quality commands", () => {
  const rootPackage = readJson("package.json")
  const scripts = rootPackage.scripts

  assert.equal(typeof scripts.lint, "string")
  assert.equal(typeof scripts.typecheck, "string")
  assert.equal(typeof scripts.test, "string")
  assert.equal(typeof scripts["test:unit"], "string")
  assert.equal(typeof scripts["test:scope"], "string")
})

test("keeps the Next application on the server runtime", () => {
  const nextConfig = readFileSync(join(root, "apps/web/next.config.ts"), "utf8")
  const smokeRoute = readFileSync(join(root, "apps/web/app/api/health/route.ts"), "utf8")
  const enablesStaticExport = /output\s*:\s*["']export["']/.test(nextConfig)

  assert.equal(enablesStaticExport, false)
  assert.match(smokeRoute, /runtime\s*=\s*["']nodejs["']/)
})

test("uses HeroUI as the only web component library", () => {
  const webPackage = readJson("apps/web/package.json")
  const dependencies = Object.keys(webPackage.dependencies)
  const prohibitedPackages = ["@radix-ui/", "@headlessui/", "@chakra-ui/", "shadcn"]
  const prohibitedDependency = dependencies.find((dependency) =>
    prohibitedPackages.some((prefix) => dependency.includes(prefix)),
  )

  assert.equal(dependencies.includes("@heroui/react"), true)
  assert.equal(dependencies.includes("@heroui/styles"), true)
  assert.equal(prohibitedDependency, undefined)
})
