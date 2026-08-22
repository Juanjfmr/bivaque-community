const priorities = new Set(["P0", "P1", "P2", "P3", "BLOCK", "HOLD"])
const categories = new Set(["backend", "intelligence", "infra", "frontend", "repo", "governance"])
const statuses = new Set(["now", "next", "blocked", "frozen", "repo", "done"])

const priorityOrder = new Map([
  ["P0", 0],
  ["BLOCK", 1],
  ["P1", 2],
  ["HOLD", 3],
  ["P2", 4],
  ["P3", 5],
])

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function validateStringArray(errors, card, field, { required = false } = {}) {
  const value = card[field]
  if (!Array.isArray(value)) {
    if (required) errors.push(`${card.id ?? "card sem id"}: ${field} deve ser um array`)
    return
  }
  if (required && value.length === 0) {
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
    for (const field of ["id", "title", "priority", "category", "status", "description"]) {
      if (!isNonEmptyString(card[field]))
        errors.push(`${card.id ?? "card sem id"}: ${field} é obrigatório`)
    }
    if (ids.has(card.id)) errors.push(`${card.id}: id duplicado`)
    ids.add(card.id)
    if (!priorities.has(card.priority)) errors.push(`${card.id}: priority inválida`)
    if (!categories.has(card.category)) errors.push(`${card.id}: category inválida`)
    if (!statuses.has(card.status)) errors.push(`${card.id}: status inválido`)

    validateStringArray(errors, card, "checklist", { required: true })
    validateStringArray(errors, card, "proof")
    validateStringArray(errors, card, "tests")
    validateStringArray(errors, card, "blockers")
    validateStringArray(errors, card, "links")

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
    }
  }
  return errors
}

function sorted(cards) {
  return [...cards].sort((left, right) => {
    const priority =
      (priorityOrder.get(left.priority) ?? 99) - (priorityOrder.get(right.priority) ?? 99)
    return priority || left.id.localeCompare(right.id, "pt-BR")
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
    "Use o ID abaixo para consultar o card completo em `public/board.json` antes de planejar ou implementar.",
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
    "```",
    "",
  )
  return `${lines.join("\n").trimEnd()}\n`
}
