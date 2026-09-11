import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

const SUPPORT_LIB = join(root, "apps", "web", "lib", "support.ts")
const ENV_EXAMPLE = join(root, "apps", "web", ".env.example")
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

test("the only fallback is the sentinel, never a real address", () => {
  // Given the support lib
  const content = readFileSync(SUPPORT_LIB, "utf8")

  // Then the env var resolves to the sentinel when unset. A committed personal
  // address here is exactly the leak this guard exists to prevent: the constant
  // is NEXT_PUBLIC_, so whatever it holds ships inside the browser bundle.
  assert.match(
    content,
    /SUPPORT_EMAIL\s*=\s*process\.env\["NEXT_PUBLIC_SUPPORT_EMAIL"\]\s*\?\?\s*"<<DEFINIR>>"/,
    "o fallback de SUPPORT_EMAIL precisa ser o sentinela <<DEFINIR>> — " +
      "um endereço real hardcoded aqui vaza no bundle público",
  )
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

test("the .env.example documents the channel with a placeholder, not an address", () => {
  // Given the example environment file
  const content = readFileSync(ENV_EXAMPLE, "utf8")
  const line = content.split(/\r?\n/).find((entry) => entry.startsWith(`${ENV_VAR}=`))

  // Then the channel is documented
  assert.ok(line, `${ENV_VAR} precisa estar documentado no .env.example`)

  // And the committed value is a placeholder, never a real mailbox
  const value = (line.split("=")[1] ?? "").replaceAll('"', "").trim()
  assert.match(
    value,
    /^<.+>$/,
    `o .env.example deve trazer placeholder para ${ENV_VAR}, não um endereço real (recebido: ${value})`,
  )
})
