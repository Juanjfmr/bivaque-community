#!/usr/bin/env node
// prova-sequencia.mjs — as provas que precisam do banco local num estado
// conhecido, de ponta a ponta, sob uma única vez na fila.
//
// Por que existe: a fila (`prova-fila.mjs`) trava um comando por vez. Resetar e
// depois rodar o pgTAP são dois comandos; entre eles, outra frente pode resetar
// o banco com as migrations dela, e o pgTAP desta roda no esquema da outra
// (visto no lote 5, 23/10/2026). Aqui a sequência inteira é um comando só,
// para ser chamado DENTRO da fila:
//
//   node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs banco
//   node scripts/agents/prova-fila.mjs -- node scripts/agents/prova-sequencia.mjs e2e tests/e2e/a.spec.ts ...
//
// `banco`: reset sem seed e pgTAP (`test:db`).
// `e2e`: reset com seed e Playwright nos specs dados, com as variáveis do banco
// local lidas de `supabase status` (nunca de `apps/web/.env.local`). O build do
// Next não entra aqui: ele não usa o banco e pode rodar fora da fila.
//
// Só o banco LOCAL: nenhum argumento deste script chega ao comando do Supabase.

import { execFileSync, spawnSync } from "node:child_process"

const SHELL = process.platform === "win32"

function run(command, args, env = process.env) {
  console.log(`\n$ ${command} ${args.join(" ")}`)
  const result = spawnSync(command, args, { stdio: "inherit", shell: SHELL, env })
  return result.status ?? 1
}

function localEnv() {
  const output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    shell: SHELL,
  })
  const values = {}
  for (const line of output.split(/\r?\n/)) {
    const match = /^([A-Z_]+)="?([^"]*)"?$/.exec(line.trim())
    if (match) values[match[1]] = match[2]
  }
  return {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: values.ANON_KEY,
    SUPABASE_URL: values.API_URL,
    SUPABASE_ANON_KEY: values.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: values.SERVICE_ROLE_KEY,
  }
}

const [mode, ...specs] = process.argv.slice(2)

if (mode === "banco") {
  const reset = run("npx", ["supabase", "db", "reset", "--local", "--no-seed"])
  if (reset !== 0) process.exit(reset)
  process.exit(run("npx", ["pnpm@11.18.0", "test:db"]))
}

if (mode === "e2e") {
  if (specs.length === 0) {
    console.error("prova-sequencia: diga os specs do e2e (tests/e2e/...).")
    process.exit(2)
  }
  const reset = run("npx", ["supabase", "db", "reset", "--local"])
  if (reset !== 0) process.exit(reset)
  process.exit(
    run(
      "npx",
      ["pnpm@11.18.0", "exec", "playwright", "test", ...specs, "--workers=1", "--reporter=line"],
      localEnv(),
    ),
  )
}

console.error("prova-sequencia: modo desconhecido. Use `banco` ou `e2e <specs>`.")
process.exit(2)
