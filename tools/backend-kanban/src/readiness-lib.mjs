export const layers = ["frontend", "backend", "integration"]

export function validateLaunch(board) {
  const errors = []
  const launch = board.launch
  if (!launch) return ["launch é obrigatório"]
  for (const key of ["version", "title", "source"]) {
    if (typeof launch[key] !== "string" || !launch[key].trim())
      errors.push(`launch.${key} é obrigatório`)
  }
  if (!Array.isArray(launch.journeys) || !launch.journeys.length)
    return [...errors, "launch.journeys não pode ficar vazio"]
  const cards = new Map(board.cards.filter(Boolean).map((card) => [card.id, card]))
  const ids = new Set()
  for (const journey of launch.journeys) {
    if (!journey || typeof journey !== "object") {
      errors.push("journey deve ser um objeto")
      continue
    }
    if (!/^F\d{2}$/.test(journey.id)) errors.push("journey.id deve usar F01 a F99")
    if (ids.has(journey.id)) errors.push(`${journey.id}: id duplicado`)
    ids.add(journey.id)
    if (!journey.title || !journey.nextStep)
      errors.push(`${journey.id}: título e próximo passo obrigatórios`)
    for (const field of ["frontend", "backend"]) {
      if (!Array.isArray(journey[field]) || !journey[field].length)
        errors.push(`${journey.id}: ${field} sem cards`)
    }
    for (const id of [
      journey.cardId,
      ...(Array.isArray(journey.frontend) ? journey.frontend : []),
      ...(Array.isArray(journey.backend) ? journey.backend : []),
    ]) {
      if (!cards.has(id)) errors.push(`${journey.id}: referência inexistente ${id}`)
    }
  }
  for (const card of cards.values()) {
    const acceptance = card.acceptance
    for (const layer of layers) {
      const proof = acceptance?.[layer]
      if (
        proof &&
        (!/^[a-f0-9]{40}$/i.test(proof.revision ?? "") ||
          typeof proof.scopeVersion !== "string" ||
          !proof.scopeVersion.trim() ||
          !Array.isArray(proof.proof) ||
          !proof.proof.length ||
          proof.proof.some((p) => typeof p !== "string" || !p.trim()))
      ) {
        errors.push(`${card.id}: acceptance.${layer} exige revisão completa, escopo e referências`)
      }
    }
  }
  if (!Array.isArray(launch.gates)) errors.push("launch.gates deve ser um array")
  for (const id of Array.isArray(launch.gates) ? launch.gates : [])
    if (!cards.has(id)) errors.push(`gate inexistente ${id}`)
  return errors
}

function declared(cards, ids) {
  return ids.every((id) => {
    const card = cards.get(id)
    return card?.status === "done" && !card.drift && card.proof?.length > 0
  })
}

function layerState(journey, layer, cards, context) {
  const card = cards.get(journey.cardId)
  const ids = layer === "integration" ? [journey.cardId] : journey[layer]
  const acceptance = card.acceptance?.[layer]
  const check = context.checks?.[layer]
  const currentCheck = check?.revision === context.revision
  const currentProof = Boolean(
    acceptance &&
      context.evidenceValid?.[`${journey.id}:${layer}`] === true &&
      acceptance.scopeVersion === context.scopeVersion &&
      (acceptance.revision === context.revision ||
        context.unchanged?.[`${journey.id}:${layer}`] === true),
  )
  const hasDrift = [journey.cardId, ...ids].some((id) => cards.get(id)?.drift)
  const implemented =
    !hasDrift && (declared(cards, ids) || (layer !== "integration" && currentProof))
  const verified = Boolean(
    implemented && currentProof && currentCheck && check.status === "success",
  )
  let status = implemented ? "unverified" : "pending"
  if (!implemented && ids.some((id) => ["now", "done"].includes(cards.get(id)?.status)))
    status = "partial"
  if (currentCheck && check.status === "failure") status = "failed"
  if (verified) status = "verified"
  return {
    status,
    declared: implemented,
    verified,
    evidenceCount: acceptance?.proof?.length ?? 0,
    evidenceRevision: acceptance?.revision ?? null,
    evidenceCurrent: currentProof,
    cards: ids,
  }
}

export function buildReadiness(board, context) {
  const errors = validateLaunch(board)
  if (errors.length) throw new Error(errors.join("\n"))
  const cards = new Map(board.cards.map((card) => [card.id, card]))
  const proofContext = { ...context, scopeVersion: board.launch.version }
  const journeys = board.launch.journeys.map((journey) => {
    const result = {
      id: journey.id,
      title: journey.title,
      cardId: journey.cardId,
      nextStep: journey.nextStep,
    }
    for (const layer of layers) result[layer] = layerState(journey, layer, cards, proofContext)
    result.integration.verified &&= result.frontend.verified && result.backend.verified
    if (result.integration.status === "verified" && !result.integration.verified)
      result.integration.status = "unverified"
    const card = cards.get(journey.cardId)
    result.blocked =
      card.status === "blocked" ||
      (card.dependencies ?? []).some((id) => cards.get(id)?.status === "blocked")
    result.status = result.integration.verified
      ? "verified"
      : result.blocked
        ? "blocked"
        : layers.some((layer) => result[layer].status === "failed")
          ? "failed"
          : result.frontend.declared && result.backend.declared
            ? "unverified"
            : layers.some((layer) =>
                  ["partial", "verified", "unverified"].includes(result[layer].status),
                )
              ? "partial"
              : "pending"
    return result
  })
  const metrics = Object.fromEntries(
    layers.map((layer) => {
      const verified = journeys.filter((j) => j[layer].verified).length
      return [
        layer,
        {
          verified,
          declared: journeys.filter((j) => j[layer].declared).length,
          total: journeys.length,
          percent: Math.floor((verified * 100) / journeys.length),
        },
      ]
    }),
  )
  const gates = board.launch.gates.map((id) => {
    const card = cards.get(id)
    const state = layerState({ id, cardId: id }, "integration", cards, proofContext)
    return {
      id,
      title: card.title,
      status: state.verified
        ? "verified"
        : card.status === "done"
          ? "declared"
          : card.status === "blocked"
            ? "blocked"
            : "pending",
    }
  })
  const verified = metrics.integration.verified
  const hasImplementationWork = journeys.some((j) => !j.frontend.declared || !j.backend.declared)
  const stage =
    verified === journeys.length
      ? gates.every((gate) => gate.status === "verified")
        ? "Pronto para revisão de publicação"
        : "Aguardando requisitos de lançamento"
      : hasImplementationWork
        ? "Em construção"
        : "Em validação"
  const previous = context.previous
  const changes = []
  if (previous?.scopeVersion && previous.scopeVersion !== board.launch.version)
    changes.push({
      kind: "scope",
      title: "Escopo atualizado; compare os totais antes de comparar percentuais.",
    })
  for (const journey of journeys) {
    const before = previous?.journeys?.find((j) => j.id === journey.id)
    if (before && before.integration.verified !== journey.integration.verified)
      changes.push({
        kind: journey.integration.verified ? "completed" : "regression",
        title: `${journey.title}: ${journey.integration.verified ? "comprovação concluída" : "comprovação precisa ser refeita"}.`,
      })
  }
  return {
    schemaVersion: 1,
    title: board.launch.title,
    scopeVersion: board.launch.version,
    source: board.launch.source,
    generatedAt: context.generatedAt,
    revision: context.revision,
    boardUpdatedAt: board.updatedAt,
    stage,
    metrics,
    remaining: journeys.length - verified,
    provisional: journeys.some((j) => layers.some((layer) => !j[layer].evidenceCurrent)),
    journeys,
    gates,
    changes,
    checks: context.checks ?? {},
    production: context.production ?? null,
    refreshError: Boolean(context.refreshError),
    nextStep:
      journeys.find((j) => !j.integration.verified)?.nextStep ??
      "Comprovar os requisitos gerais e obter a aprovação de publicação.",
  }
}
