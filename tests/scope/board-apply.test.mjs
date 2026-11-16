import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import {
  aplicarPatch,
  aplicarPatchNoQuadro,
  formatarQuadro,
} from "../../tools/backend-kanban/src/board-apply.mjs"

const root = process.cwd()
const cliPath = join(root, "tools", "backend-kanban", "src", "board.mjs")
const boardPath = join(root, "tools", "backend-kanban", "public", "board.json")
const fixtures = join(root, "tests", "fixtures", "board-apply")
const fixture = (nome) => readFileSync(join(fixtures, nome), "utf8")
const mini = JSON.parse(fixture("board-mini.json"))
const patchCompleto = JSON.parse(fixture("patch-completo.json"))
const patchInvalidoPath = join(fixtures, "patch-invalido.json")
const patchDuplicadoPath = join(fixtures, "patch-duplicado.json")
const hash = (texto) => createHash("sha256").update(texto).digest("hex")

function quadroTemporario(t) {
  const diretorio = mkdtempSync(join(tmpdir(), "hrn-001-"))
  t.after(() => rmSync(diretorio, { recursive: true, force: true }))
  const caminho = join(diretorio, "board.json")
  writeFileSync(caminho, fixture("board-mini.json"), "utf8")
  return { diretorio, boardPath: caminho, summaryPath: join(diretorio, "BOARD.md") }
}

test("--apply cria, atualiza, move, anota e marca checklist num patch só", () => {
  const { quadro, relatorio } = aplicarPatch(mini, patchCompleto)

  assert.equal(formatarQuadro(quadro), fixture("esperado-board.json"))
  assert.deepEqual(relatorio.criados, ["MINI-03"])
  assert.deepEqual(relatorio.alterados, ["MINI-02"])
  assert.deepEqual(relatorio.movidos, ["MINI-01: now -> done"])
  assert.deepEqual(relatorio.notas, ["MINI-02/proof"])
  assert.deepEqual(relatorio.checklist, ["MINI-02: segundo item"])
  const mini02 = quadro.cards.find((cartao) => cartao.id === "MINI-02")
  assert.deepEqual(mini02.completedChecklist, [false, true])
})

test("o formato gravado é o canônico do biome, estável a uma segunda passada", () => {
  const esperado = fixture("esperado-board.json")
  assert.equal(formatarQuadro(JSON.parse(esperado)), esperado)
  assert.ok(
    !esperado.includes("\r") && !esperado.startsWith(String.fromCharCode(0xfeff)),
    "board.json vai em UTF-8 sem BOM e com fim de linha LF",
  )
})

test("o board.json real já está no formato canônico do --apply", () => {
  const atual = readFileSync(boardPath, "utf8")
  assert.equal(
    formatarQuadro(JSON.parse(atual)),
    atual,
    "board.json fora do formato canônico: o lint do biome e o --apply divergem",
  )
})

test("id inexistente em update e em move é erro que nomeia a operação", () => {
  for (const operacao of [
    { op: "update", id: "MINI-NAO-EXISTE", set: { priority: "P1" } },
    { op: "move", id: "MINI-NAO-EXISTE", status: "done" },
    { op: "note", id: "MINI-NAO-EXISTE", text: "x" },
    { op: "checklist", id: "MINI-NAO-EXISTE", item: "primeiro item" },
  ]) {
    assert.throws(
      () => aplicarPatch(mini, { operations: [operacao] }),
      new RegExp(`operação 1 \\(${operacao.op} MINI-NAO-EXISTE\\): cartão inexistente`),
    )
  }
})

test("create com id já usado por outro cartão é erro", () => {
  const patch = JSON.parse(readFileSync(patchDuplicadoPath, "utf8"))
  assert.throws(
    () => aplicarPatch(mini, patch),
    /operação 1 \(create MINI-01\): já existe um cartão com o id MINI-01/,
  )
})

test("update recusa mudar o id e recusa campo fora do esquema", () => {
  assert.throws(
    () =>
      aplicarPatch(mini, { operations: [{ op: "update", id: "MINI-02", set: { id: "OUTRO" } }] }),
    /id não pode ser alterado/,
  )
  assert.throws(
    () =>
      aplicarPatch(mini, { operations: [{ op: "update", id: "MINI-02", set: { tittle: "x" } }] }),
    /campo desconhecido no cartão: tittle/,
  )
})

test("resultado que quebra as regras do --check não é gravado", () => {
  assert.throws(
    () => aplicarPatch(mini, { operations: [{ op: "move", id: "MINI-01", status: "done" }] }),
    /o quadro resultante é inválido:[\s\S]*MINI-01: card done precisa de completedAt/,
  )
})

test("aplicar o mesmo patch duas vezes não duplica cartão nem nota", () => {
  const primeira = aplicarPatch(mini, patchCompleto)
  const segunda = aplicarPatch(primeira.quadro, patchCompleto)

  assert.equal(formatarQuadro(segunda.quadro), formatarQuadro(primeira.quadro))
  assert.deepEqual(segunda.relatorio.criados, [])
  assert.deepEqual(segunda.relatorio.notas, [])
  assert.deepEqual(segunda.relatorio.checklist, [])
  assert.deepEqual(segunda.relatorio.movidos, [])
  assert.equal(segunda.quadro.cards.length, 3)
  const mini02 = segunda.quadro.cards.find((cartao) => cartao.id === "MINI-02")
  assert.deepEqual(mini02.proof, [
    "fixture criada para o lote HRN-001",
    "nota acrescentada pela fixture",
  ])
})

test("patch inválido deixa o board.json no disco byte a byte igual", (t) => {
  const { boardPath: caminho, summaryPath } = quadroTemporario(t)
  const antes = hash(readFileSync(caminho, "utf8"))

  assert.throws(
    () => aplicarPatchNoQuadro({ boardPath: caminho, summaryPath, patchPath: patchInvalidoPath }),
    /operação 1 \(move MINI-NAO-EXISTE\): cartão inexistente: MINI-NAO-EXISTE/,
  )

  assert.equal(hash(readFileSync(caminho, "utf8")), antes)
  assert.throws(() => readFileSync(summaryPath, "utf8"), /ENOENT/)
})

test("dry-run resume o que mudaria e não escreve", (t) => {
  const { boardPath: caminho, summaryPath } = quadroTemporario(t)
  const antes = readFileSync(caminho, "utf8")

  const resultado = aplicarPatchNoQuadro({
    boardPath: caminho,
    summaryPath,
    patchPath: join(fixtures, "patch-completo.json"),
    dryRun: true,
  })

  assert.equal(resultado.escreveu, false)
  assert.equal(resultado.mudou, true)
  assert.deepEqual(resultado.relatorio.criados, ["MINI-03"])
  assert.equal(readFileSync(caminho, "utf8"), antes)
  assert.throws(() => readFileSync(summaryPath, "utf8"), /ENOENT/)
})

test("apply real grava board.json e regenera o BOARD.md", (t) => {
  const { boardPath: caminho, summaryPath } = quadroTemporario(t)

  const resultado = aplicarPatchNoQuadro({
    boardPath: caminho,
    summaryPath,
    patchPath: join(fixtures, "patch-completo.json"),
  })

  assert.equal(resultado.escreveu, true)
  assert.equal(readFileSync(caminho, "utf8"), fixture("esperado-board.json"))
  assert.match(
    readFileSync(summaryPath, "utf8"),
    /3 frentes · 0 agora · 0 bloqueadas · 1 concluídas/,
  )
})

test("aplicar um patch sem efeito ainda põe o BOARD.md atrasado em dia", (t) => {
  const { boardPath: caminho, summaryPath } = quadroTemporario(t)
  aplicarPatchNoQuadro({
    boardPath: caminho,
    summaryPath,
    patchPath: join(fixtures, "patch-completo.json"),
  })
  const sincronizado = readFileSync(summaryPath, "utf8")
  writeFileSync(summaryPath, "resumo velho\n", "utf8")

  const resultado = aplicarPatchNoQuadro({
    boardPath: caminho,
    summaryPath,
    patchPath: join(fixtures, "patch-completo.json"),
  })

  assert.equal(resultado.mudou, false)
  assert.equal(readFileSync(summaryPath, "utf8"), sincronizado)
})

test("a CLI recusa o patch inválido, sai diferente de zero e não toca no quadro real", () => {
  const antes = hash(readFileSync(boardPath, "utf8"))

  const execucao = spawnSync(process.execPath, [cliPath, "--apply", patchInvalidoPath], {
    encoding: "utf8",
  })

  assert.notEqual(execucao.status, 0)
  assert.match(execucao.stderr, /Patch não aplicado: operação 1 \(move MINI-NAO-EXISTE\)/)
  assert.equal(hash(readFileSync(boardPath, "utf8")), antes)
})

test("a CLI mostra o diff do dry-run sem escrever no quadro real", (t) => {
  const quadro = JSON.parse(readFileSync(boardPath, "utf8"))
  const diretorio = mkdtempSync(join(tmpdir(), "hrn-001-"))
  t.after(() => rmSync(diretorio, { recursive: true, force: true }))
  const patch = join(diretorio, "patch.json")
  writeFileSync(
    patch,
    JSON.stringify({
      operations: [{ op: "note", id: quadro.cards[0].id, text: "HRN-001: prova de dry-run" }],
    }),
    "utf8",
  )
  const antes = hash(readFileSync(boardPath, "utf8"))

  const execucao = spawnSync(process.execPath, [cliPath, "--apply", patch, "--dry-run"], {
    encoding: "utf8",
  })

  assert.equal(execucao.status, 0, execucao.stderr)
  assert.match(execucao.stdout, /notas: 1/)
  assert.match(execucao.stdout, /dry-run: nada foi escrito/)
  assert.equal(hash(readFileSync(boardPath, "utf8")), antes)
})

test("a ajuda da CLI documenta as mensagens em português, sem mojibake", () => {
  const execucao = spawnSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" })

  assert.equal(execucao.status, 0)
  assert.match(execucao.stdout, /--apply <patch>/)
  assert.match(execucao.stdout, /--dry-run/)
  assert.match(execucao.stdout, /cartões/)
  assert.doesNotMatch(
    execucao.stdout,
    new RegExp(`${String.fromCharCode(0xc3)}|${String.fromCharCode(0xfffd)}`),
  )
})
