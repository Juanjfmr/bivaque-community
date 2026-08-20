import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  decide,
  mergeRun,
  readLedger,
  summarize,
  writeLedger,
} from "../../../scripts/visual/ledger"

// Loop 1 (debt ledger): the visual loop must remember medium/low findings across
// runs instead of letting them evaporate. These tests pin merge/summarize/persist
// so the pure functions never regress.

const NOW = "2026-08-20T12:00:00.000Z"

function result(route, viewport, findings) {
  return { route, viewport, findings }
}

describe("visual debt ledger", () => {
  it("opens an entry for every medium/low finding seen for the first time", () => {
    const { entries, opened } = mergeRun(
      [],
      [result("/", "mobile-375", [{ rule: "no-transition", severity: "medium", selector: "a" }])],
      NOW,
    )
    expect(opened).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      rule: "no-transition",
      severity: "medium",
      screen: "/",
      viewport: "mobile-375",
      selector: "a",
      status: "open",
    })
  })

  it("never opens a ledger entry for high-severity findings (they block in report.json)", () => {
    const { entries, opened } = mergeRun(
      [],
      [result("/", "mobile-375", [{ rule: "contrast", severity: "high", selector: "p" }])],
      NOW,
    )
    expect(opened).toHaveLength(0)
    expect(entries).toHaveLength(0)
  })

  it("does not duplicate a finding reproduced in a later run", () => {
    const run1 = mergeRun(
      [],
      [
        result("/", "desktop-1440", [
          { rule: "no-transition", severity: "medium", selector: "button" },
        ]),
      ],
      NOW,
    )
    const run2 = mergeRun(
      run1.entries,
      [
        result("/", "desktop-1440", [
          { rule: "no-transition", severity: "medium", selector: "button" },
        ]),
      ],
      NOW,
    )
    expect(run2.opened).toHaveLength(0)
    expect(run2.entries).toHaveLength(1)
  })

  it("distinguishes findings that differ only by screen", () => {
    const { opened } = mergeRun(
      [],
      [
        result("/", "mobile-375", [{ rule: "no-transition", severity: "medium", selector: "a#x" }]),
        result("/login", "mobile-375", [
          { rule: "no-transition", severity: "medium", selector: "a#x" },
        ]),
      ],
      NOW,
    )
    expect(opened).toHaveLength(2)
  })

  it("marks silently-fixed debt as unseen and clears unseenSince on reappearance", () => {
    // Build ids the way mergeRun does (fingerprint), so the "seen again" case
    // below is realistic — an arbitrary id would never match a real fingerprint.
    const seed = mergeRun(
      [],
      [
        result("/", "mobile-375", [{ rule: "no-transition", severity: "medium", selector: "a" }]),
        result("/login", "mobile-375", [
          { rule: "no-transition", severity: "medium", selector: "a" },
        ]),
      ],
      NOW,
    )
    const [onHome, onLogin] = seed.entries

    // "/login" stops reproducing in the next run → marked unseen but stays open.
    const secondRun = mergeRun(
      seed.entries,
      [result("/", "mobile-375", [{ rule: "no-transition", severity: "medium", selector: "a" }])],
      NOW,
    )
    const homeAfter = secondRun.entries.find((e) => e.id === onHome.id)
    const loginAfter = secondRun.entries.find((e) => e.id === onLogin.id)
    expect(homeAfter.status).toBe("open")
    expect(homeAfter.unseenSince).toBeUndefined()
    expect(loginAfter.status).toBe("open")
    expect(loginAfter.unseenSince).toBe(NOW)

    // "/login" reproduces again on a later run → unseenSince clears.
    const thirdRun = mergeRun(
      secondRun.entries,
      [
        result("/login", "mobile-375", [
          { rule: "no-transition", severity: "medium", selector: "a" },
        ]),
      ],
      "2026-08-21T12:00:00.000Z",
    )
    const loginFinal = thirdRun.entries.find((e) => e.id === onLogin.id)
    expect(loginFinal.unseenSince).toBeUndefined()
  })

  it("summarizes open vs decided debt by severity", () => {
    const existing = [
      { id: "a", status: "open", severity: "medium" },
      { id: "b", status: "open", severity: "low" },
      { id: "c", status: "decided", severity: "medium" },
    ]
    const summary = summarize(existing)
    expect(summary).toEqual({ open: 2, decided: 1, bySeverity: { medium: 1, low: 1 } })
  })

  it("decides an entry explicitly (accepted debt) without deleting it", () => {
    const { entries } = mergeRun(
      [],
      [result("/", "mobile-375", [{ rule: "no-transition", severity: "medium", selector: "a" }])],
      NOW,
    )
    const id = entries[0].id
    const decided = decide(entries, id, {
      status: "accepted",
      by: "owner",
      reason: "touch target is Intentionally small here per design",
    })
    expect(decided.status).toBe("accepted")
    expect(decided.decision).toMatchObject({
      status: "accepted",
      by: "owner",
      reason: "touch target is Intentionally small here per design",
    })
    expect(entries).toHaveLength(1) // closed, not deleted
  })

  it("returns null when deciding an unknown id", () => {
    expect(decide([], "nope", { status: "accepted" })).toBeNull()
  })

  it("persists and reloads through read/write (real filesystem)", () => {
    const { entries } = mergeRun(
      [],
      [result("/x", "mobile-375", [{ rule: "r", severity: "low", selector: "span" }])],
      NOW,
    )
    const dir = joinTmp()
    const path = `${dir}/known-issues.json`
    writeLedger(path, entries)
    expect(readLedger(path)).toEqual(entries)
    // Missing file reads as an empty ledger, not an error.
    expect(readLedger(`${dir}/missing.json`)).toEqual([])
  })
})

function joinTmp() {
  return join(tmpdir(), `bivaque-ledger-test-${Date.now()}`)
}
