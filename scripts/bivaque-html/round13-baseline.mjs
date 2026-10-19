import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Base visual congelada no fechamento do Lote Funcional (Rodadas 57 a 65), aprovada pelo usuário em
// 2026-10-19 ("Congelar e publicar"; prototypes/bivaque-html/docs/VISUAL_BASELINE_R65.md).
// Os nomes "Round13" ficam por compatibilidade com quem importa este módulo. Bases anteriores continuam
// guardadas: Rodada 56 em .visual/bivaque-html-round56/baseline/round56.html (19df283b…), Rodada 52 em .visual/bivaque-html-round52/baseline/round52.html (c83703ea…), Rodada 48 em .visual/bivaque-html-round48/baseline/round48.html (1de94489…), Rodada 44 em .visual/bivaque-html-round44/baseline/round44.html (eb4969db…), Rodada 39 em .visual/bivaque-html-round39/baseline/round39.html (b71c2248…), Rodada 34 em .visual/bivaque-html-round34/baseline/round34.html (8dcad9cd…), Rodada 28 em .visual/bivaque-html-round28/baseline/round28.html (57f4e391…), Rodada 24 em .visual/bivaque-html-round24/baseline/round24.html (4678825f…), Rodada 13 em
// .visual/bivaque-html-round13/baseline/round13.html (f63e6a9a…) e Rodada 00.1 em
// .visual/bivaque-html-round01/baseline/round001.html.
export const ROUND13_BASELINE_SHA256 =
  "0dce1b06dfdca692c22489e1173980a4c1686ad2accde1c79666ed6209144f9d"
const FILE = ".visual/bivaque-html-round65/baseline/round65.html"
const REPORT = "prototypes/bivaque-html/docs/VISUAL_BASELINE_R65.md"

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")

export function round13Baseline(root) {
  const path = join(root, FILE)
  try {
    return { bytes: readFileSync(path), provenance: { method: "frozen local file", path } }
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
  // Sem o arquivo local: monta a partir do commit que criou o registro da base,
  // só concatenando os blobs na ordem do manifesto, como o build faz.
  const revision = execFileSync("git", ["log", "--diff-filter=A", "--format=%H", "--", REPORT], {
    cwd: root,
  })
    .toString()
    .trim()
    .split("\n")
    .at(-1)
  assert(revision, "Commit da base visual não encontrado para reconstruí-la")
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
    "A base visual aprovada deve ficar congelada",
  )
}
