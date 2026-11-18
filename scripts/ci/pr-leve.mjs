#!/usr/bin/env node
// pr-leve.mjs — diz se um PR é "leve": só mexe em quadro, documentação e regras de
// agente, nada que o build, o banco ou o E2E leiam.
//
// PR leve roda só os Fast checks (lint, typecheck, unit/privacy/scope, que já
// validam o quadro e os contratos) e o agregador "Install, test, and build" sai
// verde sem subir a stack. Qualquer arquivo fora da lista — código, migration,
// workflow, lockfile, docs/legal (lido pela web em runtime) — faz o PR inteiro
// voltar ao CI completo de sempre. Na dúvida, não é leve: lista vazia, lista
// truncada ou arquivo renomeado de fora da lista contam como código.
//
// Uso no workflow (job `changes` do pull-request-ci.yml):
//   node scripts/ci/pr-leve.mjs <numero-do-pr>
//   GH_TOKEN e GITHUB_REPOSITORY no ambiente; escreve `leve=true|false` em
//   $GITHUB_OUTPUT. O merge-seguro usa a mesma função, então workflow e trava de
//   merge nunca discordam sobre o que é leve.
//
// Node puro, sem dependências: o job roda antes (e sem) o pnpm install.

import { appendFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

// docs/legal fica de fora: as páginas de privacidade, conduta e aceite leem esses
// arquivos em runtime (apps/web/app/(preauth)). AGENTS.md/CLAUDE.md dentro de apps/ e
// packages/ também: o Tailwind v4 varre esses diretórios e o texto pode virar classe
// no CSS gerado; e nada em apps/app pode ser leve sem o Visual.
export const CAMINHOS_LEVES = [
  /^docs\/(?!legal\/)/,
  /^tools\/backend-kanban\/public\/board\.json$/,
  /^tools\/backend-kanban\/BOARD\.md$/,
  /^[^/]+\.md$/,
  /^(?!apps\/|packages\/)(?:[^/]+\/)*AGENTS\.md$/,
  /^(?!apps\/|packages\/)(?:[^/]+\/)*CLAUDE\.md$/,
]

// A API de arquivos do PR para em 3000; nesse teto a lista pode estar cortada.
export const TETO_DE_ARQUIVOS = 3000

export function caminhoLeve(caminho) {
  return typeof caminho === "string" && CAMINHOS_LEVES.some((padrao) => padrao.test(caminho))
}

/**
 * `arquivos`: caminhos tocados pelo PR, incluindo o nome antigo de cada
 * renomeado. Devolve `{ leve, motivo }`.
 */
export function classificar(arquivos) {
  if (!Array.isArray(arquivos) || arquivos.length === 0) {
    return { leve: false, motivo: "lista de arquivos vazia: tratado como código" }
  }
  if (arquivos.length >= TETO_DE_ARQUIVOS) {
    return { leve: false, motivo: `${arquivos.length} arquivos: lista possivelmente truncada` }
  }
  const pesado = arquivos.find((caminho) => !caminhoLeve(caminho))
  if (pesado !== undefined) {
    return { leve: false, motivo: `toca ${pesado}: CI completo` }
  }
  return { leve: true, motivo: `${arquivos.length} arquivo(s), todos de quadro/documentação` }
}

/** Nomes da resposta da API de arquivos do PR, com o nome antigo dos renomeados. */
export function nomesDaApi(itens) {
  const nomes = []
  for (const item of itens ?? []) {
    if (item?.filename) nomes.push(item.filename)
    if (item?.previous_filename) nomes.push(item.previous_filename)
  }
  return nomes
}

async function arquivosDoPr({ repo, pr, token, fetchImpl = fetch }) {
  const itens = []
  for (let pagina = 1; pagina <= 30; pagina += 1) {
    const resposta = await fetchImpl(
      `https://api.github.com/repos/${repo}/pulls/${pr}/files?per_page=100&page=${pagina}`,
      {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": "2022-11-28",
        },
      },
    )
    if (!resposta.ok) throw new Error(`a API de arquivos do PR respondeu ${resposta.status}`)
    const lote = await resposta.json()
    itens.push(...lote)
    if (lote.length < 100) break
  }
  return nomesDaApi(itens)
}

async function main(argv) {
  const pr = Number(argv[0])
  const repo = process.env["GITHUB_REPOSITORY"]
  const token = process.env["GH_TOKEN"] || process.env["GITHUB_TOKEN"]
  if (!Number.isInteger(pr) || pr <= 0 || !repo || !token) {
    process.stderr.write("uso: GH_TOKEN=… GITHUB_REPOSITORY=… node scripts/ci/pr-leve.mjs <pr>\n")
    return 2
  }
  const { leve, motivo } = classificar(await arquivosDoPr({ repo, pr, token }))
  process.stdout.write(`PR #${pr}: ${leve ? "leve" : "completo"} — ${motivo}\n`)
  const saida = process.env["GITHUB_OUTPUT"]
  if (saida) appendFileSync(saida, `leve=${leve}\n`)
  return 0
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (codigo) => {
      process.exitCode = codigo
    },
    (erro) => {
      process.stderr.write(`pr-leve: ${erro?.message ?? erro}\n`)
      process.exitCode = 1
    },
  )
}
