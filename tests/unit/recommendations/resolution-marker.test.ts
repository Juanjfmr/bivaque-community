import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  canResolveRequest,
  replyResolution,
} from "../../../apps/web/lib/recommendations/resolution"

const root = join(import.meta.dirname, "..", "..", "..")
const requestsPath = join(
  root,
  "apps",
  "web",
  "app",
  "components",
  "bivaque",
  "recommendation-requests.tsx",
)

describe("resolution marker (RECON-035)", () => {
  it("marks only the reply the asker chose", () => {
    const view = { is_resolved: true, resolved_reply_id: "reply-a" }
    expect(replyResolution(view, "reply-a")).toBe("marked")
    expect(replyResolution(view, "reply-b")).toBe("resolved_without_reply")
  })

  it("reports an open request with no mark as open", () => {
    expect(replyResolution({ is_resolved: false, resolved_reply_id: null }, "reply-a")).toBe("open")
  })

  it("reports resolved-without-a-mark separately", () => {
    expect(replyResolution({ is_resolved: true, resolved_reply_id: null }, "reply-a")).toBe(
      "resolved_without_reply",
    )
  })

  it("reserves resolution control for the request author", () => {
    expect(canResolveRequest({ author_id: "member-one" }, "member-one")).toBe(true)
    expect(canResolveRequest({ author_id: "member-one" }, "member-two")).toBe(false)
  })

  it("writes through the server RPCs, never a direct table update", () => {
    const source = readFileSync(requestsPath, "utf8")
    expect(source).toContain("mark_recommendation_reply_resolved")
    expect(source).toContain("clear_recommendation_resolved_reply")
    expect(source).toContain("reopen_recommendation")
    expect(source).toContain("callResolutionRpc")
  })

  it("reads the marker and renders the print's highlight and chips", () => {
    const source = readFileSync(requestsPath, "utf8")
    expect(source).toContain("resolved_reply_id")
    expect(source).toContain("Ajudou a resolver")
    expect(source).toContain("Resolvida pela autora")
    expect(source).toContain("var(--semantic-success)")
  })

  it("gates every resolution control behind isAuthor", () => {
    const source = readFileSync(requestsPath, "utf8")
    expect(source).toContain("{isAuthor && !isMarked && (")
    expect(source).toContain("{isAuthor && isMarked && (")
  })
})
