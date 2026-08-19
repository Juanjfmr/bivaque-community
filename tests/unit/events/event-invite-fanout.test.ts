import { describe, expect, it } from "vitest"

// Onda F Task 3 — guard that the organizer's invite UI never renders a
// free-form people search (D43 forbids it in the pilot). The fan-out UI
// must pick only from the members the INSERT policy accepts; a search
// input would be a scope leak-by-construction.

import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..", "..", "..")
const section = join(
  root,
  "apps",
  "web",
  "app",
  "(shell)",
  "events",
  "event-invite-fanout-section.tsx",
)

describe("event invite fan-out (F3)", () => {
  it("the organizer UI has no people search input", () => {
    const source = readFileSync(section, "utf8")
    // No <input type="search">, no placeholder with people-search semantics,
    // no "buscar" stray on the invite surface.
    // The only input is the hidden eventId + the invite checkboxes.
    expect(source).not.toMatch(/type\s*=\s*"search"/i)
    expect(source).not.toMatch(/placeholder\s*=\s*"\s*[Bb]uscar/)
  })

  it("the UI renders a submit button with an invite label", () => {
    const source = readFileSync(section, "utf8")
    expect(source).toMatch(/Convidar\s*\{\s*selected\.size\s*\}/i)
    expect(source).toMatch(/selecionado/i)
  })
})
