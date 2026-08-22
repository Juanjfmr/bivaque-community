const filters = [
  ["all", "Todas"],
  ["backend", "Backend"],
  ["intelligence", "Discovery & IA"],
  ["infra", "Infra"],
  ["frontend", "Frontend congelado"],
  ["repo", "Repo / PRs"],
  ["governance", "Governança"],
  ["drift", "Com drift"],
]

const columns = [
  ["now", "AGORA", "Caminho crítico até o lançamento"],
  ["next", "PRÓXIMO", "Entra após fechar suas dependências"],
  ["blocked", "BLOQUEADO", "Exige decisão, credencial ou terceiro"],
  ["frozen", "FRONTEND CONGELADO", "Conhecido, fora da trilha backend-first"],
  ["repo", "TRIAGEM DO REPO", "Decisões de PR, issue, CI e governança"],
  ["done", "DONE", "Evidência preservada; não desaparece"],
]

const categoryLabels = {
  backend: "backend",
  frontend: "frontend",
  governance: "governança",
  infra: "infra",
  intelligence: "discovery & IA",
  repo: "repositório",
}

let board
let activeFilter = "all"
let query = ""

const cardTemplate = document.querySelector("#card-template")
const boardElement = document.querySelector("#board")
const metricsElement = document.querySelector("#metrics")
const filtersElement = document.querySelector("#filters")
const summaryElement = document.querySelector("#result-summary")

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

function list(title, values) {
  if (!values?.length) return ""
  return `<section><h4>${title}</h4><ul>${values.map((item) => `<li>${item}</li>`).join("")}</ul></section>`
}

function linkedList(title, values) {
  if (!values?.length) return ""
  const entries = values.map((value) => {
    const [label, url] = value.split(" | ")
    return url?.startsWith("http")
      ? `<li><a href="${url}" target="_blank" rel="noreferrer">${label}</a></li>`
      : `<li><code>${value}</code></li>`
  })
  return `<section><h4>${title}</h4><ul>${entries.join("")}</ul></section>`
}

function searchable(card) {
  return JSON.stringify(card).toLocaleLowerCase("pt-BR")
}

function matches(card) {
  const filterMatches =
    activeFilter === "all" ||
    (activeFilter === "drift" ? Boolean(card.drift) : card.category === activeFilter)
  return filterMatches && searchable(card).includes(query.toLocaleLowerCase("pt-BR"))
}

function createCard(card) {
  const fragment = cardTemplate.content.cloneNode(true)
  const cardElement = fragment.querySelector(".card")
  cardElement.dataset.cardId = card.id
  cardElement.querySelector(".priority").textContent = card.priority
  cardElement.querySelector(".priority").classList.add(`priority-${card.priority.toLowerCase()}`)
  cardElement.querySelector(".category").textContent = categoryLabels[card.category]
  cardElement.querySelector(".phase").textContent = card.phase ?? card.id
  cardElement.querySelector(".card-title").textContent = card.title
  cardElement.querySelector(".description").textContent = card.description

  const signals = []
  if (card.blockers?.length)
    signals.push(`<span class="signal signal-block">${card.blockers.length} bloqueio(s)</span>`)
  if (card.drift) signals.push('<span class="signal signal-drift">drift documentado</span>')
  if (card.proof?.length) signals.push(`<span class="signal">${card.proof.length} prova(s)</span>`)
  cardElement.querySelector(".card-signals").innerHTML = signals.join("")

  const drift = card.drift
    ? `<section class="drift"><h4>Drift a reconciliar</h4><p><strong>Documentado:</strong> ${card.drift.documented}</p><p><strong>Observado:</strong> ${card.drift.observed}</p><p><strong>Ação:</strong> ${card.drift.action}</p></section>`
    : ""
  const metadata = [
    card.owner && `<span><strong>Owner:</strong> ${card.owner}</span>`,
    card.branch && `<span><strong>Branch:</strong> ${card.branch}</span>`,
    card.updatedAt && `<span><strong>Atualizado:</strong> ${card.updatedAt}</span>`,
    card.sourceRevision &&
      `<span><strong>Fonte confrontada:</strong> <code>${card.sourceRevision}</code></span>`,
    card.completedAt && `<span><strong>Concluído:</strong> ${card.completedAt}</span>`,
  ].filter(Boolean)

  cardElement.querySelector(".card-detail").innerHTML = [
    metadata.length ? `<p class="metadata">${metadata.join("")}</p>` : "",
    list("Dependências", card.dependencies),
    list("Checklist de fechamento", card.checklist),
    list("Provas existentes", card.proof),
    list("Testes", card.tests),
    list("Bloqueadores", card.blockers),
    drift,
    linkedList("Referências", card.links),
  ].join("")
  return fragment
}

function renderMetrics() {
  const p0p1 = board.cards.filter((card) => card.priority === "P0" || card.priority === "P1").length
  const blocked = board.cards.filter((card) => card.status === "blocked").length
  const done = board.cards.filter((card) => card.status === "done").length
  const drift = board.cards.filter((card) => card.drift).length
  const metrics = [
    [board.cards.length, "frentes mapeadas"],
    [p0p1, "P0 / P1"],
    [blocked, "bloqueadas"],
    [done, "concluídas"],
    [drift, "drifts abertos"],
  ]
  metricsElement.innerHTML = metrics
    .map(([value, label]) => `<article><strong>${value}</strong><span>${label}</span></article>`)
    .join("")
}

function renderFilters() {
  filtersElement.replaceChildren()
  for (const [value, label] of filters) {
    const button = document.createElement("button")
    button.type = "button"
    button.textContent = label
    button.classList.toggle("is-active", activeFilter === value)
    button.setAttribute("aria-pressed", String(activeFilter === value))
    button.addEventListener("click", () => {
      activeFilter = value
      render()
    })
    filtersElement.append(button)
  }
}

function renderBoard() {
  const visible = board.cards.filter(matches)
  boardElement.replaceChildren()
  for (const [status, title, description] of columns) {
    const cards = visible.filter((card) => card.status === status)
    const column = document.createElement("section")
    column.className = "column"
    column.dataset.status = status
    column.innerHTML = `<header><div><h2>${title}</h2><p>${description}</p></div><span>${cards.length}</span></header>`
    const cardsElement = document.createElement("div")
    cardsElement.className = "cards"
    if (cards.length) {
      cards.forEach((card) => {
        cardsElement.append(createCard(card))
      })
    } else {
      cardsElement.innerHTML = '<p class="empty-column">Nenhum card com este filtro.</p>'
    }
    column.append(cardsElement)
    boardElement.append(column)
  }
  summaryElement.textContent = `${plural(visible.length, "card encontrado", "cards encontrados")} no filtro atual.`
}

function render() {
  renderFilters()
  renderBoard()
}

async function start() {
  const response = await fetch("./board.json", { cache: "no-store" })
  if (!response.ok) throw new Error("Não foi possível carregar board.json")
  board = await response.json()
  document.querySelector("#updated-at").textContent = `Snapshot: ${board.updatedAt}`
  renderMetrics()
  render()
  document.querySelector("#search").addEventListener("input", (event) => {
    query = event.target.value.trim()
    renderBoard()
  })
}

start().catch((error) => {
  boardElement.innerHTML = `<p class="load-error">Falha ao carregar o quadro: ${error.message}</p>`
})
