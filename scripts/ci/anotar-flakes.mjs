#!/usr/bin/env node
// anotar-flakes.mjs — transforma o retry que absorveu uma falha em aviso visível
// no check, sem mudar o resultado do job.
//
// O E2E da web roda com `retries: 1` no CI (causa CI-E2E-UPSTREAM-INSTAVEL); o
// teste que só passa na segunda tentativa sai verde e a informação de que ele
// falhou morre no relatório. Este passo lê o relatório JSON do Playwright e emite
// `::warning::` por teste com status "flaky" — o flake aparece no run em vez de
// sumir no artefato.
//
// NUNCA muda o código de saída: relatório ausente, ilegível ou vazio continua
// saindo 0, porque a decisão do job é do Playwright, não desta anotação.
//
// Uso (depois do passo de E2E, em `if: always()`):
//   node scripts/ci/anotar-flakes.mjs ci-e2e-report.json

import { existsSync, readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

/**
 * Percorre a árvore de `suites` do relatório JSON e devolve os testes que
 * passaram só no retry. `file` vem da suíte irmã mais próxima quando o spec não
 * traz o próprio (suítes aninhadas de describe não repetem o arquivo).
 */
export function flakesDoRelatorio(relatorio) {
  const achados = []
  const visitar = (suite, arquivoAnterior) => {
    const arquivo = suite?.file ?? arquivoAnterior
    for (const spec of suite?.specs ?? []) {
      for (const teste of spec?.tests ?? []) {
        if (teste?.status !== "flaky") continue
        achados.push({
          arquivo: arquivo ?? "",
          linha: Number(spec.line) || 0,
          titulo: spec.title ?? "(sem título)",
          projeto: teste.projectName ?? "",
          tentativas: Array.isArray(teste.results) ? teste.results.length : 0,
        })
      }
    }
    for (const filha of suite?.suites ?? []) visitar(filha, arquivo)
  }
  for (const suite of relatorio?.suites ?? []) visitar(suite, undefined)
  return achados
}

/** Uma linha de anotação do GitHub por flake. */
export function linhaDeAviso(achado) {
  const onde = achado.arquivo ? `${achado.arquivo}:${achado.linha}` : "spec desconhecido"
  const projeto = achado.projeto ? ` [${achado.projeto}]` : ""
  const tentativas = achado.tentativas > 1 ? ` em ${achado.tentativas} tentativas` : ""
  return `::warning::flake: ${onde} — ${achado.titulo}${projeto} passou só no retry${tentativas}`
}

/** Lê um arquivo e devolve as linhas a imprimir. Nunca lança. */
export function anotarArquivo(caminho) {
  if (!existsSync(caminho)) {
    return [`::notice::anotar-flakes: relatório ${caminho} ausente; nada a anotar`]
  }
  let relatorio
  try {
    relatorio = JSON.parse(readFileSync(caminho, "utf8"))
  } catch (erro) {
    return [`::notice::anotar-flakes: relatório ${caminho} ilegível (${erro.message})`]
  }
  const achados = flakesDoRelatorio(relatorio)
  if (achados.length === 0) return []
  return achados.map(linhaDeAviso)
}

function main(argv) {
  const caminhos = argv.length > 0 ? argv : ["ci-e2e-report.json"]
  try {
    for (const caminho of caminhos) {
      for (const linha of anotarArquivo(caminho)) console.log(linha)
    }
  } catch (erro) {
    // Anotação nunca derruba o job: o relatório é do Playwright.
    console.log(`::notice::anotar-flakes: ${erro?.message ?? erro}`)
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2))
}
