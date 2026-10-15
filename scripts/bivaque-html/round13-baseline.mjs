import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Base visual congelada da Rodada 13, aprovada pelo usuário em 2026-10-15: Início do desktop,
// botão e painel Criar, categorias da Rodada 12 e "Contratar serviço" da Rodada 11. Ela
// substitui a base da Rodada 00.1 nas comparações estritas; a base antiga continua guardada
// em .visual/bivaque-html-round01/baseline/round001.html.
export const ROUND13_BASELINE_SHA256 =
  "f63e6a9a9fb636508f8f987c43b5d603529dc3517907d3154cfc1951b5257aec"
const FILE = ".visual/bivaque-html-round13/baseline/round13.html"
const REPORT = "prototypes/bivaque-html/docs/ROUND_13.md"

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")

export function round13Baseline(root) {
  const path = join(root, FILE)
  try {
    return { bytes: readFileSync(path), provenance: { method: "frozen local file", path } }
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
  // Sem o arquivo local: monta a partir do commit que criou o relatório da Rodada 13,
  // só concatenando os blobs na ordem do manifesto, como o build faz.
  const revision = execFileSync("git", ["log", "--diff-filter=A", "--format=%H", "--", REPORT], {
    cwd: root,
  })
    .toString()
    .trim()
    .split("\n")
    .at(-1)
  assert(revision, "Commit da Rodada 13 não encontrado para reconstruir a base visual")
  const source = (relative) =>
    execFileSync("git", ["show", `${revision}:prototypes/bivaque-html/src/${relative}`], {
      cwd: root,
      maxBuffer: 16 * 1024 * 1024,
    })
  const manifest = JSON.parse(source("manifest.json"))
  assert.equal(manifest.formatVersion, 1)
  let bytes = source(manifest.template)
  for (const slot of manifest.slots) {
    const token = Buffer.from(slot.token)
    const start = bytes.indexOf(token)
    assert(
      start >= 0 && bytes.lastIndexOf(token) === start,
      "Token do template deve ocorrer uma vez",
    )
    bytes = Buffer.concat([
      bytes.subarray(0, start),
      Buffer.concat(slot.files.map(source)),
      bytes.subarray(start + token.length),
    ])
  }
  return { bytes, provenance: { method: "raw Git blobs, byte concatenation only", revision } }
}

export function assertRound13Baseline(bytes) {
  assert.equal(
    sha256(bytes),
    ROUND13_BASELINE_SHA256,
    "A base visual da Rodada 13 deve ficar congelada",
  )
}
