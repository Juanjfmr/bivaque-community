import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// RUN-004 rodada 2, item 2: o disjuntor global do limitador (500/h) precisa
// ficar abaixo do orçamento de e-mail do GoTrue e do limite de sign-in/sign-up.
// O `signInWithOtp` sai do servidor, então o limite por IP do GoTrue vira um
// limite global da rota; se ele ficar abaixo do disjuntor, o GoTrue corta antes
// e uma pessoa com poucos IPs trava a entrada de todos.

const root = join(import.meta.dirname, "../..")
const read = (path) => readFileSync(join(root, path), "utf8")

function limiteDoConfig(nome) {
  const config = read("supabase/config.toml")
  const bloco = config.slice(config.indexOf("[auth.rate_limit]"))
  const achado = new RegExp(`^${nome}\\s*=\\s*(\\d+)\\s*$`, "m").exec(bloco)
  assert.ok(achado, `supabase/config.toml não define ${nome} em [auth.rate_limit]`)
  return Number(achado[1])
}

function defaultDaMigration(parametro) {
  const dir = join(root, "supabase/migrations")
  const arquivos = readdirSync(dir)
    .filter((nome) => nome.endsWith(".sql"))
    .sort()
  let valor = null
  for (const arquivo of arquivos) {
    const sql = readFileSync(join(dir, arquivo), "utf8")
    for (const achado of sql.matchAll(new RegExp(`${parametro} integer default (\\d+)`, "gi"))) {
      valor = Number(achado[1])
    }
  }
  assert.ok(valor !== null, `nenhuma migration define o padrão de ${parametro}`)
  return valor
}

test("o disjuntor global fica abaixo do orçamento de e-mail e de sign-in do GoTrue", () => {
  const global = defaultDaMigration("p_global_hourly")
  const email = limiteDoConfig("email_sent")
  const signIn = limiteDoConfig("sign_in_sign_ups")

  assert.ok(
    email > global,
    `email_sent (${email}) precisa ficar acima do disjuntor global (${global})`,
  )
  assert.ok(
    signIn > global,
    `sign_in_sign_ups (${signIn}) precisa ficar acima do disjuntor global (${global})`,
  )
})

test("o disjuntor é alto e o teto por IP fica na faixa de 5 a 10", () => {
  const global = defaultDaMigration("p_global_hourly")
  const ip = defaultDaMigration("p_ip_hourly")
  assert.ok(global >= 100, `o global (${global}) precisa ser disjuntor, não cota de uma pessoa`)
  assert.ok(ip >= 5 && ip <= 10, `o teto por IP (${ip}) precisa ficar entre 5 e 10`)
})
