import { describe, expect, it } from "vitest"
import {
  isMissingFunctionError,
  mapDocumentSituation,
} from "../../../apps/web/lib/onboarding/document-status"

describe("document situation mapping", () => {
  it("treats the absence of a document as the initial state", () => {
    expect(mapDocumentSituation(null)).toBe("none")
  })

  it("reads a pending review as in review", () => {
    expect(
      mapDocumentSituation({ review_status: "pending", uploaded_at: "2026-09-11T00:00:00Z" }),
    ).toBe("in_review")
  })

  it("reads a rejected review as a request to replace the whole file", () => {
    expect(
      mapDocumentSituation({ review_status: "rejected", uploaded_at: "2026-09-11T00:00:00Z" }),
    ).toBe("needs_replacement")
  })

  it("reads an approved review as approved", () => {
    expect(
      mapDocumentSituation({ review_status: "approved", uploaded_at: "2026-09-11T00:00:00Z" }),
    ).toBe("approved")
  })

  it("only degrades when the reader itself is absent", () => {
    expect(isMissingFunctionError("PGRST202", "Could not find the function")).toBe(true)
    expect(isMissingFunctionError("42883", "function does not exist")).toBe(true)
    expect(isMissingFunctionError("42501", "permission denied")).toBe(false)
    expect(isMissingFunctionError(undefined, "internal server error")).toBe(false)
  })
})
