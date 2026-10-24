#!/usr/bin/env node
import { execFileSync, spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dirname, "../..")
const label = process.argv[2]
if (!label || !/^[a-zA-Z0-9._-]+$/.test(label))
  throw new Error("uso: node scripts/exp-front/medir.mjs <rótulo simples>")
const output = join(root, ".visual/exp-front", label)
mkdirSync(output, { recursive: true })
const windows = process.platform === "win32"
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: windows,
    ...options,
  })
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} falhou (${result.status})`)
  return result
}

// Contas do seed local: valor público de teste (supabase/seed.sql), não credencial real,
// como em scripts/agents/prova-sequencia.mjs.
const seedTestValue = "bivaque-e2e-local"

function localEnv() {
  const output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    cwd: root,
    encoding: "utf8",
    shell: windows,
  })
  const values = {}
  for (const line of output.split(/\r?\n/)) {
    const match = /^([A-Z_]+)="?([^"\r\n]*)"?$/.exec(line.trim())
    if (match) values[match[1]] = match[2]
  }
  if (!values.API_URL || !values.ANON_KEY || !values.SERVICE_ROLE_KEY)
    throw new Error("supabase status não forneceu API_URL, ANON_KEY e SERVICE_ROLE_KEY locais")
  // O Chromium que esta versão do Playwright esperaria pode não estar baixado; o
  // headless shell já instalado serve, como em scripts/agents/prova-sequencia.mjs.
  const installedShell = join(
    process.env.LOCALAPPDATA ?? "",
    "ms-playwright",
    "chromium_headless_shell-1248",
    "chrome-headless-shell-win64",
    "chrome-headless-shell.exe",
  )
  const chromium =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
    (existsSync(installedShell) ? installedShell : undefined)
  return {
    ...process.env,
    ...(chromium ? { PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: chromium } : {}),
    SUPABASE_URL: values.API_URL,
    SUPABASE_ANON_KEY: values.ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: values.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: values.SERVICE_ROLE_KEY,
    USER_PASSWORD: process.env.USER_PASSWORD ?? seedTestValue,
    USER_EMAIL: "visual@bivaque.example.invalid",
  }
}

function freePort(port) {
  if (windows) {
    const output = spawnSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8" }).stdout ?? ""
    for (const line of output.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/)
      if (
        parts[1]?.endsWith(`:${port}`) &&
        parts[3] === "LISTENING" &&
        /^\d+$/.test(parts[4] ?? "")
      )
        spawnSync("taskkill", ["/PID", parts[4], "/T", "/F"], { stdio: "ignore" })
    }
  } else
    spawnSync("sh", ["-c", `lsof -ti tcp:${port} -sTCP:LISTEN | xargs -r kill -9`], {
      stdio: "ignore",
    })
}

function flatten(suite, rows = []) {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests ?? [])
      for (const result of test.results ?? [])
        rows.push({ title: test.title, file: spec.file, status: result.status })
  for (const child of suite.suites ?? []) flatten(child, rows)
  return rows
}

let server
const summary = { label, eliminatorios: {}, navegacao: [], celular: null, capturas: null }
let exitCode = 0
try {
  run("npx", ["supabase", "db", "reset", "--local"])
  const env = localEnv()
  run(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_bivaque-community",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: readFileSync(join(root, "scripts/exp-front/carga.sql")),
      env,
      stdio: ["pipe", "inherit", "inherit"],
    },
  )
  if (!existsSync(join(root, "apps/web/.next/BUILD_ID")))
    throw new Error("build de produção ausente; execute-o antes de chamar a medição dentro da fila")
  freePort(3000)
  server = spawn(
    "npx",
    ["pnpm@11.18.0", "--filter", "web", "start", "--hostname", "127.0.0.1", "--port", "3000"],
    { cwd: root, env, stdio: "inherit", shell: windows },
  )
  let ready = false
  for (let i = 0; i < 90; i++) {
    try {
      const response = await fetch("http://127.0.0.1:3000/api/health")
      if (response.ok) {
        ready = true
        break
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  if (!ready) throw new Error("next start não respondeu em 90 segundos")
  const specs = [
    "tests/e2e/exp-front/eliminatorios.spec.ts",
    "tests/e2e/exp-front/navegacao.spec.ts",
    "tests/e2e/exp-front/falhas.spec.ts",
    "tests/e2e/exp-front/tema.spec.ts",
  ]
  const projects = ["mobile-375", "tablet-768", "desktop-1440"].flatMap((project) => [
    "--project",
    project,
  ])
  const result = spawnSync(
    "npx",
    [
      "pnpm@11.18.0",
      "exec",
      "playwright",
      "test",
      ...specs,
      ...projects,
      "--workers=1",
      "--reporter=json",
    ],
    { cwd: root, env, encoding: "utf8", shell: windows, maxBuffer: 30 * 1024 * 1024 },
  )
  writeFileSync(join(output, "playwright-report.json"), result.stdout ?? "")
  let rows = []
  try {
    rows = flatten(JSON.parse(result.stdout).suites)
  } catch {
    throw new Error(
      `Playwright não produziu JSON válido. Consulte ${join(output, "playwright-report.json")}`,
    )
  }
  const navigationRows = rows.filter((row) => row.file?.endsWith("navegacao.spec.ts"))
  summary.navegacao = [...new Set(navigationRows.map((row) => row.title))].map((title) => {
    const runs = navigationRows.filter((row) => row.title === title)
    return {
      caso: title,
      passou: runs.length === 3 && runs.every((row) => row.status === "passed"),
      projetos: runs.map((row) => ({ arquivo: row.file, status: row.status })),
    }
  })
  for (const key of ["acesso", "sem duplicar", "rascunho", "escape"]) {
    const runs = rows.filter((row) => row.title.toLowerCase().includes(key))
    summary.eliminatorios[key] =
      runs.length === 3 && runs.every((row) => row.status === "passed") ? "passou" : "não passou"
  }
  summary.eliminatorios.navegacao =
    summary.navegacao.length === 9 && summary.navegacao.every((test) => test.passou)
      ? "passou"
      : "não passou"
  if (result.status !== 0) exitCode = result.status ?? 1
  run("node", ["scripts/exp-front/capturas.mjs", label], { env })
  run("node", ["scripts/exp-front/celular.mjs", label], { env })
  summary.celular = JSON.parse(readFileSync(join(output, "celular-report.json"), "utf8"))
  summary.capturas = join(output, "capturas-report.json")
} catch (error) {
  exitCode ||= 1
  summary.error = error instanceof Error ? error.message : String(error)
} finally {
  if (server?.pid) {
    if (windows)
      spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" })
    else server.kill()
  }
  writeFileSync(join(output, "resumo.json"), `${JSON.stringify(summary, null, 2)}\n`)
}
process.exit(exitCode)
