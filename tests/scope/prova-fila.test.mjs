import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import {
  acquire,
  isProcessAlive,
  isStale,
  parseCommand,
  readHolder,
  release,
  runCommand,
  tryAcquire,
} from "../../scripts/agents/prova-fila.mjs"

// Cada teste cava o próprio diretório de trava no temp: nada aqui toca o banco
// local, a porta 3000 nem a trava real da máquina. Sem isso o teste seria uma
// segunda prova disputando o recurso que o script serializa.
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "prova-fila-test-"))
  return { root, lockDir: join(root, "lock") }
}

const silent = () => {}

test("readHolder devolve null sem arquivo e lê o dono escrito", () => {
  const { root, lockDir } = sandbox()
  try {
    assert.equal(readHolder(lockDir), null)
    mkdirSync(lockDir)
    writeFileSync(join(lockDir, "holder.json"), JSON.stringify({ pid: process.pid, time: 12345 }))
    assert.deepEqual(readHolder(lockDir), { pid: process.pid, time: 12345 })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("pega a trava, guarda PID e horário, e solta", async () => {
  const { root, lockDir } = sandbox()
  try {
    const before = Date.now()
    const releaseLock = await acquire({ lockDir, log: silent })
    const holder = readHolder(lockDir)
    assert.equal(holder.pid, process.pid)
    assert.ok(holder.time >= before, "o horário da trava é o da aquisição")

    releaseLock()
    assert.equal(existsSync(lockDir), false, "soltar remove a trava")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("espera a vez e só segue quando quem segura solta", async () => {
  const { root, lockDir } = sandbox()
  try {
    const releaseFirst = await acquire({ lockDir, log: silent })

    let acquired = false
    const waiting = acquire({ lockDir, pollMs: 5, notifyMs: 5, log: silent }).then((release) => {
      acquired = true
      return release
    })

    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.equal(acquired, false, "ainda preso enquanto a trava está tomada")

    releaseFirst()
    const releaseSecond = await waiting
    assert.equal(acquired, true, "segue assim que a trava é solta")
    releaseSecond()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("avisa a cada notifyMs quem está segurando", async () => {
  const { root, lockDir } = sandbox()
  try {
    const releaseFirst = await acquire({ lockDir, log: silent })
    const messages = []
    let acquired = false
    const waiting = acquire({
      lockDir,
      pollMs: 5,
      notifyMs: 5,
      log: (message) => messages.push(message),
    }).then((release) => {
      acquired = true
      return release
    })

    await new Promise((resolve) => setTimeout(resolve, 40))
    assert.equal(acquired, false)
    assert.ok(
      messages.some((message) => message.includes("esperando a trava")),
      "quem espera é avisado de quem segura",
    )

    releaseFirst()
    const releaseSecond = await waiting
    releaseSecond()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("toma trava velha por idade, com aviso", async () => {
  const { root, lockDir } = sandbox()
  try {
    mkdirSync(lockDir)
    writeFileSync(
      join(lockDir, "holder.json"),
      JSON.stringify({ pid: process.pid, time: Date.now() - 10_000 }),
    )
    assert.equal(isStale(lockDir, Date.now(), 5_000), true)

    const messages = []
    const releaseLock = await acquire({
      lockDir,
      staleMs: 5_000,
      pollMs: 5,
      log: (message) => messages.push(message),
    })
    assert.ok(
      messages.some((message) => message.includes("trava velha")),
      "tomar a trava velha é anunciado",
    )
    assert.equal(readHolder(lockDir).pid, process.pid, "a trava velha vira nossa")
    releaseLock()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("toma trava velha de PID morto, mesmo recente", async () => {
  const { root, lockDir } = sandbox()
  try {
    const dead = spawnSync(process.execPath, ["-e", ""], { encoding: "utf8" })
    assert.equal(dead.status, 0)
    assert.equal(isProcessAlive(dead.pid), false, "um processo já terminado não está vivo")

    mkdirSync(lockDir)
    writeFileSync(join(lockDir, "holder.json"), JSON.stringify({ pid: dead.pid, time: Date.now() }))
    assert.equal(isStale(lockDir, Date.now(), 60 * 60 * 1000), true)

    const messages = []
    const releaseLock = await acquire({
      lockDir,
      pollMs: 5,
      log: (message) => messages.push(message),
    })
    assert.ok(messages.some((message) => message.includes("trava velha")))
    assert.equal(readHolder(lockDir).pid, process.pid)
    releaseLock()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("tryAcquire recusa a segunda posse e release é idempotente", () => {
  const { root, lockDir } = sandbox()
  try {
    assert.equal(tryAcquire(lockDir), true)
    assert.equal(tryAcquire(lockDir), false, "mkdir atômico: a segunda posse falha")
    release(lockDir)
    release(lockDir)
    assert.equal(existsSync(lockDir), false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("isProcessAlive reconhece o próprio processo e recusa um pid inválido", () => {
  assert.equal(isProcessAlive(process.pid), true)
  assert.equal(isProcessAlive(-1), false)
  assert.equal(isProcessAlive(1.5), false)
})

test("runCommand devolve o código de saída do comando", async () => {
  const ok = await runCommand([process.execPath, "-e", "process.exit(0)"], { shell: false })
  assert.equal(ok, 0)
  const failed = await runCommand([process.execPath, "-e", "process.exit(3)"], { shell: false })
  assert.equal(failed, 3)
})

test("parseCommand exige o separador --", () => {
  assert.deepEqual(parseCommand([]), [])
  assert.deepEqual(parseCommand(["nada", "aqui"]), [])
  assert.deepEqual(parseCommand(["--", "npx", "pnpm@11.18.0", "gate"]), [
    "npx",
    "pnpm@11.18.0",
    "gate",
  ])
})

// Guarda contra regressão silenciosa do arquivo de trava: o cabeçalho promete
// PID e horário, e o teste acima só passa se as duas chaves continuarem lá.
test("o holder grava pid e time em JSON", async () => {
  const { root, lockDir } = sandbox()
  try {
    const releaseLock = await acquire({ lockDir, log: silent })
    const raw = JSON.parse(readFileSync(join(lockDir, "holder.json"), "utf8"))
    assert.equal(typeof raw.pid, "number")
    assert.equal(typeof raw.time, "number")
    releaseLock()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
