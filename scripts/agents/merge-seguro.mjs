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
// aconteceu) e um check do rito sem `check_suite.id` recusa, porque não há como
// saber a que execução ele pertence. As execuções do PR CI são as que contêm o
// ci-core ou o agregador; entre elas vale a mais recente pelo id da suíte, tenha
// ou não ci-core — pular para uma suíte antiga verde esconderia o run novo — e
// nela o ci-core e o agregador precisam existir, estar terminados e verdes.
// Execução ainda não terminada em qualquer suíte do PR CI recusa: um verde antigo
// não pode autorizar o merge enquanto o run mais novo não acabou. Ids são
// comparados como BigInt, nunca por Number, e `completed_at` não decide nada (run
// cancelado sem data continuaria perdendo para um verde velho).
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

// Chave dos checks que o rito lê: qualquer um deles sem `check_suite.id` recusa,
// porque não há como saber a que execução pertence.
const CHECKS_DO_RITO = [CHECK_COMPLETO, CHECK_AGREGADO, CHECK_VISUAL]

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
const idDaSuite = (run) => paraId(run?.check_suite?.id)
const rotuloSuite = (suite) => (suite.id === null ? "sem id de suíte" : `suíte ${suite.id}`)
// Todo veredito que usa um check nomeia a execução e o run: suíte e run em texto.
const rotuloDoRun = (run) => `${rotuloSuite({ id: idDaSuite(run) })}, run ${idTexto(run)}`

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
    if (!CHECKS_DO_RITO.includes(run.name)) continue
    const idSuite = idDaSuite(run)
    if (idSuite === null) {
      return {
        ok: false,
        motivo: `check sem id de execução: "${run.name}" (run ${idTexto(run)}) está sem id de suíte — não dá para dizer a qual execução do PR CI ele pertence`,
      }
    }
    const chave = idSuite.toString()
    const suite = suites.get(chave) ?? { id: idSuite, runs: [] }
    suite.runs.push(run)
    suites.set(chave, suite)
  }

  // As execuções do PR CI são as suítes que contêm o ci-core ou o agregador.
  const execucoes = [...suites.values()]
    .map((suite) => ({
      id: suite.id,
      ci: doNome(suite.runs, CHECK_COMPLETO),
      agregado: doNome(suite.runs, CHECK_AGREGADO),
    }))
    .filter((execucao) => execucao.ci.length > 0 || execucao.agregado.length > 0)

  if (!execucoes.length) {
    return {
      ok: false,
      motivo: `o PR CI completo não rodou neste SHA (job ci-core ausente: check "${CHECK_COMPLETO}") — aplique a label ci:full e espere o run`,
    }
  }

  // Execução em andamento em qualquer suíte do PR CI recusa, mesmo que haja verde
  // antigo em outra: o run mais novo ainda pode mudar o resultado.
  for (const execucao of execucoes) {
    const run = [...execucao.ci, ...execucao.agregado].find((item) => item.status !== "completed")
    if (run) {
      return {
        ok: false,
        motivo: `o PR CI completo ainda está "${run.status}": o check "${run.name}" não terminou — execução em andamento (${rotuloSuite(execucao)}, run ${idTexto(run)})`,
      }
    }
  }

  // A execução mais nova do PR CI decide, tenha ou não ci-core.
  const escolhida = execucoes.reduce((melhor, execucao) =>
    execucao.id > melhor.id ? execucao : melhor,
  )
  const ciCore = escolhida.ci.length ? melhorDoGrupo(escolhida.ci) : null
  const agregado = escolhida.agregado.length ? melhorDoGrupo(escolhida.agregado) : null

  if (!ciCore) {
    return {
      ok: false,
      motivo: `o ci-core não rodou na execução mais nova do PR CI (${rotuloSuite(escolhida)}, agregador run ${idTexto(agregado)}) — o completo não está provado`,
    }
  }
  if (ciCore.conclusion !== "success") {
    return {
      ok: false,
      motivo: `o PR CI completo está "${ciCore.conclusion}", não verde (${rotuloSuite(escolhida)}, run ${idTexto(ciCore)})`,
    }
  }

  if (!agregado) {
    return {
      ok: false,
      motivo: `o agregador do completo ("${CHECK_AGREGADO}") não rodou na execução mais nova (${rotuloSuite(escolhida)}, run ${idTexto(ciCore)}) — o completo não está provado`,
    }
  }
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
      motivo: `o Visual Smoke ainda está "${visualPendente.status}" — execução em andamento (${rotuloDoRun(visualPendente)})`,
    }
  }

  const naoPulados = visuais.filter((run) => run.conclusion !== "skipped")
  if (!naoPulados.length) {
    if (tocaOApp) {
      return {
        ok: false,
        motivo: `o Visual Smoke foi pulado, mas o PR toca apps/app — pulo por paths não se aplica (${rotuloDoRun(visuais[0])})`,
      }
    }
    return {
      ok: true,
      motivo: `PR CI completo verde; Visual Smoke pulado por paths (${rotuloDoRun(maisRecente(visuais))}); ${doCompleto}`,
    }
  }

  if (naoPulados.length > 1) {
    const semId = naoPulados.filter((run) => idDoRun(run) === null)
    if (semId.length) {
      return {
        ok: false,
        motivo: `há ${naoPulados.length} runs do Visual Smoke e ${semId.length} sem id (${naoPulados.map(rotuloDoRun).join("; ")}); não dá para dizer qual é o mais recente`,
      }
    }
  }

  const visual = maisRecente(naoPulados)
  if (visual.conclusion !== "success") {
    return {
      ok: false,
      motivo: `o Visual Smoke está "${visual.conclusion}", não verde (${rotuloDoRun(visual)})`,
    }
  }

  return {
    ok: true,
    motivo: `PR CI completo, agregador e Visual Smoke verdes no mesmo SHA; ${doCompleto}; Visual ${rotuloDoRun(visual)}`,
  }
}

async function pedir(fetchImpl, { metodo = "GET", url, token, corpo, comCabecalhos = false }) {
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
  const dados = texto ? JSON.parse(texto) : {}
  return comCabecalhos ? { dados, cabecalhos: resposta.headers } : dados
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

// A lista de checks é paginada; parar numa página cheia com `next` decidiria sobre
// uma lista truncada. Lê até a última página e, se o teto acabar cheio, recusa.
const TETO_PAGINAS_CHECKS = 20
const TAMANHO_PAGINA_CHECKS = 100

/**
 * Todos os check runs do SHA, sem o filtro `latest`: agrupar por execução exige ver
 * as suítes antigas, e `latest` devolveria só o run mais novo de cada nome — que pode
 * ser de outra suíte que não a do agregado.
 */
async function checkRunsDoSha(fetchImpl, { repo, headSha, token }) {
  const runs = []
  let ultima = false
  for (let pagina = 1; pagina <= TETO_PAGINAS_CHECKS && !ultima; pagina += 1) {
    const { dados, cabecalhos } = await pedir(fetchImpl, {
      url: `${API}/repos/${repo}/commits/${headSha}/check-runs?filter=all&per_page=${TAMANHO_PAGINA_CHECKS}&page=${pagina}`,
      token,
      comCabecalhos: true,
    })
    const itens = dados?.check_runs ?? []
    runs.push(...itens)
    const temProxima = /rel="next"/.test(cabecalhos?.get?.("link") ?? "")
    ultima = itens.length < TAMANHO_PAGINA_CHECKS || !temProxima
  }
  if (!ultima) {
    throw new Error(
      `a lista de check-runs do SHA encheu ${TETO_PAGINAS_CHECKS} páginas e ainda havia uma próxima: ${runs.length} runs lidos, lista truncada — recusando para não decidir com evidência parcial`,
    )
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
      process.stdout.write(
        `merge-seguro: PR #${pr} mergeado por squash em ${veredito.mergeSha}\nmerge-seguro: ${veredito.motivo}\n`,
      )
      return 0
    }
    // Sem merged e sem recusa: não acontece hoje, mas nunca devolve verde sem merge.
    process.stderr.write(
      `merge-seguro: veredito verde sem merge; nada foi feito — ${veredito.motivo}\n`,
    )
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
