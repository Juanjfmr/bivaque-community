import { describe, expect, it } from "vitest"

// Onda F Task 5 — guard that reply edit/delete in recommendation-requests.tsx
// always filter by author_id, and the Explorar cards link to detail routes.

import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..", "..", "..")
const sourceDir = join(root, "apps", "web", "app", "components", "bivaque")
const requestsPath = join(sourceDir, "recommendation-requests.tsx")
const explorePath = join(root, "apps", "web", "app", "(shell)", "recommendations", "page.tsx")

describe("recommendation loop (F5)", () => {
  it("reply deletion is scoped to the author", () => {
    const source = readFileSync(requestsPath, "utf8")
    const delBlock = source.slice(
      source.indexOf("handleDeleteReply"),
      source.indexOf("cancelEditReply"),
    )
    expect(delBlock).toContain(".delete()")
    expect(delBlock).toContain('"author_id"')
    expect(delBlock).toContain("currentUserId")
  })

  it("reply edit is scoped to the author", () => {
    const source = readFileSync(requestsPath, "utf8")
    const editBlock = source.slice(
      source.indexOf("saveEditReply"),
      source.indexOf("handleMarkResolved"),
    )
    expect(editBlock).toContain(".update(")
    expect(editBlock).toContain('"author_id"')
    expect(editBlock).toContain("currentUserId")
  })

  it("the Explorar cards link to detail routes", () => {
    const source = readFileSync(explorePath, "utf8")
    const dollarBrace = "$" + "{"
    expect(source).toContain(`\`/groups/${dollarBrace}group.id}\``)
    expect(source).toContain(`\`/events/${dollarBrace}event.id}\``)
  })
})
