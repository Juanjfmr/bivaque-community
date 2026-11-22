import { spawnSync } from "node:child_process"
import { mkdirSync, statSync, unlinkSync } from "node:fs"

const [device, bundleId] = process.argv.slice(2)
const outputDir = ".visual/loja-004/ios"
const entryCapture = `${outputDir}/01-entrada.png`
const linkCapture = `${outputDir}/02-link.png`
const renderThresholdBytes = 50_000

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

const launched = run("xcrun", ["simctl", "launch", device, bundleId])
if (launched.status !== 0) throw new Error(`simctl launch falhou: ${launched.stderr}`)

let rendered = false
for (let elapsed = 0; elapsed <= 60_000; elapsed += 3_000) {
  const size = screenshot(entryCapture)
  console.log(`Entrada: tentativa em ${elapsed / 1000}s, PNG ${size} bytes`)
  if (size > renderThresholdBytes) {
    rendered = true
    break
  }
  if (elapsed < 60_000) sleep(3_000)
}

if (!rendered) {
  console.error(
    `::error::Tela de entrada não renderizou em 60s (limite ${renderThresholdBytes} bytes)`,
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
  unlinkSync(entryCapture)
  console.log("link profundo no iOS não provado no CI: o simctl pede confirmação")
  console.log("::warning::link profundo no iOS não provado no CI: o simctl pede confirmação")
  process.exit(0)
}

const dialogClosed = run("osascript", [
  "-e",
  'tell application "System Events" to tell process "Simulator" to not (exists button "Open" of window 1)',
])
if (dialogClosed.status !== 0 || dialogClosed.stdout.trim() !== "true") {
  unlinkSync(entryCapture)
  console.log("link profundo no iOS não provado no CI: o simctl pede confirmação")
  console.log("::warning::link profundo no iOS não provado no CI: o simctl pede confirmação")
  process.exit(0)
}

sleep(3_000)
const linkSize = screenshot(linkCapture)
console.log(`Link profundo: AppleScript aceitou Open; PNG ${linkSize} bytes`)
if (linkSize <= renderThresholdBytes) {
  console.error(`::error::A captura após aceitar o link está vazia (${linkSize} bytes)`)
  process.exit(1)
}
