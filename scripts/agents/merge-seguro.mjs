#!/usr/bin/env node

// merge-seguro.mjs — a única porta de merge da orquestração.
//
// O ADR-20261114 trocou branch protection pelo rito de fechamento (label ci:full →
// completo verde no SHA → merge). O rito é palavra; este script é a trava mecânica:
// confere pela API que o SHA do head do PR tem o PR CI completo (job `ci-core`
// presente e verde — é ele que sobe a stack e roda build, pgTAP e E2E — e o
// agregador "Install, test, and build" verde, que reprova quando um viewport do
// e2e-stateful cai) e o Visual Smoke verde, ou ausente porque o PR não toca os
// paths do workflow. Só então
// mergeia por squash, amarrando o merge ao SHA completo conferido.
//
// Cada execução de workflow é uma `check_suite`: o `ci-core` e o agregador valem
// sempre da MESMA suíte (combinar suítes diferentes provaria um rito que não
// aconteceu) e, entre as suítes que rodaram o completo, vale a mais recente pelo
// id da suíte. Execução ainda não terminada — em qualquer suíte que rodou o
// completo — recusa: um verde antigo não pode autorizar o merge enquanto o run
// mais novo não acabou. Ids são comparados como BigInt, nunca por Number, e
// `completed_at` não decide nada (run cancelado sem data continuaria perdendo
// para um verde velho).
//
// Qualquer outro estado — completo ausente ou vermelho, Visual ausente num PR que
// toca apps/app, check de outro SHA, SHA curto, merge recusado — é recusa com
// mensagem clara e código de saída 1. O script nunca mergeia na dúvida.
//
// Uso: node scripts/agents/merge-seguro.mjs <numero-do-pr>
//   GH_TOKEN (ou GITHUB_TOKEN, variável vazia conta como ausente) — token com
//   pull-requests: write e checks: read; sem as duas, usa o login do gh.
//   GITHUB_REPOSITORY — owner/nome; sobreponível por --repo owner/nome.

import { execFileSync } from "node:child_process"
import { pathToFileURL } from "node:url"

const API = "https://api.github.com"

// Nomes de check (campo `name:` do job no workflow). Mudar o nome do job sem
// mudar aqui faz o script recusar todo merge — falha alta, nunca merge cego.
export const CHECK_COMPLETO = "CI core / build, db, e2e comuns"
export const CHECK_AGREGADO = "Install, test, and build"
export const CHECK_VISUAL = "App mobile-first / 320-360-375-430-768-1440"

// Os `paths` de bivaque-app-visual-smoke.yml: se o PR não toca nenhum deles, o
// workflow não cria check algum, e a ausência do Visual é legítima.
export const CAMINHOS_DO_VISUAL = [
  /^apps\/app\//,
  /^\.github\/workflows\/bivaque-app-visual-smoke\.yml$/,
  /^pnpm-lock\.yaml$/,
]

// Chave do grupo de checks que a API devolveu sem `check_suite.id`: só é aceita
// quando é a única execução em jogo, porque não há como ordená-la contra outra.
const SEM_SUITE = "sem-suíte"

function paraId(valor) {
  if (typeof valor === "bigint") return valor
  if (typeof valor === "number") return Number.isInteger(valor) ? BigInt(valor) : null
  if (typeof valor === "string" && /^\d+$/.test(valor.trim())) return BigInt(valor.trim())
  return null
}

const idDoRun = (run) => paraId(run?.id ?? run?.run_id)
const idTexto = (run) => idDoRun(run)?.toString() ?? "sem id"
const recencia = (run) => idDoRun(run) ?? -1n
const doNome = (runs, nome) => runs.filter((run) => run?.name === nome)
const rotuloSuite = (suite) => (suite.id === null ? "sem id de suíte" : `suíte ${suite.id}`)

// Maior id vence; sem id conta como o mais antigo.
function maisRecente(runs) {
  return runs.reduce((melhor, run) => (recencia(run) > recencia(melhor) ? run : melhor))
}

// Seleção dentro de uma execução, para o caso de a mesma suíte (ou a API sem
// suíte) trazer o mesmo nome duas vezes: verde vence pulado e neutro; com verde e
// vermelho juntos, o mais recente pelo id decide — e o motivo diz qual foi.
function melhorDoGrupo(runs) {
  const verdes = runs.filter((run) => run.status === "completed" && run.conclusion === "success")
  const vermelhos = runs.filter(
    (run) =>
      run.status === "completed" && !["success", "skipped", "neutral"].includes(run.conclusion),
  )
  if (verdes.length && vermelhos.length) return maisRecente([...verdes, ...vermelhos])
  if (verdes.length) return maisRecente(verdes)
  return maisRecente(runs)
}

/** Usa o token do ambiente ou o login ativo do GitHub CLI, sem shell. */
export function obterToken({ env = process.env, execFileSyncImpl = execFileSync } = {}) {
  // Variável vazia conta como ausente: GH_TOKEN="" não pode esconder um GITHUB_TOKEN.
  const token = env["GH_TOKEN"] || env["GITHUB_TOKEN"]
  if (token) return token
  try {
    const tokenGh = execFileSyncImpl("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim()
    if (tokenGh) return tokenGh
  } catch {
    // A mensagem não inclui stderr do gh, que pode conter informação sensível.
  }
  throw new Error("sem token: defina GH_TOKEN/GITHUB_TOKEN ou faça login com gh auth login")
}

const SHA_COMPLETO = /^[0-9a-f]{40}$/i

/**
 * Decide se o PR pode ser mergeado. Função pura: recebe o que a API respondeu e
 * devolve o veredito. `ok: false` traz sempre o motivo em português, sem jargão;
 * todo veredito nomeia as execuções (suítes e runs) que usou.
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

  // Agrupa por execução de workflow (check_suite.id), não por nome.
  const suites = new Map()
  for (const run of checkRuns) {
    if (!run?.name) continue
    if (run.head_sha && run.head_sha !== headSha) {
      return {
        ok: false,
        motivo: `o check "${run.name}" pertence a ${String(run.head_sha).slice(0, 12)}, não ao head ${headSha.slice(0, 12)}`,
      }
    }
    const idSuite = paraId(run.check_suite?.id)
    const chave = idSuite === null ? SEM_SUITE : idSuite.toString()
    const suite = suites.get(chave) ?? { id: idSuite, runs: [] }
    suite.runs.push(run)
    suites.set(chave, suite)
  }

  const execucoes = [...suites.values()].map((suite) => ({
    id: suite.id,
    ci: doNome(suite.runs, CHECK_COMPLETO),
    agregado: doNome(suite.runs, CHECK_AGREGADO),
  }))

  const comCi = execucoes.filter((execucao) => execucao.ci.length > 0)
  if (!comCi.length) {
    return {
      ok: false,
      motivo: `o PR CI completo não rodou neste SHA (job ci-core ausente: check "${CHECK_COMPLETO}") — aplique a label ci:full e espere o run`,
    }
  }

  // Só executam o rito as suítes em que o ci-core existe e não foi pulado.
  const consideradas = comCi.filter((execucao) =>
    execucao.ci.some((run) => run.conclusion !== "skipped"),
  )
  if (!consideradas.length) {
    const pulado = melhorDoGrupo(comCi.flatMap((execucao) => execucao.ci))
    return {
      ok: false,
      motivo: `o PR CI completo está "skipped", não verde (run ${idTexto(pulado)})`,
    }
  }

  const ordenadas = [...consideradas].sort((a, b) => {
    if (a.id === null || b.id === null) return a.id === b.id ? 0 : a.id === null ? 1 : -1
    return a.id === b.id ? 0 : a.id > b.id ? -1 : 1
  })

  // Execução em andamento recusa mesmo que haja verde antigo em outra suíte.
  for (const execucao of ordenadas) {
    const run = [...execucao.ci, ...execucao.agregado].find((item) => item.status !== "completed")
    if (run) {
      return {
        ok: false,
        motivo: `o PR CI completo ainda está "${run.status}": o check "${run.name}" não terminou — execução em andamento (${rotuloSuite(execucao)}, run ${idTexto(run)})`,
      }
    }
  }

  // Entre execuções diferentes, o id da suíte decide — e sem id a decisão é
  // ambígua, então recusa em vez de combinar execuções.
  if (ordenadas.length > 1) {
    const semId = ordenadas.filter((execucao) => execucao.id === null)
    if (semId.length) {
      return {
        ok: false,
        motivo: `há ${ordenadas.length} execuções do PR CI e ${semId.length} sem id de suíte (runs ${ordenadas
          .flatMap((execucao) => execucao.ci)
          .map(idTexto)
          .join(", ")}); não dá para dizer qual é a mais recente`,
      }
    }
  }

  const escolhida = ordenadas[0]
  const ciCore = melhorDoGrupo(escolhida.ci)
  if (ciCore.conclusion !== "success") {
    return {
      ok: false,
      motivo: `o PR CI completo está "${ciCore.conclusion}", não verde (${rotuloSuite(escolhida)}, run ${idTexto(ciCore)})`,
    }
  }

  if (!escolhida.agregado.length) {
    return {
      ok: false,
      motivo: `o agregador do completo ("${CHECK_AGREGADO}") não rodou na execução mais recente (${rotuloSuite(escolhida)}, run ${idTexto(ciCore)}) — o completo não está provado`,
    }
  }
  const agregado = melhorDoGrupo(escolhida.agregado)
  if (agregado.conclusion !== "success") {
    return {
      ok: false,
      motivo: `o PR CI completo está "${agregado.conclusion}": algum job dele (fast, ci-core ou e2e-stateful) falhou (${rotuloSuite(escolhida)}, run ${idTexto(agregado)})`,
    }
  }

  const doCompleto = `${rotuloSuite(escolhida)}, runs ${idTexto(ciCore)}, ${idTexto(agregado)}`
  const visuais = checkRuns.filter((run) => run?.name === CHECK_VISUAL)
  const tocaOApp = arquivos.some((caminho) =>
    CAMINHOS_DO_VISUAL.some((padrao) => padrao.test(caminho)),
  )

  if (!visuais.length) {
    if (tocaOApp) {
      return {
        ok: false,
        motivo: `o Visual Smoke não rodou e o PR toca apps/app — ele deveria ter rodado neste SHA (${doCompleto})`,
      }
    }
    return {
      ok: true,
      motivo: `PR CI completo verde; Visual Smoke pulado por paths (o PR não toca apps/app); ${doCompleto}`,
    }
  }

  const visualPendente = visuais.find((run) => run.status !== "completed")
  if (visualPendente) {
    return {
      ok: false,
      motivo: `o Visual Smoke ainda está "${visualPendente.status}" — execução em andamento (run ${idTexto(visualPendente)})`,
    }
  }

  const naoPulados = visuais.filter((run) => run.conclusion !== "skipped")
  if (!naoPulados.length) {
    if (tocaOApp) {
      return {
        ok: false,
        motivo: "o Visual Smoke foi pulado, mas o PR toca apps/app — pulo por paths não se aplica",
      }
    }
    return {
      ok: true,
      motivo: `PR CI completo verde; Visual Smoke pulado por paths; ${doCompleto}`,
    }
  }

  if (naoPulados.length > 1) {
    const semId = naoPulados.filter((run) => idDoRun(run) === null)
    if (semId.length) {
      return {
        ok: false,
        motivo: `há ${naoPulados.length} runs do Visual Smoke e ${semId.length} sem id; não dá para dizer qual é o mais recente`,
      }
    }
  }

  const visual = maisRecente(naoPulados)
  if (visual.conclusion !== "success") {
    return {
      ok: false,
      motivo: `o Visual Smoke está "${visual.conclusion}", não verde (run ${idTexto(visual)})`,
    }
  }

  return {
    ok: true,
    motivo: `PR CI completo, agregador e Visual Smoke verdes no mesmo SHA; ${doCompleto}, run ${idTexto(visual)}`,
  }
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
 * Todos os check runs do SHA, sem o filtro `latest`: agrupar por execução exige ver
 * as suítes antigas, e `latest` devolveria só o run mais novo de cada nome — que pode
 * ser de outra suíte que não a do agregado.
 */
async function checkRunsDoSha(fetchImpl, { repo, headSha, token }) {
  const runs = []
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const lote = await pedir(fetchImpl, {
      url: `${API}/repos/${repo}/commits/${headSha}/check-runs?filter=all&per_page=100&page=${pagina}`,
      token,
    })
    const itens = lote?.check_runs ?? []
    runs.push(...itens)
    if (itens.length < 100) break
  }
  return runs
}

/**
 * Confere e, se o veredito for verde, mergeia por squash no SHA conferido.
 * Não imprime: devolve o veredito para quem chamou decidir o log e o exit code.
 */
export async function mergeSeguro({ pr, repo, token, fetchImpl = fetch }) {
  const pull = await pedir(fetchImpl, { url: `${API}/repos/${repo}/pulls/${pr}`, token })
  const headSha = pull?.head?.sha
  const arquivos = await arquivosDoPr(fetchImpl, { repo, pr, token })
  const checkRuns = headSha ? await checkRunsDoSha(fetchImpl, { repo, headSha, token }) : []

  const veredito = avaliar({
    headSha,
    estado: pull?.state,
    checkRuns,
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
  let token
  try {
    token = obterToken()
  } catch (erro) {
    process.stderr.write(`merge-seguro: ${erro.message}\n`)
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
