// Only step outcomes are collected. Logs, artifacts and environment values never enter the site.
export function classifyChecks(requirements, runs, revision) {
  const relevant = requirements.map((requirement) => {
    const run = runs.find(
      (item) => item.workflow === requirement.workflow && item.revision === revision,
    )
    if (run?.status !== "completed") return { status: "pending", url: run?.url ?? null }
    const steps = requirement.steps.map((name) => run.steps.find((step) => step.name === name))
    const status = steps.some((step) => step?.conclusion === "failure")
      ? "failure"
      : run.conclusion === "success" && steps.every((step) => step?.conclusion === "success")
        ? "success"
        : "inconclusive"
    return { status, url: run.url }
  })
  const status = relevant.some((r) => r.status === "failure")
    ? "failure"
    : relevant.length && relevant.every((r) => r.status === "success")
      ? "success"
      : relevant.some((r) => r.status === "inconclusive")
        ? "inconclusive"
        : "pending"
  return { status, revision, urls: [...new Set(relevant.map((r) => r.url).filter(Boolean))] }
}

export async function verifyGithubReference(
  reference,
  { repository, token, revision, request = fetch },
) {
  let url
  try {
    url = new URL(reference)
  } catch {
    return false
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    !url.pathname.startsWith(`/${repository}/actions/runs/`)
  )
    return false
  const suffix = url.pathname.slice(`/${repository}/actions/runs/`.length)
  if (!/^\d+\/?$/.test(suffix)) return false
  try {
    const response = await request(
      `https://api.github.com/repos/${repository}/actions/runs/${suffix.replace(/\/$/, "")}`,
      {
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(20000),
      },
    )
    if (!response.ok) return false
    const run = await response.json()
    return run.head_sha === revision && run.status === "completed" && run.conclusion === "success"
  } catch {
    return false
  }
}

export async function collectGithub({
  repository,
  token,
  revision,
  requirements,
  request = fetch,
}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("Repositório inválido")
  const api = async (path) => {
    const response = await request(`https://api.github.com/repos/${repository}/${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) throw new Error(`GitHub retornou ${response.status}`)
    return response.json()
  }
  const runs = []
  const workflows = [
    ...new Set(Object.values(requirements).flatMap((items) => items.map((item) => item.workflow))),
  ]
  for (const workflow of workflows) {
    const data = await api(
      `actions/workflows/${encodeURIComponent(workflow)}/runs?head_sha=${revision}&branch=main&per_page=100`,
    )
    const run = data.workflow_runs
      .filter(
        (item) =>
          item.head_sha === revision &&
          item.head_branch === "main" &&
          ["push", "workflow_dispatch"].includes(item.event),
      )
      .sort((a, b) => b.run_number - a.run_number || b.run_attempt - a.run_attempt)[0]
    if (!run) continue
    const steps = []
    for (let page = 1; ; page++) {
      const jobs = await api(
        `actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100&page=${page}`,
      )
      steps.push(...jobs.jobs.flatMap((job) => job.steps ?? []))
      if (jobs.jobs.length < 100) break
    }
    runs.push({
      workflow,
      revision: run.head_sha,
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
      steps,
    })
  }
  const checks = Object.fromEntries(
    Object.entries(requirements).map(([layer, items]) => [
      layer,
      classifyChecks(items, runs, revision),
    ]),
  )
  // A failed global gate blocks an end-to-end verdict, even when its E2E steps passed.
  const ci = runs.find((run) => run.workflow === "pull-request-ci.yml")
  if (ci?.conclusion !== "success" && checks.integration?.status === "success")
    checks.integration.status = "inconclusive"

  let production = null
  const deployments = await api(
    `deployments?environment=${encodeURIComponent("Production – bivaque-community-web")}&per_page=100`,
  )
  if (!deployments.length)
    deployments.push(...(await api("deployments?environment=Production&per_page=100")))
  for (const deployment of deployments) {
    if (
      !deployment.production_environment ||
      !["Production", "Production – bivaque-community-web"].includes(deployment.environment)
    )
      continue
    const statuses = await api(`deployments/${deployment.id}/statuses?per_page=1`)
    const status = statuses[0]
    if (status?.state !== "success") continue
    const candidate = status.environment_url
    if (!candidate) continue
    const url = new URL(candidate)
    if (
      url.protocol !== "https:" ||
      (!["bivaque.app", "www.bivaque.app", "bivaque-community-web.vercel.app"].includes(
        url.hostname,
      ) &&
        !/^bivaque-community-web-[a-z0-9-]+\.vercel\.app$/.test(url.hostname))
    )
      continue
    production = { revision: deployment.sha, url: url.href, updatedAt: status.updated_at }
    break
  }
  return { checks, production }
}
