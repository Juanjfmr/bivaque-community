// Guard-rail: todo digest sha256 que viaja para uma RPC *_digest passa por
// byteaDigestParam.
//
// O PostgREST converte argumento JSON string em bytea pela entrada
// escape-format do Postgres: um byte por caractere. Um digest hex "nu" (64
// caracteres) chega com 64 bytes e viola todo contrato octet_length = 32 —
// foi exatamente o que derrubou o convite familiar em runtime (23514 em
// family_invitations_invitee_email_digest_check, medido em 15/09/2026): a
// tela mostrava erro genérico e nenhum convite era criado. O helper
// apps/web/lib/invites-bytea.ts existe para isso; este teste impede que uma
// chamada nova esqueça o prefixo.
//
// Controle positivo e negativo: a mesma função de veredito é exercitada com
// uma linha correta e com a linha crua que causou o defeito.

import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const scanRoots = [
  path.join(repoRoot, "apps", "web", "app"),
  path.join(repoRoot, "apps", "web", "lib"),
]

function collectSourceFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full))
      continue
    }
    if (/\.(?:ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

// Um argumento de RPC cujo nome termina em _digest precisa vir embrulhado.
// A varredura olha SÓ para dentro de uma chamada .rpc(...) — declaração de tipo
// (p_token_digest: string) não é chamada e não conta.
const RPC_WINDOW = 600

function unwrappedDigestArguments(source) {
  const offenders = []
  for (const call of source.matchAll(/\.rpc\(/g)) {
    const window = source.slice(call.index, call.index + RPC_WINDOW)
    for (const match of window.matchAll(/p_[a-z_]*digest\s*:\s*([^,\n}]+)/g)) {
      const value = (match[1] ?? "").trim()
      if (!value.startsWith("byteaDigestParam(")) {
        offenders.push({ text: match[0].trim() })
      }
    }
  }
  return offenders
}

test("todo argumento *_digest de RPC é serializado por byteaDigestParam", () => {
  const offenders = []
  for (const root of scanRoots) {
    for (const file of collectSourceFiles(root)) {
      const source = readFileSync(file, "utf8")
      for (const offender of unwrappedDigestArguments(source)) {
        offenders.push(path.relative(repoRoot, file) + " — " + offender.text)
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "digest hex cru vira 64 bytes no PostgREST e viola octet_length = 32; use byteaDigestParam()",
  )
})

test("o veredito pega a linha crua e aceita a linha embrulhada (controle positivo e negativo)", () => {
  const call = (args) => 'await supabase.rpc("create_family_invitation", {\n' + args + "\n})"
  const raw = call("    p_invitee_email_digest: emailDigest,")
  const wrapped = call("    p_invitee_email_digest: byteaDigestParam(emailDigest),")
  const typeOnly = "type Args = { p_token_digest: string; p_user_id: string }"

  assert.equal(unwrappedDigestArguments(raw).length, 1, "a chamada crua tem de ser flagrada")
  assert.equal(unwrappedDigestArguments(wrapped).length, 0, "a chamada embrulhada passa")
  assert.equal(
    unwrappedDigestArguments(typeOnly).length,
    0,
    "declaração de tipo não é chamada de RPC",
  )
})
