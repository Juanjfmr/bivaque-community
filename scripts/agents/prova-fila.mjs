#!/usr/bin/env node
// prova-fila.mjs — serializa as provas que disputam o Supabase local e a porta
// 3000 nesta máquina.
//
// O que este script resolve: `db:reset`, `test:db`, `test:e2e` e o loop visual
// escrevem no mesmo banco e servem a mesma porta. Rode duas provas ao mesmo
// tempo e a medição de uma contamina a outra — o "perfil fantasma" do visual
// derruba os contadores do pgTAP, o `reuseExistingServer` testa o build de
// outra lane. A regra fica explícita: quem quer usar o banco local ou a porta
// 3000 passa por aqui e espera a vez.
//
// A exclusividade é um diretório de trava no temp do sistema, criado com
// `mkdir` (atômico: quem perde recebe EEXIST), com um `holder.json` dentro
// carregando o PID e o horário de quem segurou. Enquanto espera, avisa a cada
// 30 s quem está segurando. Trava velha — PID que não existe mais, ou mais de
// 60 minutos — é tomada, com aviso. A trava solta ao terminar, inclusive com
// erro ou Ctrl-C, e o script devolve o código de saída do comando.
//
// Uso:
//   node scripts/agents/prova-fila.mjs -- npx pnpm@11.18.0 test:db
//   node scripts/agents/prova-fila.mjs -- npx playwright test tests/e2e/smoke.spec.ts
//
// Sem dependência nova: só `node:*`.

import { spawn } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

// Um só nome de trava para o banco local e a porta 3000: os dois recursos
// andam juntos nesta máquina (o e2e sobe o servidor e o reset limpa o banco),
// e separá-los em duas travas reintroduz a corrida que este script existe para
// matar.
export const LOCK_DIR =
  process.env["BIVAQUE_PROVA_FILA_LOCK"] ?? join(tmpdir(), "bivaque-prova-fila.lock")
export const HOLDER_FILE = "holder.json"
export const STALE_MS = 60 * 60 * 1000
export const NOTIFY_MS = 30 * 1000
export const POLL_MS = 500

const holderPath = (lockDir) => join(lockDir, HOLDER_FILE)

/**
 * Lê o dono da trava. Devolve `null` quando o arquivo ainda não existe (o dono
 * acabou de criar o diretório e ainda não escreveu) ou está corrompido — nos
 * dois casos não é trava velha, é trava em formação: esperar é o certo.
 */
export function readHolder(lockDir = LOCK_DIR) {
  try {
    const parsed = JSON.parse(readFileSync(holderPath(lockDir), "utf8"))
    const pid = Number(parsed.pid)
    const time = Number(parsed.time)
    if (!Number.isInteger(pid) || pid <= 0) return null
    return { pid, time: Number.isFinite(time) ? time : 0 }
  } catch {
    return null
  }
}

/** `kill(pid, 0)` não entrega sinal: só responde se o processo existe. */
export function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM: existe, mas não é deste usuário. Existe.
    return error.code === "EPERM"
  }
}

/**
 * Idade da trava em milissegundos e quem a segura. Quando o `holder.json`
 * existe, a idade vem do horário dele; quando não, do mtime do diretório —
 * cobre o caso em que o processo morreu entre o `mkdir` e a escrita.
 */
export function lockAge(lockDir = LOCK_DIR, now = Date.now()) {
  const holder = readHolder(lockDir)
  if (holder && holder.time > 0) return { holder, ageMs: now - holder.time }
  try {
    return { holder, ageMs: now - statSync(lockDir).mtimeMs }
  } catch {
    return null
  }
}

/** Velha = o dono morreu, ou passou dos 60 minutos. Trava sem dono legível só
 * vence pela idade. Diretório ausente não é trava velha: não é trava. */
export function isStale(lockDir = LOCK_DIR, now = Date.now(), staleMs = STALE_MS) {
  const status = lockAge(lockDir, now)
  if (!status) return false
  if (status.holder && !isProcessAlive(status.holder.pid)) return true
  return status.ageMs > staleMs
}

/** Tenta criar a trava. `mkdir` é atômico: EEXIST significa que outra prova a
 * tem. Qualquer outro erro sobe — falhar alto é melhor que rodar sem trava. */
export function tryAcquire(lockDir = LOCK_DIR) {
  try {
    mkdirSync(lockDir)
  } catch (error) {
    if (error.code === "EEXIST") return false
    throw error
  }
  writeFileSync(
    holderPath(lockDir),
    `${JSON.stringify({ pid: process.pid, time: Date.now() }, null, 2)}\n`,
  )
  return true
}

export function release(lockDir = LOCK_DIR) {
  rmSync(lockDir, { recursive: true, force: true })
}

function describeHolder(holder, ageMs, now = Date.now()) {
  if (!holder) return "dono desconhecido (arquivo ainda não escrito)"
  const seconds = Math.max(0, Math.round((ageMs ?? now - holder.time) / 1000))
  const alive = isProcessAlive(holder.pid) ? "vivo" : "morto"
  return `pid ${holder.pid} (${alive}), há ${seconds}s`
}

/**
 * Pega a trava, esperando a vez. Devolve uma função que solta. Enquanto espera,
 * avisa a cada `notifyMs`. As opções existem para o teste exercitar o caminho
 * de espera sem dormir 30 s de verdade.
 */
export async function acquire(options = {}) {
  const lockDir = options["lockDir"] ?? LOCK_DIR
  const staleMs = options["staleMs"] ?? STALE_MS
  const notifyMs = options["notifyMs"] ?? NOTIFY_MS
  const pollMs = options["pollMs"] ?? POLL_MS
  const log = options["log"] ?? ((message) => process.stderr.write(`${message}\n`))
  const sleep = options["sleep"] ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const now = options["now"] ?? (() => Date.now())

  let lastNotify = Number.NEGATIVE_INFINITY
  for (;;) {
    if (tryAcquire(lockDir)) {
      log(`prova-fila: trava ${lockDir} obtida`)
      return () => release(lockDir)
    }
    if (isStale(lockDir, now(), staleMs)) {
      const status = lockAge(lockDir, now())
      log(
        `prova-fila: trava velha em ${lockDir} — ${describeHolder(status?.holder ?? null, status?.ageMs)}; tomando a trava`,
      )
      release(lockDir)
      continue
    }
    const moment = now()
    if (moment - lastNotify >= notifyMs) {
      const status = lockAge(lockDir, moment)
      log(
        `prova-fila: esperando a trava ${lockDir} — ${describeHolder(status?.holder ?? null, status?.ageMs, moment)}`,
      )
      lastNotify = moment
    }
    await sleep(pollMs)
  }
}

/**
 * Roda o comando com o stdio herdado e devolve o código de saída. No Windows,
 * `.cmd`/`.bat` (pnpm, npx) só sobem com `shell: true`; fora dele o shell fica
 * desligado para não reinterpretar argumentos.
 */
export function runCommand(argv, options = {}) {
  const spawnFn = options["spawnFn"] ?? spawn
  const cwd = options["cwd"] ?? process.cwd()
  const shell = options["shell"] ?? process.platform === "win32"
  return new Promise((resolve, reject) => {
    // Com `shell: true`, passar o array de argumentos dispara DEP0190: o Node
    // concatena sem escapar. Montamos a linha aqui e citamos o que tem espaço.
    const child = shell
      ? spawnFn(argv.map(quoteShellArg).join(" "), { stdio: "inherit", cwd, shell: true })
      : spawnFn(argv[0], argv.slice(1), { stdio: "inherit", cwd, shell })
    child.on("error", reject)
    child.on("close", (code, signal) => resolve(signal ? 128 : (code ?? 1)))
  })
}

function quoteShellArg(arg) {
  if (arg === "") return '""'
  return /[\s"&|<>^()]/.test(arg) ? `"${arg.replace(/"/g, '""')}"` : arg
}

export function parseCommand(argv) {
  const separator = argv.indexOf("--")
  return separator === -1 ? [] : argv.slice(separator + 1)
}

async function main(argv, options = {}) {
  const command = parseCommand(argv)
  if (command.length === 0) {
    process.stderr.write(
      "uso: node scripts/agents/prova-fila.mjs -- <comando e argumentos>\n" +
        "ex.: node scripts/agents/prova-fila.mjs -- npx pnpm@11.18.0 test:db\n",
    )
    return 2
  }

  const releaseLock = await acquire(options)
  let released = false
  const safeRelease = () => {
    if (released) return
    released = true
    releaseLock()
  }

  // Ctrl-C/Ctrl-Break também soltam a trava: uma prova interrompida à mão não
  // pode deixar a próxima presa por 60 minutos.
  const onSignal = () => {
    safeRelease()
    process.exit(130)
  }
  process.on("SIGINT", onSignal)
  process.on("SIGTERM", onSignal)
  process.on("exit", safeRelease)

  try {
    return await runCommand(command, options)
  } finally {
    safeRelease()
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`prova-fila: ${error?.stack ?? error}\n`)
      process.exit(1)
    },
  )
}
