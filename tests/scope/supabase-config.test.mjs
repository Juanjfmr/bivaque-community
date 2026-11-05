import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

test("uses the Supabase CLI 2.107 mail testing table", () => {
  // Given the local Supabase config parsed by the pinned CLI
  const config = readFileSync(join(root, "supabase/config.toml"), "utf8")

  // When mail testing table names are inspected
  const usesInbucket = /^\[inbucket\]$/m.test(config)
  const usesLocalSmtp = /^\[local_smtp\]$/m.test(config)

  // Then the config uses the table accepted by Supabase CLI 2.107.0
  assert.equal(usesInbucket, true)
  assert.equal(usesLocalSmtp, false)
})

test("the Data API never exposes the private schema", () => {
  // Given the local Supabase config
  const config = readFileSync(join(root, "supabase", "config.toml"), "utf8")

  // When the schemas PostgREST is allowed to resolve are read
  const match = /^\s*schemas\s*=\s*\[(.*?)\]/m.exec(config)
  assert.ok(match, "supabase/config.toml precisa declarar api.schemas")

  const exposed = (match[1].match(/"[^"]+"/g) ?? []).map((entry) => entry.replaceAll('"', ""))

  // Then private is not among them.
  //
  // This is load-bearing, not cosmetic: several helpers that RLS policies
  // evaluate live in private and are executable by authenticated (the policy
  // role), because PostgreSQL checks EXECUTE at evaluation time. They are only
  // safe while the Data API cannot name them — the leak measured on 10/09
  // (GET /rest/v1/profiles?select=user_id,is_suspended) was reachable precisely
  // because the sensitive read sat in an exposed schema.
  assert.deepEqual(exposed, ["public", "graphql_public"])
})

// SEC-007 (ADR-20261101 §2): reenvio de 60 s, limites do GoTrue explícitos e o
// código (não o link) também no e-mail de confirmação de cadastro, que é o que o
// GoTrue manda para conta nova em `signInWithOtp`.
const config = () => readFileSync(join(root, "supabase", "config.toml"), "utf8")

test("o reenvio do código vale 60 s no GoTrue", () => {
  assert.match(config(), /^max_frequency = "60s"$/m)
})

test("os limites de autenticação por IP são explícitos", () => {
  const secao = /^\[auth\.rate_limit\]\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m.exec(config())?.[1]
  assert.ok(secao, "supabase/config.toml precisa declarar [auth.rate_limit]")
  for (const chave of ["email_sent", "token_verifications", "sign_in_sign_ups", "token_refresh"]) {
    assert.match(secao, new RegExp(`^${chave} = \\d+$`, "m"), `${chave} precisa ser explícito`)
  }
})

for (const nome of ["magic_link", "confirmation"]) {
  test(`o template ${nome} leva o código e não um link`, () => {
    const bloco = new RegExp(
      `^\\[auth\\.email\\.template\\.${nome}\\]\\n([\\s\\S]*?)(?=^\\[|$(?![\\s\\S]))`,
      "m",
    ).exec(config())?.[1]
    assert.ok(bloco, `supabase/config.toml precisa declarar o template ${nome}`)
    assert.match(bloco, /\{\{ \.Token \}\}/, "o assunto leva o código")
    const caminho = /content_path = "\.\/(.+?)"/.exec(bloco)?.[1]
    assert.ok(caminho, "o template precisa de content_path")
    const html = readFileSync(join(root, caminho), "utf8")
    assert.match(html, /\{\{ \.Token \}\}/, "o corpo leva o código")
    assert.doesNotMatch(html, /ConfirmationURL|\.SiteURL|<a\s/i, "sem link clicável")
  })
}
