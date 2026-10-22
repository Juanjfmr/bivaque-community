#!/usr/bin/env node
// gate.mjs — porta de qualidade única do repositório.
//
// Existe para que "verifiquei" seja um comando só, determinístico e impossível
// de rodar pela metade. Agente que roda `lint` e declara pronto não passou pelo
// gate; agente que roda `node scripts/gate.mjs` passou ou não passou.
//
//   node scripts/gate.mjs           # lint + typecheck + build + test + secrets
//   node scripts/gate.mjs --fast    # só lint + typecheck (loop de edição)
//   node scripts/gate.mjs --json    # saída estruturada
//
// Exit 0 = etapas selecionadas passaram; --fast continua parcial. Exit 1 = falha.

import { spawnSync } from "node:child_process"

const args = process.argv.slice(2)
const FAST = args.includes("--fast")
const AS_JSON = args.includes("--json")

const PNPM = ["npx", "pnpm@11.18.0"]

// O build entra porque typecheck NAO o substitui. Em 08/09/2026 dez commits
// saíram com "gate verde" enquanto `next build` estava quebrado: avatar.tsx
// usava useState sem "use client", e o limite servidor/cliente só é resolvido
// pelo bundler. tsc não olha para ele. Quem descobriu foi o E2E, depois de a
// suíte rodar ZERO teste e ainda assim retornar sucesso.
const stages = [
  { name: "lint", script: "lint", why: "biome check ." },
  { name: "typecheck", script: "typecheck", why: "tsc --noEmit em todos os workspaces" },
  {
    name: "build",
    script: "build",
    why: "next build — limite servidor/cliente, que o typecheck não vê",
    slow: true,
  },
  { name: "test", script: "test", why: "unit + privacy + scope", slow: true },
  { name: "secrets", script: "test:secrets", why: "varredura de credencial inline", slow: true },
]

const selected = FAST ? stages.filter((stage) => !stage.slow) : stages
const results = []

for (const stage of selected) {
  const started = Date.now()
  if (!AS_JSON) process.stdout.write(`\n── ${stage.name} ── ${stage.why}\n`)

  const run = spawnSync(PNPM[0], [PNPM[1], stage.script], {
    stdio: AS_JSON ? "pipe" : "inherit",
    shell: true,
    encoding: "utf8",
  })

  const ok = run.status === 0
  results.push({
    stage: stage.name,
    ok,
    status: run.status,
    seconds: Math.round((Date.now() - started) / 1000),
    output: AS_JSON ? `${run.stdout ?? ""}${run.stderr ?? ""}`.slice(-4000) : undefined,
  })

  // Falha cedo: typecheck vermelho torna a saída dos testes ruído.
  if (!ok) break
}

const failed = results.find((result) => !result.ok)

if (AS_JSON) {
  console.log(
    JSON.stringify({ green: !failed && !FAST, passed: !failed, fast: FAST, results }, null, 2),
  )
} else {
  console.log("\n────────────────────────────────")
  for (const result of results)
    console.log(`${result.ok ? "  ok " : "FAIL "} ${result.stage} (${result.seconds}s)`)

  if (failed) {
    console.log(`\nGATE VERMELHO — parou em \`${failed.stage}\`.`)
    console.log("Antes de atribuir a falha ao seu diff, confirme que ela reproduz num estado")
    console.log("limpo. Ver a seção de armadilhas conhecidas no AGENTS.md.")
  } else {
    console.log(FAST ? "\nGATE PARCIAL — lint e tipos passaram." : "\nGATE VERDE.")
    if (FAST) console.log("--fast não autoriza declarar pronto. Rode o gate completo antes.")
  }
}

process.exit(failed ? 1 : 0)
