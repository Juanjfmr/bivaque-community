// Debt ledger for the visual audit — the loop's memory for findings that do not
// block the iteration (medium/low). High-severity findings stay in report.json
// and block the iteration as before; this file exists so the rest never
// evaporates between runs.
//
// The ledger lives at .visual/known-issues.json (gitignored). Entries are never
// deleted: closing one means recording an explicit `decision` (by/date/reason).
// An entry that stops reproducing for a run gets `unseenSince` so a human can
// decide whether it was fixed or merely hidden. The loop reports the delta
// (new opened / still open) in ITERATION.md every run.
//
// Pure functions only — the loop passes explicit paths, the unit test drives
// them without touching the disk.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

const SEPARATOR = "\u0001"

// A finding is the same debt across runs when rule + screen + viewport +
// selector match. Selectors can contain almost anything, so the separator is a
// control character that never appears in them.
export function fingerprint(finding) {
  return [finding.rule, finding.screen, finding.viewport, finding.selector].join(SEPARATOR)
}

// Flattens the capture report's `results` array (each entry carries its own
// route/viewport plus a `findings` list) into ledger entries. High-severity
// findings never enter the ledger — they block in report.json already.
export function mergeRun(existing, results, nowIso) {
  const byId = new Map(existing.map((entry) => [entry.id, entry]))
  const opened = []
  const seenThisRun = new Set()

  for (const result of results ?? []) {
    for (const finding of result.findings ?? []) {
      if (finding.severity === "high") continue
      const id = fingerprint({ ...finding, screen: result.route, viewport: result.viewport })
      seenThisRun.add(id)
      const hit = byId.get(id)
      if (hit) {
        hit.lastSeen = nowIso
        hit.seenThisRun = true
        // Um achado "perdido" que reaparece é vivo, não uma nova regressão:
        // limpa o marcador de invisibilidade sem tocar no status.
        if (hit.unseenSince) hit.unseenSince = undefined
      } else {
        byId.set(id, {
          id,
          rule: finding.rule,
          severity: finding.severity,
          screen: result.route,
          viewport: result.viewport,
          selector: finding.selector,
          detail: finding.detail,
          firstSeen: nowIso,
          lastSeen: nowIso,
          status: "open",
          decision: null,
        })
        opened.push(id)
      }
    }
  }

  // Debt that no longer reproduces is not auto-closed: it gets `unseenSince` so
  // No longer reproducing ≠ fixed: mark unseen for a human to decide (rather
  // than deleting — a data/viewport-dependent finding may simply be hidden).
  const entries = [...byId.values()]
  for (const entry of entries) {
    if (entry.status === "open" && !seenThisRun.has(entry.id) && !entry.unseenSince) {
      entry.unseenSince = nowIso
    }
    // seenThisRun is internal to this run; never persist it.
    delete entry.seenThisRun
  }

  return { entries, opened, stillOpen: entries.filter((entry) => entry.status === "open").length }
}

export function summarize(entries) {
  const open = entries.filter((entry) => entry.status === "open")
  const decided = entries.filter((entry) => entry.status !== "open")
  const bySeverity = { medium: 0, low: 0 }
  for (const entry of open) bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1
  return { open: open.length, decided: decided.length, bySeverity }
}

// Explicitly closes a debt entry as accepted (or fixed) so it stops blocking.
// `reason` must name the decider and the rationale — an entry is never deleted,
// only decided. Returns the updated entry, or null when the id is unknown.
export function decide(entries, id, decision) {
  const entry = entries.find((candidate) => candidate.id === id)
  if (!entry) return null
  entry.status = decision.status ?? "decided"
  entry.decision = {
    status: entry.status,
    by: decision.by ?? "unknown",
    reason: decision.reason ?? "",
    on: decision.on ?? new Date().toISOString(),
  }
  return entry
}

export function readLedger(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"))
    return Array.isArray(parsed.entries) ? parsed.entries : []
  } catch {
    return []
  }
}

export function writeLedger(path, entries) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify({ version: 1, entries }, null, 2)}\n`)
}
