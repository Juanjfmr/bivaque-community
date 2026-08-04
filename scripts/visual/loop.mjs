// One iteration of the Bivaque build loop: gates -> build -> serve -> capture -> report.
//
//   node scripts/visual/loop.mjs            full run (lint, typecheck, test, build, capture)
//   node scripts/visual/loop.mjs --fast     skip build/serve, capture against a running dev server
//
// Exit code is 0 only when every gate passed AND the visual audit has no high-severity
// findings. The loop driver (see docs/agents/QWEN_BUILD_PROMPT.md) keeps iterating while
// this exits non-zero.

import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const FAST = process.argv.includes("--fast")
const BASE_URL = process.env["BIVAQUE_VISUAL_BASE_URL"] ?? "http://127.0.0.1:3000"
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-")
const RUN_DIR = join(".visual", RUN_ID)
const PNPM = ["npx", "pnpm@11.18.0"]

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

async function main() {
  mkdirSync(RUN_DIR, { recursive: true })

  const gates = FAST
    ? [runGate("lint", PNPM[0], [PNPM[1], "lint"])]
    : [
        runGate("lint", PNPM[0], [PNPM[1], "lint"]),
        runGate("typecheck", PNPM[0], [PNPM[1], "typecheck"]),
        runGate("test", PNPM[0], [PNPM[1], "test"]),
        runGate("build", PNPM[0], [PNPM[1], "build"]),
      ]

  const blocked = gates.some((gate) => !gate.passed)
  let server = null

  if (!blocked && !FAST) {
    console.log("[loop] starting production server…")
    server = spawn(
      PNPM[0],
      [PNPM[1], "--filter", "web", "start", "--hostname", "127.0.0.1", "--port", "3000"],
      { shell: true, stdio: "ignore", detached: false },
    )
  }

  let capture = { name: "capture", passed: false, output: "skipped — a gate failed" }

  if (!blocked) {
    const up = await waitForServer(BASE_URL, FAST ? 15_000 : 120_000)
    capture = up
      ? runGate("capture", "node", ["scripts/visual/capture.mjs"], {
          BIVAQUE_VISUAL_RUN: RUN_ID,
        })
      : { name: "capture", passed: false, output: `server never answered ${BASE_URL}/api/health` }
  }

  if (server) server.kill()

  const auditPath = join(RUN_DIR, "report.json")
  let high = null
  try {
    const { readFileSync } = await import("node:fs")
    high = JSON.parse(readFileSync(auditPath, "utf8")).high
  } catch {
    high = null
  }

  const allGates = [...gates, capture]
  const ok = allGates.every((gate) => gate.passed) && high === 0

  const lines = [
    `# Iteration ${RUN_ID}`,
    "",
    "| gate | result |",
    "| --- | --- |",
    ...allGates.map((gate) => `| ${gate.name} | ${gate.passed ? "pass" : "FAIL"} |`),
    `| high-severity visual findings | ${high ?? "n/a"} |`,
    "",
    `Verdict: **${ok ? "ITERATION COMPLETE" : "KEEP ITERATING"}**`,
    "",
    "## Failure output",
    "",
    ...allGates
      .filter((gate) => !gate.passed)
      .flatMap((gate) => [`### ${gate.name}`, "", "```", gate.output, "```", ""]),
    "## Next",
    "",
    ok
      ? "All gates green. Move to the next screen in the backlog."
      : `Fix the failures above, then re-read \`${join(RUN_DIR, "report.md")}\` and the screenshots in \`${join(RUN_DIR, "shots")}\`.`,
  ]

  writeFileSync(join(RUN_DIR, "ITERATION.md"), `${lines.join("\n")}\n`)
  console.log(`[loop] ${ok ? "COMPLETE" : "KEEP ITERATING"} → ${join(RUN_DIR, "ITERATION.md")}`)
  process.exit(ok ? 0 : 1)
}

await main()
