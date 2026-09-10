import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const read = (...segments) => readFileSync(join(root, ...segments), "utf8")

// O retorno do login nativo depende de dois arquivos concordarem: o caminho que
// o app pede como destino e a lista que o GoTrue aceita. Quando divergem, o
// sintoma não é erro de compilação nem teste vermelho — é a pessoa clicando no
// link do e-mail e caindo numa página de erro do Supabase, longe do app. Este
// teste existe para que a divergência apareça aqui, e não lá.

const config = read("supabase", "config.toml")
const deepLink = read("apps", "mobile", "src", "auth", "deep-link.ts")

const callbackPath = /AUTH_CALLBACK_PATH = "([^"]+)"/.exec(deepLink)?.[1]
const scheme = JSON.parse(read("apps", "mobile", "app.json")).expo.scheme

test("the native callback path is allowed by the auth redirect list", () => {
  assert.ok(callbackPath, "AUTH_CALLBACK_PATH precisa estar declarado em deep-link.ts")
  assert.ok(scheme, "o scheme precisa estar declarado em app.json")

  const expected = `${scheme}://${callbackPath}`
  const allowList = /additional_redirect_urls = \[([\s\S]*?)\]/.exec(config)?.[1] ?? ""

  assert.ok(
    allowList.includes(`"${expected}"`),
    `supabase/config.toml precisa aceitar ${expected} em additional_redirect_urls`,
  )
})

test("the redirect list stays free of scheme wildcards", () => {
  const allowList = /additional_redirect_urls = \[([\s\S]*?)\]/.exec(config)?.[1] ?? ""

  // Um curinga no scheme do app aceitaria qualquer rota como destino de um
  // `code` de sessão. A lista é fronteira de segurança, não conveniência.
  assert.doesNotMatch(
    allowList,
    new RegExp(`"${scheme}://\\*`),
    "o destino nativo precisa ser um caminho fixo, nunca um curinga do scheme",
  )
})

test("the native client uses PKCE and never reads the session from a URL", () => {
  const client = read("apps", "mobile", "src", "auth", "client.ts")

  // PKCE é a decisão de ADR-20260901-mobile-session: sem client_secret no
  // aparelho, o verifier no secure-store é o que impede outro app de trocar um
  // code interceptado. O fluxo implícito devolveria o token na própria URL.
  assert.match(client, /flowType:\s*"pkce"/)
  assert.match(client, /detectSessionInUrl:\s*false/)
})
