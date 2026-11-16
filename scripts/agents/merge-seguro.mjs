#!/usr/bin/env node
// merge-seguro.mjs — a única porta de merge da orquestração.
//
// O ADR-20261114 trocou branch protection pelo rito de fechamento (label ci:full →
// completo verde no SHA → merge). O rito é palavra; este script é a trava mecânica:
// confere pela API que o SHA do head do PR tem o PR CI completo (job `ci-core`
// presente e verde — é ele que sobe a stack e roda build, pgTAP e E2E) e o Visual
// Smoke verde, ou ausente porque o PR não toca os paths do workflow. Só então
// mergeia por squash, amarrando o merge ao SHA completo conferido.
//
// Qualquer outro estado — completo ausente ou vermelho, Visual ausente num PR que
// toca apps/app, check de outro SHA, SHA curto, merge recusado — é recusa com
// mensagem clara e código de saída 1. O script nunca mergeia na dúvida.
//
// Uso: node scripts/agents/merge-seguro.mjs <numero-do-pr>
//   GH_TOKEN (ou GITHUB_TOKEN) — token com pull-requests: write e checks: read.
//   GITHUB_REPOSITORY — owner/nome; sobreponível por --repo owner/nome.

import { pathToFileURL } from "node:url"

const API = "https://api.github.com"

// Nomes de check (campo `name:` do job no workflow). Mudar o nome do job sem
// mudar aqui faz o script recusar todo merge — falha alta, nunca merge cego.
export const CHECK_COMPLETO = "CI core / build, db, e2e comuns"
export const CHECK_VISUAL = "App mobile-first / 320-360-375-430-768-1440"

// Os `paths` de bivaque-app-visual-smoke.yml: se o PR não toca nenhum deles, o
// workflow não cria check algum, e a ausência do Visual é legítima.
export const CAMINHOS_DO_VISUAL = [
  /^apps\/app\//,
  /^\.github\/workflows\/bivaque-app-visual-smoke\.yml$/,
  /^pnpm-lock\.yaml$/,
]

const SHA_COMPLETO = /^[0-9a-f]{40}$/i

/**
 * Decide se o PR pode ser mergeado. Função pura: recebe o que a API respondeu e
 * devolve o veredito. `ok: false` traz sempre o motivo em português, sem jargão.
 */
export function avaliar({ headSha, estado, checkRuns = [], arquivos = [] }) {
  if (estado !== "open") {
    return { ok: false, motivo: `o PR está "${estado}", não "open"` }
  }
  if (!SHA_COMPLETO.test(headSha ?? "")) {
    return {
      ok: false,
      motivo: `o SHA do head não é completo (40 caracteres): ${headSha ?? "vazio"}`,
    }
  }

  const porNome = new Map()
  for (const run of checkRuns) {
    if (!run?.name) continue
    if (run.head_sha && run.head_sha !== headSha) {
      return {
        ok: false,
        motivo: `o check "${run.name}" pertence a ${String(run.head_sha).slice(0, 12)}, não ao head ${headSha.slice(0, 12)}`,
      }
    }
    // O GitHub devolve o mais recente por nome; a última ocorrência vence aqui.
    porNome.set(run.name, run)
  }

  const completo = porNome.get(CHECK_COMPLETO)
  if (!completo) {
    return {
      ok: false,
      motivo: `o PR CI completo não rodou neste SHA (job ci-core ausente: check "${CHECK_COMPLETO}") — aplique a label ci:full e espere o run`,
    }
  }
  if (completo.status !== "completed") {
    return { ok: false, motivo: `o PR CI completo ainda está "${completo.status}"` }
  }
  if (completo.conclusion !== "success") {
    return { ok: false, motivo: `o PR CI completo está "${completo.conclusion}", não verde` }
  }

  const visual = porNome.get(CHECK_VISUAL)
  const tocaOApp = arquivos.some((caminho) =>
    CAMINHOS_DO_VISUAL.some((padrao) => padrao.test(caminho)),
  )

  if (!visual) {
    if (tocaOApp) {
      return {
        ok: false,
        motivo: `o Visual Smoke não rodou e o PR toca apps/app — ele deveria ter rodado neste SHA`,
      }
    }
    return {
      ok: true,
      motivo: "PR CI completo verde; Visual Smoke pulado por paths (o PR não toca apps/app)",
    }
  }
  if (visual.status !== "completed") {
    return { ok: false, motivo: `o Visual Smoke ainda está "${visual.status}"` }
  }
  if (visual.conclusion === "skipped") {
    if (tocaOApp) {
      return {
        ok: false,
        motivo: "o Visual Smoke foi pulado, mas o PR toca apps/app — pulo por paths não se aplica",
      }
    }
    return { ok: true, motivo: "PR CI completo verde; Visual Smoke pulado por paths" }
  }
  if (visual.conclusion !== "success") {
    return { ok: false, motivo: `o Visual Smoke está "${visual.conclusion}", não verde` }
  }

  return { ok: true, motivo: "PR CI completo e Visual Smoke verdes no mesmo SHA" }
}

async function pedir(fetchImpl, { metodo = "GET", url, token, corpo }) {
  const resposta = await fetchImpl(url, {
    method: metodo,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(corpo ? { "content-type": "application/json" } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  })
  const texto = await resposta.text()
  if (!resposta.ok) {
    throw new Error(`${metodo} ${url} respondeu ${resposta.status}: ${texto.slice(0, 200)}`)
  }
  return texto ? JSON.parse(texto) : {}
}

/** Todos os arquivos do PR (a API pagina em 100). */
async function arquivosDoPr(fetchImpl, { repo, pr, token }) {
  const arquivos = []
  for (let pagina = 1; pagina <= 30; pagina += 1) {
    const lote = await pedir(fetchImpl, {
      url: `${API}/repos/${repo}/pulls/${pr}/files?per_page=100&page=${pagina}`,
      token,
    })
    for (const item of lote) if (item?.filename) arquivos.push(item.filename)
    if (lote.length < 100) break
  }
  return arquivos
}

/**
 * Confere e, se o veredito for verde, mergeia por squash no SHA conferido.
 * Não imprime: devolve o veredito para quem chamou decidir o log e o exit code.
 */
export async function mergeSeguro({ pr, repo, token, fetchImpl = fetch }) {
  const pull = await pedir(fetchImpl, { url: `${API}/repos/${repo}/pulls/${pr}`, token })
  const headSha = pull?.head?.sha
  const arquivos = await arquivosDoPr(fetchImpl, { repo, pr, token })
  const checks = headSha
    ? await pedir(fetchImpl, {
        url: `${API}/repos/${repo}/commits/${headSha}/check-runs?per_page=100&filter=latest`,
        token,
      })
    : { check_runs: [] }

  const veredito = avaliar({
    headSha,
    estado: pull?.state,
    checkRuns: checks?.check_runs ?? [],
    arquivos,
  })
  if (!veredito.ok) return { ...veredito, merged: false }

  const resultado = await pedir(fetchImpl, {
    metodo: "PUT",
    url: `${API}/repos/${repo}/pulls/${pr}/merge`,
    token,
    // `sha` amarra o merge ao head conferido: se um push novo chegar no meio,
    // o GitHub recusa em vez de mergear árvore não provada.
    corpo: { sha: headSha, merge_method: "squash" },
  })
  if (!resultado?.merged) {
    return {
      ok: false,
      merged: false,
      motivo: `o GitHub recusou o merge: ${resultado?.message ?? "sem mensagem"}`,
    }
  }
  return { ...veredito, merged: true, sha: headSha, mergeSha: resultado.sha }
}

function lerArgumentos(argv) {
  const pr = Number(argv.find((arg) => /^\d+$/.test(arg)))
  const indiceRepo = argv.indexOf("--repo")
  const repo = indiceRepo === -1 ? process.env["GITHUB_REPOSITORY"] : argv[indiceRepo + 1]
  return { pr, repo }
}

async function main(argv) {
  const { pr, repo } = lerArgumentos(argv)
  if (!Number.isInteger(pr) || pr <= 0) {
    process.stderr.write(
      "uso: node scripts/agents/merge-seguro.mjs <numero-do-pr> [--repo owner/nome]\n",
    )
    return 2
  }
  if (!repo) {
    process.stderr.write("merge-seguro: defina GITHUB_REPOSITORY ou passe --repo owner/nome\n")
    return 2
  }
  const token = process.env["GH_TOKEN"] ?? process.env["GITHUB_TOKEN"]
  if (!token) {
    process.stderr.write(
      "merge-seguro: defina GH_TOKEN (ou GITHUB_TOKEN) com pull-requests: write\n",
    )
    return 2
  }

  try {
    const veredito = await mergeSeguro({ pr, repo, token })
    if (!veredito.ok) {
      process.stderr.write(`merge-seguro: recusado — ${veredito.motivo}\n`)
      return 1
    }
    if (veredito.merged) {
      process.stdout.write(`merge-seguro: PR #${pr} mergeado por squash em ${veredito.mergeSha}\n`)
      return 0
    }
    // Sem merged e sem recusa: não acontece hoje, mas nunca devolve verde sem merge.
    process.stderr.write("merge-seguro: veredito verde sem merge; nada foi feito\n")
    return 1
  } catch (erro) {
    process.stderr.write(`merge-seguro: erro — ${erro?.message ?? erro}\n`)
    return 1
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((codigo) => {
    process.exitCode = codigo
  })
}
