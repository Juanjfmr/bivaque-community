// Data footprint probe — Loop 4. Dev tooling that runs against the local stack
// can write to the database (seed, e2e, RLS probes, legacy captures). The visual
// loop reports the footprint it observes so a runner/human can see whether
// tooling left rows behind. Best-effort: if Docker/Supabase isn't up, the probe
// reports `available: false` instead of crashing the loop.
//
// Safety: reads COUNTS ONLY (aggregate numbers, no personal values), never
// deletes, and tolerates a mid-reset stack (tables absent → those counts are
// `null`, not a throw).

import { execFileSync } from "node:child_process"

const CONTAINER = "supabase_db_bivaque-community"
const DB = "postgres"

// One psql invocation returns every counter, so the probe costs a single round
// trip and fails fast when the container is missing. A table that does not exist
// yields NULL; the count query still succeeds. We compute all six from one SELECT
// so a partially-initialised stack reads honestly rather than throwing.
const QUERY = `
select
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.profiles p join public.locality_memberships lm on lm.user_id = p.user_id) as profiles_with_membership,
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.locality_memberships) as locality_memberships,
  (select count(*) from public.communities) as communities,
  (select count(*) from public.posts) as posts;
`

const LABELS = [
  "profiles",
  "profiles_with_membership",
  "auth_users",
  "locality_memberships",
  "communities",
  "posts",
]

function parseRow(line) {
  // psql -tA output is a single pipe-joined row with no header and no extra
  // row marker, e.g. "306|250|668|...".
  const tokens = line.split("|").map((token) => token.trim())
  const counts = {}
  LABELS.forEach((label, index) => {
    const raw = tokens[index]
    // NULL (table absent mid-reset) → null rather than NaN; numeric → int.
    counts[label] = raw && /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : null
  })
  return counts
}

export { parseRow }

export function probeFootprint() {
  const result = { available: false, counts: {}, error: null }
  try {
    const out = execFileSync(
      "docker",
      ["exec", CONTAINER, "psql", "-U", "postgres", "-d", DB, "-tA", "-c", QUERY],
      { stdio: "pipe", encoding: "utf8", timeout: 15_000 },
    )
    const lines = out.split("\n").filter(Boolean)
    result.counts = parseRow(lines[lines.length - 1] ?? "")
    result.available = true
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    result.available = false
  }
  return result
}
