import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const ROUTE = join(root, "apps", "web", "app", "api", "admin", "rls-health", "route.ts")
const LIB = join(root, "apps", "web", "lib", "rls-probe.ts")
const ENV_EXAMPLE = join(root, "apps", "web", ".env.example")

test("the RLS probe route handler exists at the canonical path", () => {
  // Given the route handler location
  // When its presence is asserted
  // Then the file exists on disk
  assert.equal(existsSync(ROUTE), true)
})

test("the RLS probe lib exists and exports the documented surface", () => {
  // Given the lib location
  // When its content is read
  const content = readFileSync(LIB, "utf8")

  // Then the classifier, the runner and the check-id type are all declared
  assert.match(content, /export function classifyRlsProbe/)
  assert.match(content, /export async function runRlsProbe/)
  assert.match(content, /export type RlsCheckId/)
})

test("the route handler never imports the service-role key directly", () => {
  // Given the route handler
  // When its content is read
  const content = readFileSync(ROUTE, "utf8")

  // Then it must not reference the service-role env var — the gate uses
  // `is_current_user_operator` (which itself uses service_role server-side)
  // but the assertions must run with a common user token, never with the
  // server's service-role key.
  assert.equal(
    content.includes("SERVICE_ROLE_KEY"),
    false,
    "the probe route must not import SERVICE_ROLE_KEY directly",
  )
})

test("the probe env vars are declared in .env.example", () => {
  // Given the env example file
  // When its content is read
  const content = readFileSync(ENV_EXAMPLE, "utf8")

  // Then both vars are present so the operator knows where to set them
  assert.match(content, /RLS_PROBE_EMAIL/)
  assert.match(content, /RLS_PROBE_PASSWORD/)
})

test("the lib does not echo any row contents in its response", () => {
  // Given the lib source
  // When scanned for shapes that would leak row data
  const content = readFileSync(LIB, "utf8")

  // Then it does not include any `select *` pattern that would make the
  // runner forward raw columns to the response. The lib only forwards the
  // boolean `pass` plus a short fixed `detail`.
  assert.equal(
    /\bselect\s*\*\b/i.test(content),
    false,
    "the lib must not issue unconstrained SELECT * in the response path",
  )
})
