const priorities = new Set(["P0", "P1", "P2", "P3", "BLOCK", "HOLD"])
const categories = new Set([
  "backend",
  "intelligence",
  "infra",
  "frontend",
  "repo",
  "governance",
  "testing",
])
const statuses = new Set(["now", "next", "blocked", "frozen", "repo", "done"])

const priorityOrder = new Map([
  ["P0", 0],
  ["BLOCK", 1],
  ["P1", 2],
  ["HOLD", 3],
  ["P2", 4],
  ["P3", 5],
])

const statusOrder = new Map([
  ["now", 0],
  ["repo", 1],
  ["next", 2],
  ["blocked", 3],
  ["frozen", 4],
  ["done", 5],
])

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function validateStringArray(errors, card, field, { required = false, nonEmpty = false } = {}) {
  const value = card[field]
  if (!Array.isArray(value)) {
    if (required) errors.push(`${card.id ?? "card sem id"}: ${field} deve ser um array`)
    return
  }
  if (nonEmpty && value.length === 0) {
    errors.push(`${card.id}: ${field} não pode ficar vazio`)
  }
  if (value.some((item) => !isNonEmptyString(item))) {
    errors.push(`${card.id}: ${field} aceita apenas strings não vazias`)
  }
}

export function validateBoard(board) {
  const errors = []
  if (!board || typeof board !== "object" || Array.isArray(board)) {
    return ["board deve ser um objeto"]
  }
  for (const field of ["title", "updatedAt", "sourcePolicy"]) {
    if (!isNonEmptyString(board[field])) errors.push(`${field} é obrigatório`)
  }
  if (!Array.isArray(board.cards) || board.cards.length === 0) {
    errors.push("cards deve ser um array não vazio")
    return errors
  }

  const ids = new Set()
  for (const card of board.cards) {
    if (!card || typeof card !== "object" || Array.isArray(card)) {
      errors.push("todo card deve ser um objeto")
      continue
    }
    for (const field of [
      "id",
      "title",
      "priority",
      "category",
      "status",
      "description",
      "updatedAt",
      "sourceRevision",
    ]) {
      if (!isNonEmptyString(card[field]))
        errors.push(`${card.id ?? "card sem id"}: ${field} é obrigatório`)
    }
    if (ids.has(card.id)) errors.push(`${card.id}: id duplicado`)
    ids.add(card.id)
    if (!priorities.has(card.priority)) errors.push(`${card.id}: priority inválida`)
    if (!categories.has(card.category)) errors.push(`${card.id}: category inválida`)
    if (!statuses.has(card.status)) errors.push(`${card.id}: status inválido`)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(card.updatedAt ?? "")) {
      errors.push(`${card.id}: updatedAt deve usar YYYY-MM-DD`)
    }
    if (!/^[0-9a-f]{7,40}$/i.test(card.sourceRevision ?? "")) {
      errors.push(`${card.id}: sourceRevision deve ser um commit Git abreviado ou completo`)
    }

    validateStringArray(errors, card, "checklist", { required: true, nonEmpty: true })
    validateStringArray(errors, card, "dependencies", { required: true })
    validateStringArray(errors, card, "proof")
    validateStringArray(errors, card, "tests")
    validateStringArray(errors, card, "blockers")
    validateStringArray(errors, card, "links")

    const hasSourceEvidence =
      (Array.isArray(card.proof) && card.proof.length > 0) ||
      (Array.isArray(card.links) && card.links.length > 0)
    if (!hasSourceEvidence) {
      errors.push(`${card.id}: card precisa de proof ou links como evidência de origem`)
    }

    if (
      card.status === "blocked" &&
      (!Array.isArray(card.blockers) || card.blockers.length === 0)
    ) {
      errors.push(`${card.id}: card bloqueado precisa registrar blockers`)
    }
    if (card.status === "done") {
      if (!isNonEmptyString(card.completedAt))
        errors.push(`${card.id}: card done precisa de completedAt`)
      if (!Array.isArray(card.proof) || card.proof.length === 0) {
        errors.push(`${card.id}: card done precisa de proof`)
      }
    }
    if (card.drift) {
      for (const field of ["documented", "observed", "action"]) {
        if (!isNonEmptyString(card.drift[field]))
          errors.push(`${card.id}: drift.${field} é obrigatório`)
      }
      if (card.status === "done") {
        errors.push(`${card.id}: card done não pode manter drift aberto`)
      }
    }
  }

  for (const card of board.cards) {
    if (!Array.isArray(card?.dependencies)) continue
    const dependencies = new Set()
    for (const dependency of card.dependencies) {
      if (dependency === card.id) errors.push(`${card.id}: não pode depender de si mesmo`)
      if (!ids.has(dependency)) errors.push(`${card.id}: dependência inexistente ${dependency}`)
      if (dependencies.has(dependency))
        errors.push(`${card.id}: dependência duplicada ${dependency}`)
      dependencies.add(dependency)
    }
  }
  return errors
}

export function findCard(board, id) {
  return board.cards.find((card) => card.id === id)
}

export function searchCards(board, query) {
  const normalized = query.trim().toLocaleLowerCase("pt-BR")
  if (!normalized) return []
  return sorted(
    board.cards.filter((card) =>
      JSON.stringify(card).toLocaleLowerCase("pt-BR").includes(normalized),
    ),
  )
}

export function selectNextCard(board) {
  const cardsById = new Map(board.cards.map((card) => [card.id, card]))
  const candidates = board.cards.filter((card) => {
    if (["blocked", "done", "frozen"].includes(card.status)) return false
    return (card.dependencies ?? []).every((dependencyId) => {
      const dependency = cardsById.get(dependencyId)
      if (!dependency) return false
      return dependency.status === "done"
    })
  })
  return sorted(candidates)[0]
}

export function renderNextCard(board) {
  const card = selectNextCard(board)
  if (!card) {
    return [
      "Nenhum card autonomamente executável.",
      "",
      "Verifique bloqueios humanos ou dependências abertas antes de abrir trabalho novo.",
      "",
    ].join("\n")
  }
  const dependencies = card.dependencies.length ? card.dependencies.join(", ") : "nenhuma"
  const drift = card.drift
    ? [
        "",
        "Drift aberto:",
        `- Documentado: ${card.drift.documented}`,
        `- Observado: ${card.drift.observed}`,
        `- Resolver agora: ${card.drift.action}`,
      ].join("\n")
    : ""
  return [
    `${card.id}\t${card.status}\t${card.priority}\t${card.title}`,
    "",
    "Contrato do agente:",
    "- resolver o card escolhido; drift é evidência temporária, não entrega final",
    "- antes de implementar: ler AGENTS.md, docs/BIVAQUE.md, docs/PRODUCT_STATUS.md e BOARD.md",
    `- abrir o detalhe: node tools/backend-kanban/src/board.mjs --card ${card.id}`,
    "- ao terminar: atualizar board.json, regenerar BOARD.md, validar e commitar junto da mudança",
    "",
    `Dependências fechadas: ${dependencies}`,
    `Testes esperados: ${card.tests?.length ? card.tests.join("; ") : "definir pelo risco do card"}`,
    drift,
    "",
  ].join("\n")
}

function sorted(cards) {
  return [...cards].sort((left, right) => {
    const status = (statusOrder.get(left.status) ?? 99) - (statusOrder.get(right.status) ?? 99)
    const priority =
      (priorityOrder.get(left.priority) ?? 99) - (priorityOrder.get(right.priority) ?? 99)
    const drift = Number(Boolean(right.drift)) - Number(Boolean(left.drift))
    return status || priority || drift || left.id.localeCompare(right.id, "pt-BR")
  })
}

function cardLine(card, detail) {
  const suffix = detail ? ` — ${detail}` : ""
  return `- **${card.id}** · ${card.priority} · ${card.title}${suffix}`
}

function section(lines, title, cards, detailFor) {
  lines.push(`## ${title}`, "")
  if (cards.length === 0) {
    lines.push("Nenhum card.", "")
    return
  }
  for (const card of sorted(cards)) lines.push(cardLine(card, detailFor?.(card)))
  lines.push("")
}

export function renderBoardSummary(board) {
  const counts = new Map([...statuses].map((status) => [status, 0]))
  for (const card of board.cards) counts.set(card.status, (counts.get(card.status) ?? 0) + 1)
  const lines = [
    "# Bivaque — resumo operacional do MVP",
    "",
    "<!-- Gerado por tools/backend-kanban/src/board.mjs. Não editar manualmente. -->",
    "",
    `**Snapshot:** ${board.updatedAt}`,
    "",
    `> ${board.sourcePolicy}`,
    "",
    `**Mapa:** ${board.cards.length} frentes · ${counts.get("now")} agora · ${counts.get("blocked")} bloqueadas · ${counts.get("done")} concluídas · ${board.cards.filter((card) => card.drift).length} drifts`,
    "",
    "Para trabalho autônomo, rode `node tools/backend-kanban/src/board.mjs --next` e resolva um card por commit. Drift é evidência temporária; não é fechamento.",
    "",
    "Use o ID abaixo com `node tools/backend-kanban/src/board.mjs --card <ID>` antes de planejar ou implementar.",
    "",
  ]

  section(
    lines,
    "Agora",
    board.cards.filter((card) => card.status === "now"),
  )
  section(
    lines,
    "Bloqueios",
    board.cards.filter((card) => card.status === "blocked"),
    (card) => card.blockers?.join("; "),
  )
  section(
    lines,
    "Drift aberto",
    board.cards.filter((card) => card.drift),
    (card) => card.drift.action,
  )
  section(
    lines,
    "Triagem prioritária",
    board.cards.filter(
      (card) => card.status === "repo" && ["P0", "P1", "BLOCK"].includes(card.priority),
    ),
  )
  lines.push(
    "## Comandos",
    "",
    "```sh",
    "node tools/backend-kanban/src/board.mjs --check",
    "node tools/backend-kanban/src/board.mjs --write-summary",
    "node tools/backend-kanban/src/board.mjs --next",
    "node tools/backend-kanban/src/board.mjs --card MVP-02-AUTHZ",
    'node tools/backend-kanban/src/board.mjs --search "service_role"',
    "```",
    "",
  )
  return `${lines.join("\n").trimEnd()}\n`
}
