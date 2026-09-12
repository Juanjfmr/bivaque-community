// One iteration of the Bivaque build loop: gates -> build -> serve -> capture -> report.
//
//   node scripts/visual/loop.mjs            full run (lint, typecheck, test, build, capture)
//   node scripts/visual/loop.mjs --fast     skip build/serve, capture against a running dev server
//
// Exit code is 0 only when every gate passed AND the visual audit has no high-severity
// findings. The loop driver (see docs/agents/QWEN_BUILD_PROMPT.md) keeps iterating while
// this exits non-zero.

import { spawn, spawnSync } from "node:child_process"
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { consume, DEFAULT_BUDGET, itemKey, readState, reset, writeState } from "./budget.mjs"
import { isCaptureReportPassing } from "./capture-proof.mjs"
import { probeFootprint } from "./footprint.mjs"
import { mergeRun, readLedger, summarize, writeLedger } from "./ledger.mjs"

const FAST = process.argv.includes("--fast")
const BASE_URL = process.env["BIVAQUE_VISUAL_BASE_URL"] ?? "http://127.0.0.1:3000"
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-")
const RUN_DIR = join(".visual", RUN_ID)
const PNPM = ["npx", "pnpm@11.18.0"]
const LEDGER_PATH = join(".visual", "known-issues.json")
const STATE_PATH = join(".visual", "iteration-state.json")
// Backlog item this loop is iterating on, passed by the driver. Without it the
// iteration budget stays dormant (legacy behaviour — no ceiling).
const LOOP_ITEM = itemKey(process.env["BIVAQUE_LOOP_ITEM"] ?? "")

function runGate(name, command, args, env) {
  process.stdout.write(`[loop] ${name}… `)
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: true,
    env: { ...process.env, ...env },
  })
  const passed = result.status === 0
  console.log(passed ? "ok" : "FAIL")
  return {
    name,
    passed,
    output: passed ? "" : `${result.stdout ?? ""}${result.stderr ?? ""}`.slice(-4000),
  }
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`)
      if (response.ok) return true
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}

// —— Loop 2: escalada ————————————————————————————————————————————————
// When the driver passes BIVAQUE_LOOP_ITEM, the loop tracks spent iterations in
// .visual/iteration-state.json and refuses to keep burning past the budget.
// A spent iteration always counts; a clean one resets the counter so a fix
// starts fresh.
function applyBudget() {
  if (!LOOP_ITEM) return { active: false, over: false, iterations: 0, budget: DEFAULT_BUDGET }
  const state = readState(STATE_PATH)
  const outcome = consume(state, LOOP_ITEM, DEFAULT_BUDGET)
  writeState(STATE_PATH, state)
  return { active: true, ...outcome }
}

// Item fechado numa iteração limpa: zera o contador para o mesmo item poder
// começar fresco no próximo backlog.
function resetBudget() {
  if (!LOOP_ITEM) return
  const state = readState(STATE_PATH)
  reset(state, LOOP_ITEM)
  writeState(STATE_PATH, state)
}

function writeEscalation() {
  const path = join(RUN_DIR, "ESCALATE.md")
  const last = readLedger(LEDGER_PATH)
  const summary = summarize(last)
  const body = [
    `# Escalada — ${RUN_ID}`,
    "",
    `Item: **${process.env["BIVAQUE_LOOP_ITEM"] ?? "(não informado)"}**`,
    `Iterações gastas atingiram o orçamento (${DEFAULT_BUDGET}) sem fechar.`,
    "",
    "## Estado que o humano recebe",
    "",
    "- `ITERATION.md` — o veredito e o log da última iteração.",
    "- `report.md` / `report.json` — a auditoria visual determinística.",
    "- `shots/` — os screenshots das 3 viewports por rota.",
    "- `server.log` — o log do servidor de produção desta iteração.",
    "",
    "## Dívida aberta (ledger)",
    "",
    `- Open: **${summary.open}** (medium ${summary.bySeverity.medium}, low ${summary.bySeverity.low}).`,
    `- Decidida/resolvida: **${summary.decided}**.`,
    "",
    "## Próximo passo humano",
    "",
    "- Decida o item: continuar (subir `DEFAULT_BUDGET` em `scripts/visual/loop.mjs` — só depois de ler os artefatos) ou abortar/repensar a abordagem.",
    "- Se o achado é dívida aceitável, registre a decisão no ledger (`decision`, via `scripts/visual/ledger.mjs`) para deixar de bloquear.",
    "- Não suba o budget antes de olhar os artefatos — o gate já parou no vermelho por um motivo.",
  ]
  writeFileSync(path, `${body.join("\n")}\n`)
  return path
}

// —— Loop 1: dívida —————————————————————————————————————————————————
// Merge the medium/low audit findings into the persistent ledger so they don't
// evaporate between runs. High severity still blocks in report.json (unchanged).
function updateLedger(results) {
  const nowIso = new Date().toISOString()
  const existing = readLedger(LEDGER_PATH)
  const merged = mergeRun(existing, results, nowIso)
  writeLedger(LEDGER_PATH, merged.entries)
  return merged
}

// A captura visual autenticada entrou (e ainda entra) para a lista de "perfil
// fantasma Visual Capture" do AGENTS.md §Known traps. Vale o registro, porque
// responde a dúvida recorrente de quem vê "test:db" falhar com
// `have: ("Visual Capture") / want: NULL` logo depois de uma captura:
//
// O mecanismo histórico morreu. No tooling de hoje a captura só NAVEGA (GET)
// nas rotas — assina como `visual@bivaque.example.invalid`, provisionado
// explicitamente pelo `seed.sql` (user na linha 57; profiles com display_name
// legível — Ana Verificada / Dono da Vila). Nunca POSTa em `/api/onboarding`
// (provision), que é o único caminho que faz upsert em `public.profiles`.
// Logo, a captura atual não cria perfil nenhum — o ghost era de uma versão do
// tooling que provisioningava na passagem pelas rotas guiadas.
//
// NÃO reintroduzir aqui uma guarda de janela por mtime (seed.sql, etc.):
// `db:reset`/`test:db` LEEM esses arquivos sem reescrever o mtime, então tal
// guarda só dispararia em falso quando um humano editasse o seed — o oposto do
// que se quer. Se um dia o ciclo de banco deixar um marcador real (lockfile,
// log de reset), o lugar certo é o script de resets registrar isso, não o loop
// inferir de timestamps. O sinal legítimo está no anti-rastro do loop: a
// recusa em capturar contra um servidor pré-existente desta iteração (§ stale
// dev-server.pid / porta 3000), que é onde "um run antigo deixa rastro" vive.

async function main() {
  mkdirSync(RUN_DIR, { recursive: true })

  // Biome lint flags codebase-wide pre-existing useLiteralKeys info-level diagnostics
  // as fixable. Those are not real errors, so we constrain the diagnostic level to
  // `error` for the loop's gate — the full lint report still runs in CI as today.
  const lintCmd = [PNPM[0], PNPM[1], "exec", "biome", "check", ".", "--diagnostic-level", "error"]
  const gates = FAST
    ? [runGate("lint", PNPM[0], lintCmd)]
    : [
        runGate("lint", PNPM[0], lintCmd),
        runGate("typecheck", PNPM[0], [PNPM[1], "typecheck"]),
        runGate("test", PNPM[0], [PNPM[1], "test"]),
        runGate("build", PNPM[0], [PNPM[1], "build"]),
      ]

  const blocked = gates.some((gate) => !gate.passed)
  if (blocked) {
    // Sem servidor para matar, sem captura: a iteração morre no gate vermelho.
    const allGates = gates
    const lines = [
      `# Iteration ${RUN_ID}`,
      "",
      "| gate | result |",
      "| --- | --- |",
      ...allGates.map((gate) => `| ${gate.name} | ${gate.passed ? "pass" : "FAIL"} |`),
      "",
      "Verdict: **KEEP ITERATING**",
      "",
      "## Failure output",
      "",
      ...allGates
        .filter((gate) => !gate.passed)
        .flatMap((gate) => [`### ${gate.name}`, "", "```", gate.output, "```", ""]),
      "## Next",
      "",
      `Fix the failures above, then re-run this loop. Results land in \`${RUN_DIR}\`.`,
    ]
    writeFileSync(join(RUN_DIR, "ITERATION.md"), `${lines.join("\n")}\n`)
    console.log(`[loop] KEEP ITERATING → ${join(RUN_DIR, "ITERATION.md")}`)
    process.exit(1)
  }

  let server = null
  const serverLog = join(RUN_DIR, "server.log")
  let capture = { name: "capture", passed: true, output: "skipped — no server boot in --fast" }

  try {
    if (!FAST) {
      // Um servidor de produção já escutando na :3000 é o "stale" do AGENTS.md:
      // loop antigo que não morreu ou um dev server fantasma. Capturar contra ele
      // não serve — a iteração precisa do build que acabamos de validar. Recusar é
      // mais barato que diagnosticar um "server never answered" enigmático.
      if (await waitForServer(BASE_URL, 3_000)) {
        capture = {
          name: "capture",
          passed: false,
          output: `${BASE_URL} já estava respondendo; o loop não captura contra um servidor pré-existente. Mate-o (ex.: dev-server.pid/servidor na :3000) e rode de novo, ou use --fast contra o dev server que você mesmo subiu.`,
        }
      } else {
        console.log("[loop] starting production server…")
        // detached + process group: `pnpm ... start` é um wrapper; sem grupo de
        // processos, matar o wrapper deixaria o node do Next órfão segurando a
        // :3000 — o "stale server" que o loop reusa sem querer na próxima vez.
        server = spawn(
          PNPM[0],
          [PNPM[1], "--filter", "web", "start", "--hostname", "127.0.0.1", "--port", "3000"],
          { shell: true, detached: true },
        )
        // Log do servidor vai para o run dir — se ele crashar entre o build e a
        // captura, a causa está no artefato, não num "/api/health nunca respondeu".
        server.stdout.pipe(createWriteStream(serverLog, { flags: "a" }))
        server.stderr.pipe(createWriteStream(serverLog, { flags: "a" }))

        const up = await waitForServer(BASE_URL, 120_000)
        let tail = ""
        try {
          tail = readFileSync(serverLog, "utf8").trim().slice(-4000)
        } catch {
          tail = "" // server.log ainda não existe — servidor morreu antes de logar
        }
        capture = up
          ? runGate("capture", "node", ["scripts/visual/capture.mjs"], {
              BIVAQUE_VISUAL_RUN: RUN_ID,
            })
          : {
              name: "capture",
              passed: false,
              output: tail
                ? `server never answered ${BASE_URL}/api/health — último log do servidor (${serverLog}):\n${tail}`
                : `server never answered ${BASE_URL}/api/health (${serverLog} estava vazio)`,
            }
      }
    } else {
      const up = await waitForServer(BASE_URL, 15_000)
      capture = up
        ? runGate("capture", "node", ["scripts/visual/capture.mjs"], {
            BIVAQUE_VISUAL_RUN: RUN_ID,
          })
        : { name: "capture", passed: false, output: `server never answered ${BASE_URL}/api/health` }
    }
  } finally {
    // Criação própria, limpeza própria: mata o GRUPO inteiro (-pid), não só o
    // wrapper do pnpm — senão o node do Next órfão segura a :3000 para a próxima
    // iteração (o "stale server" do AGENTS.md). Sinais de morte não são esperados
    // pelo loop: a captura já acabou.
    if (server) {
      try {
        process.kill(-server.pid, "SIGKILL")
      } catch {
        try {
          server.kill("SIGKILL")
        } catch {
          // já morreu sozinho
        }
      }
    }
  }

  const auditPath = join(RUN_DIR, "report.json")
  let high = null
  let validCapture = false
  try {
    const report = JSON.parse(readFileSync(auditPath, "utf8"))
    high = report.high
    validCapture = isCaptureReportPassing(report)
  } catch {
    high = null
  }

  const allGates = [...gates, capture]
  const ok = allGates.every((gate) => gate.passed) && validCapture

  // Ledger atualiza mesmo em falha — o achado que não bloqueou hoje é dívida
  // que não pode evaporar. `ok` (não o resultado do gate) decide + it-só-clean.
  let ledgerDelta = { opened: 0, stillOpen: 0 }
  let audit = null
  try {
    audit = JSON.parse(readFileSync(auditPath, "utf8"))
  } catch {
    audit = null
  }
  if (audit?.results) ledgerDelta = updateLedger(audit.results)

  // Footprint do banco local observado nesta iteração (best-effort: sem Docker,
  // reporta unavailable em vez de derrubar o loop). Permite ver se tooling
  // deixou linhas para trás (seed/e2e/legacy capture) sem ler dado pessoal.
  const footprint = probeFootprint()

  // Escalada: iteração limpa zera o contador (a dívida foi paga); iteração
  // falha gasta do orçamento e pode estourar → escreve ESCALATE.md.
  let budget = { active: false, over: false, iterations: 0, budget: DEFAULT_BUDGET }
  if (ok) {
    resetBudget()
  } else {
    budget = applyBudget()
  }

  const lines = [
    `# Iteration ${RUN_ID}`,
    "",
    "| gate | result |",
    "| --- | --- |",
    ...allGates.map((gate) => `| ${gate.name} | ${gate.passed ? "pass" : "FAIL"} |`),
    `| high-severity visual findings | ${high ?? "n/a"} |`,
    `| capture identity and coverage | ${validCapture ? "pass" : "FAIL"} |`,
    budget.active
      ? `| iterations spent on "${process.env["BIVAQUE_LOOP_ITEM"]}" | ${budget.iterations}/${budget.budget} |`
      : null,
    "",
    `Verdict: **${ok ? "MECHANICAL CHECKS PASS — FIDELITY NOT ASSESSED" : "KEEP ITERATING"}**`,
    "",
    "## Debt ledger",
    "",
    budget.active
      ? `- Opened this run: **${ledgerDelta.opened}** · still open: **${ledgerDelta.stillOpen}**.`
      : `Ledger: **${ledgerDelta.stillOpen}** open.`,
    "",
    "## Data footprint (local stack)",
    "",
    footprint.available
      ? `- profiles: **${footprint.counts.profiles ?? "n/a"}** · with membership: **${footprint.counts.profiles_with_membership ?? "n/a"}** · auth users: **${footprint.counts.auth_users ?? "n/a"}**`
      : "- stack indisponível (sem Docker? mid-reset?) — footprint não medido. Detalhe em `footprint.json`.",
    "",
    "## Failure output",
    "",
    ...allGates
      .filter((gate) => !gate.passed)
      .flatMap((gate) => [`### ${gate.name}`, "", "```", gate.output, "```", ""]),
    "## Next",
    "",
    ok
      ? "Compare these captures with the reference images and obtain independent review before closing the visual batch."
      : `Fix the failures above, then re-read \`${join(RUN_DIR, "report.md")}\` and the screenshots in \`${join(RUN_DIR, "shots")}\`.`,
  ]

  writeFileSync(join(RUN_DIR, "ITERATION.md"), `${lines.filter(Boolean).join("\n")}\n`)
  writeFileSync(
    join(RUN_DIR, "footprint.json"),
    `${JSON.stringify({ runId: RUN_ID, takenAt: new Date().toISOString(), ...footprint }, null, 2)}\n`,
  )

  // Budget estourado sem fechar → não continua: escreve o relatório de escalada
  // e para (exit 2, distinto do 1 de "falha reparável").
  if (budget.active && budget.over && !ok) {
    const escalatePath = writeEscalation()
    console.log(`[loop] BUDGET EXHAUSTED → ${escalatePath}`)
    process.exit(2)
  }

  console.log(`[loop] ${ok ? "COMPLETE" : "KEEP ITERATING"} → ${join(RUN_DIR, "ITERATION.md")}`)
  process.exit(ok ? 0 : 1)
}

await main()
