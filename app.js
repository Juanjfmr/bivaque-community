const names = { frontend: "Frontend", backend: "Backend", integration: "Jornada completa" }
const labels = {
  pending: "A fazer",
  partial: "Em andamento",
  unverified: "A comprovar",
  verified: "Comprovado",
  blocked: "Bloqueado",
  failed: "Falha na verificação",
  declared: "Conclusão registrada",
}
const checkLabels = {
  success: "verificações passaram",
  failure: "verificação com falha",
  pending: "verificação pendente",
  inconclusive: "verificação inconclusiva",
}
const gateNames = {
  "LAN-OP": "Operação e atendimento",
  "LAN-TROCA": "Troca das telas antigas",
  "LAN-PROVA": "Prova final e ratificação",
  "BLOCK-LEGAL-ENTRY": "Revisão dos textos legais",
  "BLOCK-RESEND": "Entrega real de e-mails",
  "LAN-LOJA": "Pacote Android e iOS para envio",
}
const filters = [
  ["all", "Todas"],
  ["remaining", "O que falta"],
  ["verified", "Comprovadas"],
  ["blocked", "Bloqueadas"],
  ["failed", "Com falha"],
]
const $ = (selector) => document.querySelector(selector)
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  )
const badge = (status, label = labels[status]) =>
  `<span class="badge badge-${escapeHtml(status)}">${escapeHtml(label)}</span>`
const date = (value) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? "Não informado"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(parsed)
}
const safeGithub = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === "github.com" ? url.href : null
  } catch {
    return null
  }
}
let report
let filter = "all"
let layer = "integration"
let query = ""
let busy = false

function currentStatus(journey) {
  return layer === "integration" ? journey.status : journey[layer].status
}

function renderJourneys() {
  const focusedId = document.activeElement?.closest(".journey")?.dataset.id
  const open = new Set(
    [...document.querySelectorAll(".journey[open]")].map((element) => element.dataset.id),
  )
  const visible = report.journeys.filter((journey) => {
    const status = currentStatus(journey)
    const matchesFilter =
      filter === "all" ||
      (filter === "remaining"
        ? !journey[layer].verified
        : filter === "blocked"
          ? journey.blocked
          : status === filter)
    return (
      matchesFilter &&
      `${journey.id} ${journey.title} ${journey.nextStep}`
        .toLocaleLowerCase("pt-BR")
        .includes(query)
    )
  })
  $("#result-summary").textContent =
    `${visible.length} de ${report.journeys.length} funcionalidades · ${names[layer]}. Os filtros não alteram o percentual do escopo.`
  $("#journey-list").innerHTML = visible.length
    ? visible
        .map(
          (
            journey,
          ) => `<details class="journey" data-id="${escapeHtml(journey.id)}" ${open.has(journey.id) ? "open" : ""}>
    <summary><span class="journey-id">${escapeHtml(journey.id)}</span><h3>${escapeHtml(journey.title)}</h3>${badge(currentStatus(journey))}</summary>
    <div class="journey-body"><div class="layer-grid">${Object.entries(names)
      .map(([key, name]) => {
        const state = journey[key]
        return `<div class="layer-detail"><h4>${name}</h4>${badge(state.status)}<p>${state.declared ? "Implementação registrada como concluída." : "Implementação ainda não concluída no quadro atual."}</p><p>${state.evidenceCount ? `${state.evidenceCount} referência(s) de aceite · ${state.evidenceCurrent ? "fonte compatível" : "precisa reconferir a versão"}.` : "Sem aceite estruturado vinculado a esta camada."}</p><p class="card-ids">Cards: ${state.cards.map(escapeHtml).join(" · ")}</p></div>`
      })
      .join(
        "",
      )}</div><p class="journey-next"><strong>${journey.integration.verified ? "Entrega comprovada." : "Falta:"}</strong> ${journey.integration.verified ? "Requisitos gerais e publicação são acompanhados separadamente." : escapeHtml(journey.nextStep)}</p></div></details>`,
        )
        .join("")
    : '<p class="empty">Nenhuma funcionalidade corresponde a este filtro. Tente “Todas” ou limpe a busca.</p>'
  if (focusedId) {
    ;[...document.querySelectorAll(".journey")]
      .find((element) => element.dataset.id === focusedId)
      ?.querySelector("summary")
      ?.focus({ preventScroll: true })
  }
}

function renderFilters() {
  $("#filters").replaceChildren(
    ...filters.map(([value, label]) => {
      const button = document.createElement("button")
      button.type = "button"
      button.textContent = label
      button.setAttribute("aria-pressed", String(filter === value))
      button.addEventListener("click", () => {
        filter = value
        for (const sibling of $("#filters").children)
          sibling.setAttribute("aria-pressed", String(sibling === button))
        renderJourneys()
      })
      return button
    }),
  )
}

function renderReport() {
  const overall = report.metrics.integration
  $("#stage").innerHTML = badge("partial", report.stage)
  $("#overall-percent").textContent = `${overall.percent}%`
  $("#overall-count").textContent =
    `${overall.verified} de ${overall.total} jornadas com o ciclo completo comprovado`
  $("#remaining-percent").textContent = `${100 - overall.percent}%`
  $("#overall-progress").value = overall.percent
  $("#provisional").hidden = !report.provisional
  $("#layer-metrics").innerHTML = Object.entries(names)
    .map(([key, name]) => {
      const metric = report.metrics[key]
      const caption =
        key === "frontend"
          ? "Telas, interações e apresentação"
          : key === "backend"
            ? "Dados, regras e persistência"
            : "A experiência funcionando inteira"
      return `<article class="layer-metric"><span class="metric-label">${name}</span><strong>${metric.percent}%</strong><p>${caption}</p><small>${metric.verified}/${metric.total} comprovadas · ${metric.declared}/${metric.total} com conclusão registrada</small></article>`
    })
    .join("")
  $("#next-title").textContent = report.nextStep
  $("#journey-count").textContent = `${overall.total} jornadas no escopo Web`
  const pendingGates = report.gates.filter((gate) => gate.status !== "verified")
  $("#gate-count").textContent = `${pendingGates.length} condições a comprovar`
  $("#gate-list").innerHTML = report.gates
    .map(
      (gate) =>
        `<article class="gate"><div><h3>${escapeHtml(gateNames[gate.id] ?? gate.title)}</h3><p class="card-ids">${escapeHtml(gate.id)}</p></div>${badge(gate.status)}</article>`,
    )
    .join("")
  const production = report.production
  $("#version-info").innerHTML =
    `<div><p>Código analisado</p><strong>${escapeHtml(report.revision.slice(0, 12))}</strong></div><div><p>Última consulta automática</p><strong>${escapeHtml(date(report.generatedAt))}</strong></div><div><p>Aplicativo publicado</p><strong>${production ? escapeHtml(production.revision.slice(0, 12)) : "Publicação ainda não confirmada"}</strong>${production ? `<p>${production.revision === report.revision ? "Mesma versão analisada; publicação não substitui prova de uso." : "Versão diferente da analisada."}</p>` : ""}</div>`
  $("#check-list").innerHTML = Object.entries(names)
    .map(([key, name]) => {
      const check = report.checks[key]
      const url = check?.urls?.map(safeGithub).find(Boolean)
      const content = `${name}: ${checkLabels[check?.status ?? "pending"]}`
      return url
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(content)} ↗</a>`
        : `<span>${escapeHtml(content)}</span>`
    })
    .join("")
  $("#scope-version").textContent =
    `Escopo ${report.scopeVersion} · ${report.source} · Quadro atualizado em ${report.boardUpdatedAt}.`
  $("#changes-section").hidden = !report.changes.length
  $("#changes").innerHTML = report.changes
    .map((change) => `<li>${escapeHtml(change.title)}</li>`)
    .join("")
  renderJourneys()
}

function freshness() {
  if (!report) return
  const age = Date.now() - new Date(report.generatedAt).getTime()
  const stale = !Number.isFinite(age) || age > 3 * 60 * 60 * 1000
  const message = report.refreshError
    ? "Consulta à origem inconclusiva. Os números não representam uma nova comprovação."
    : stale
      ? "O retrato tem mais de 3 horas. A atualização automática precisa ser conferida."
      : ""
  $("#load-message").textContent = message
  $("#load-message").hidden = !message
  $("#sync-state").textContent = report.refreshError
    ? "Origem indisponível"
    : stale
      ? "Dados desatualizados"
      : `Consultado: ${date(report.generatedAt)}`
}

async function refresh() {
  if (busy) return
  busy = true
  $("#refresh").disabled = true
  try {
    const response = await fetch("./snapshot.json", {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) throw new Error("snapshot indisponível")
    const next = await response.json()
    if (next.schemaVersion !== 1 || !next.journeys?.length || !next.metrics?.integration)
      throw new Error("snapshot inválido")
    report = next
    $("#dashboard").hidden = false
    renderReport()
    freshness()
  } catch {
    $("#load-message").hidden = false
    $("#load-message").textContent = report
      ? "Não foi possível atualizar. O último retrato continua visível, com sua data original. Tente novamente."
      : "Não foi possível carregar o painel. Use “Atualizar agora” para tentar novamente."
    $("#sync-state").textContent = "Atualização indisponível"
  } finally {
    busy = false
    $("#refresh").disabled = false
  }
}

$("#refresh").addEventListener("click", refresh)
$("#search").addEventListener("input", (event) => {
  query = event.target.value.trim().toLocaleLowerCase("pt-BR")
  if (report) renderJourneys()
})
$("#layer").addEventListener("change", (event) => {
  layer = event.target.value
  if (report) renderJourneys()
})
renderFilters()
refresh()
setInterval(() => {
  if (!document.hidden) refresh()
}, 60000)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refresh()
})
