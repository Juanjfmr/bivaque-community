import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { anotarArquivo, flakesDoRelatorio, linhaDeAviso } from "../../scripts/ci/anotar-flakes.mjs"

const script = join(import.meta.dirname, "..", "..", "scripts", "ci", "anotar-flakes.mjs")

// Relatório de exemplo no formato do reporter JSON do Playwright 1.51: uma suíte
// de arquivo com specs, um describe aninhado e três desfechos — flaky (passou no
// retry), esperado (passou de primeira) e inesperado (falhou de verdade).
const relatorio = {
  suites: [
    {
      title: "grupos.spec.ts",
      file: "tests/e2e/grupos.spec.ts",
      specs: [
        {
          title: "publica no grupo",
          line: 42,
          ok: false,
          tests: [
            {
              projectName: "desktop-1440",
              status: "flaky",
              results: [{ status: "failed" }, { status: "passed" }],
            },
          ],
        },
        {
          title: "lista os grupos",
          line: 60,
          ok: true,
          tests: [
            { projectName: "mobile-375", status: "expected", results: [{ status: "passed" }] },
          ],
        },
      ],
      suites: [
        {
          title: "quando não há sessão",
          specs: [
            {
              title: "devolve à entrada",
              line: 88,
              ok: false,
              tests: [
                {
                  projectName: "tablet-768",
                  status: "unexpected",
                  results: [{ status: "failed" }, { status: "failed" }],
                },
              ],
            },
          ],
          suites: [],
        },
      ],
    },
  ],
  errors: [],
}

test("só o teste que passou no retry vira flake; falha de verdade não é anotada", () => {
  // Given the example report with one flaky, one expected and one unexpected test
  // When the flaky tests are collected
  const achados = flakesDoRelatorio(relatorio)

  // Then only the retried-and-passed test comes out, with the inherited file path
  assert.equal(achados.length, 1)
  assert.deepEqual(achados[0], {
    arquivo: "tests/e2e/grupos.spec.ts",
    linha: 42,
    titulo: "publica no grupo",
    projeto: "desktop-1440",
    tentativas: 2,
  })
})

test("a anotação é um warning do GitHub com arquivo, linha e tentativas", () => {
  // Given a flaky finding
  const achado = flakesDoRelatorio(relatorio)[0]

  // When it is formatted
  const linha = linhaDeAviso(achado)

  // Then it is one ::warning:: line naming spec, project and the retry
  assert.match(linha, /^::warning::flake: tests\/e2e\/grupos\.spec\.ts:42 — publica no grupo/)
  assert.match(linha, /\[desktop-1440\]/)
  assert.match(linha, /2 tentativas/)
  assert.doesNotMatch(linha, /\n/)
})

test("relatório sem flake não imprime nada e relatório ausente não derruba nada", () => {
  // Given a report whose only outcome is a straight pass, and a path that does not exist
  const limpo = {
    suites: [{ file: "x.spec.ts", specs: [{ title: "ok", tests: [{ status: "expected" }] }] }],
  }

  // Then a clean run says nothing, and a missing report explains itself without failing
  assert.deepEqual(flakesDoRelatorio(limpo), [])
  const semArquivo = anotarArquivo(join(tmpdir(), "anotar-flakes-inexistente.json"))
  assert.equal(semArquivo.length, 1)
  assert.match(semArquivo[0], /^::notice::/)
})

test("o passo nunca muda o código de saída do job", () => {
  // Given a report file on disk with a flaky test
  const pasta = mkdtempSync(join(tmpdir(), "anotar-flakes-"))
  const caminho = join(pasta, "relatorio.json")
  writeFileSync(caminho, JSON.stringify(relatorio))

  // When the script runs as the workflow step runs it
  const executado = spawnSync(process.execPath, [script, caminho, join(pasta, "nao-existe.json")], {
    encoding: "utf8",
  })

  // Then it exits 0 even with a missing second report, and prints the warning
  assert.equal(executado.status, 0)
  assert.match(executado.stdout, /::warning::flake: tests\/e2e\/grupos\.spec\.ts:42/)
  assert.match(executado.stdout, /::notice::/)
})
