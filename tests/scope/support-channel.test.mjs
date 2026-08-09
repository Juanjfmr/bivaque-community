import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

const SUPPORT_LIB = join(root, "apps", "web", "lib", "support.ts")
const PLACEHOLDER = "<<DEFINIR>>"
const ENV_VAR = "NEXT_PUBLIC_SUPPORT_EMAIL"

test("the support channel is declared in lib/support.ts", () => {
  // Given the support lib
  // When its content is read
  const content = readFileSync(SUPPORT_LIB, "utf8")

  // Then the channel constant is declared
  assert.match(content, /export const SUPPORT_EMAIL/)
  assert.match(content, /export const SUPPORT_SLA_HOURS/)
})

test("the placeholder never ships when the env var is unset in production", () => {
  // Given the support lib content and the current environment
  const content = readFileSync(SUPPORT_LIB, "utf8")
  const placeholderPresent = content.includes(PLACEHOLDER)
  const envVarSet = Boolean(process.env[ENV_VAR])

  // When production and no address is configured
  const isProduction = process.env["NODE_ENV"] === "production"
  const brokenInProduction = placeholderPresent && !envVarSet && isProduction

  // Then the build is blocked with an explicit message
  assert.equal(
    brokenInProduction,
    false,
    `Canal de suporte não configurado. Defina ${ENV_VAR} antes de ` +
      "operar o piloto — PILOT_RUNBOOK §6 pressupõe esse canal e as telas de " +
      "pendente/waitlist o exibem.",
  )
})
