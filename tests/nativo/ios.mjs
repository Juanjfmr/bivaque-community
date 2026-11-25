import { spawnSync } from "node:child_process"
import { mkdirSync, renameSync, statSync } from "node:fs"

const [device] = process.argv.slice(2)
const outputDir = ".visual/loja-004/ios"
const entryCapture = `${outputDir}/01-entrada.png`
const failedEntryCapture = `${outputDir}/01-entrada-falha.png`
const linkCapture = `${outputDir}/02-link.png`
const failedLinkCapture = `${outputDir}/02-link-falha.png`
const renderThresholdBytes = 120_000

mkdirSync(outputDir, { recursive: true })

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", ...options })
}

function screenshot(path) {
  const result = run("xcrun", ["simctl", "io", device, "screenshot", path])
  if (result.status !== 0) throw new Error(result.stderr || "simctl screenshot falhou")
  return statSync(path).size
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function captureUntilRendered(label, failedPath, successPath) {
  let lastSize = 0
  for (let elapsed = 0; elapsed <= 90_000; elapsed += 3_000) {
    lastSize = screenshot(failedPath)
    console.log(`${label}: tentativa em ${elapsed / 1000}s, PNG ${lastSize} bytes`)
    if (lastSize > renderThresholdBytes) {
      renameSync(failedPath, successPath)
      return { rendered: true, size: lastSize }
    }
    if (elapsed < 90_000) sleep(3_000)
  }
  return { rendered: false, size: lastSize }
}

const entry = captureUntilRendered("Entrada", failedEntryCapture, entryCapture)
if (!entry.rendered) {
  console.error(
    `::error::Tela de entrada não renderizou em 90s (limite ${renderThresholdBytes} bytes; último PNG ${entry.size} bytes)`,
  )
  process.exit(1)
}

console.log("Tela de entrada renderizada; tentando link profundo com o app em primeiro plano")
const openUrl = run("xcrun", ["simctl", "openurl", device, "bivaque://app/entrar"])
if (openUrl.status !== 0) throw new Error(`simctl openurl falhou: ${openUrl.stderr}`)
sleep(1_000)

const accepted = run("osascript", [
  "-e",
  'tell application "System Events" to tell process "Simulator" to click button "Open" of window 1',
])
if (accepted.status !== 0) {
  console.log("link profundo no iOS não provado no CI: o simctl pede confirmação")
  console.log("::warning::link profundo no iOS não provado no CI: o simctl pede confirmação")
  process.exit(0)
}

const dialogClosed = run("osascript", [
  "-e",
  'tell application "System Events" to tell process "Simulator" to not (exists button "Open" of window 1)',
])
if (dialogClosed.status !== 0 || dialogClosed.stdout.trim() !== "true") {
  console.log("link profundo no iOS não provado no CI: o simctl pede confirmação")
  console.log("::warning::link profundo no iOS não provado no CI: o simctl pede confirmação")
  process.exit(0)
}

const link = captureUntilRendered("Link profundo", failedLinkCapture, linkCapture)
if (!link.rendered) {
  console.error(
    `::error::A tela após aceitar o link não renderizou em 90s (limite ${renderThresholdBytes} bytes; último PNG ${link.size} bytes)`,
  )
  process.exit(1)
}
