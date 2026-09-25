// A screenshot is evidence only of the requested route, actor and state.
// This validates capture identity; it does not judge reference fidelity.

// A page whose title comes from its own record — a community, a group, an
// event, a member, a city. It has an identity contract; the contract just is
// not a literal string. It still has to render a real h1, so a login, an empty
// shell or a fallback cannot pass as "the detail screen".
export const DYNAMIC_HEADING = "dynamic"

export function assessCapture({ route, authenticated, status, landedOn, observed, error }) {
  const failures = []
  if (error) failures.push(error)
  if (route.auth && !authenticated) failures.push("Authenticated session required")
  if (status < 200 || status >= 400) failures.push(`Unexpected HTTP status: ${status}`)
  // `expectedPath` pode ser uma lista de destinos aceitos, e um item terminado
  // em "*" casa por prefixo — é assim que uma rota de fronteira declara o
  // destino honesto quando a query do redirecionamento é do servidor
  // (/login?redirect=…), sem afrouxar a comparação exata das demais rotas.
  const declared = route.expectedPath ?? route.path
  const expected = Array.isArray(declared) ? declared : [declared]
  const landed = expected.some((path) =>
    path.endsWith("*") ? landedOn.startsWith(path.slice(0, -1)) : landedOn === path,
  )
  if (!landed) failures.push(`Expected ${expected.join(" or ")}; landed on ${landedOn}`)
  const heading = (observed?.heading ?? "").trim()
  if (!route.expectedHeading) failures.push("Route has no identity contract")
  else if (route.expectedHeading === DYNAMIC_HEADING) {
    if (!heading) failures.push("Data-named route rendered no heading")
  } else if (!new RegExp(route.expectedHeading, "i").test(heading)) {
    failures.push("Expected heading not found")
  }
  if (route.operator && !observed?.operator) failures.push("Operator surface not reached")
  if (route.dialog && observed?.dialog !== route.dialog) failures.push("Expected dialog not open")
  // Uma rota pode ter estado de indisponibilidade PRÓPRIO (a prancha 60 desenha
  // "Você ainda não tem acesso a esta comunidade"). A tolerância é nominal: a
  // rota declara a cópia aceita, e qualquer outra — página não encontrada,
  // Application error — continua reprovando.
  const declaredFallback = route.expectedFallback
  if (observed?.fallback) {
    const tolerated =
      typeof declaredFallback === "string" &&
      new RegExp(declaredFallback, "i").test(observed.fallback)
    if (!tolerated) failures.push(`Unexpected unavailable state: "${observed.fallback}"`)
  }
  if (observed?.missingRequiredText?.length > 0) {
    failures.push(`Required state markers missing: ${observed.missingRequiredText.join(", ")}`)
  }
  if (observed?.pageErrors > 0) failures.push("Unhandled browser exception")
  return { valid: failures.length === 0, failures }
}

export function summarizeCaptures(results) {
  const invalid = results.filter((entry) => entry.proof?.valid !== true).length
  const total = results.reduce((sum, entry) => sum + (entry.findings?.length ?? 0), 0)
  const high = results.reduce(
    (sum, entry) => sum + (entry.findings ?? []).filter((f) => f.severity === "high").length,
    0,
  )
  return { valid: results.length > 0 && invalid === 0, invalid, total, high }
}

export function isCaptureReportPassing(report) {
  return (
    report?.valid === true &&
    report.high === 0 &&
    Array.isArray(report.results) &&
    report.results.length > 0 &&
    summarizeCaptures(report.results).valid &&
    summarizeCaptures(report.results).high === 0
  )
}
