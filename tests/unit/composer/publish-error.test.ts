import { describe, expect, it } from "vitest"
import { classifyPublishError } from "../../../apps/web/lib/composer/publish-error"

// Pin the contract of the publish-error classifier. Two consumers depend on
// it directly: CreatePostModal (apps/web/app/components/bivaque/feed-post.tsx)
// for the user-facing copy, and the observability layer for the diagnostic
// string. Both must stay stable.
//
// The branches mirror the call site:
//   - "network" preserves the draft and shows the connection message.
//   - "server" preserves the draft, shows the generic message, and never
//     reveals the underlying code/status to the UI.
// Each branch has a positive test (the classifier picks it) and a negative
// test (the other branch does NOT pick it).

describe("classifyPublishError", () => {
  describe("network branch", () => {
    it("treats a Failed to fetch TypeError as transport", () => {
      // Given the exact error shape Chromium raises when the request never
      // reaches the network stack (DNS, offline, etc.)
      const transport = classifyPublishError(new TypeError("Failed to fetch"))
      expect(transport.kind).toBe("network")
      expect(transport.message).toBe("Verifique sua conexão e tente de novo")
      expect(transport.preserveDraft).toBe(true)
    })

    it("treats a fetch() throw with the legacy Node-style message as transport", () => {
      // Given the same error from a Node-style fetch polyfill
      const transport = classifyPublishError(new TypeError("fetch failed"))
      expect(transport.kind).toBe("network")
      expect(transport.preserveDraft).toBe(true)
    })

    it("treats an AbortError (user cancel, request timeout) as transport", () => {
      // Given a request aborted by supabase-js / AbortController
      const aborted = classifyPublishError(
        Object.assign(new Error("aborted"), { name: "AbortError" }),
      )
      expect(aborted.kind).toBe("network")
      expect(aborted.preserveDraft).toBe(true)
    })

    it("treats a null/undefined thrown as transport (conservative)", () => {
      // The supabase client never throws null, but a wrapper might.
      expect(classifyPublishError(null).kind).toBe("network")
      expect(classifyPublishError(undefined).kind).toBe("network")
    })

    it("never reaches the server branch for a pure network failure", () => {
      // The negative half of the network test: a transport error must NOT
      // be misclassified as a server rejection, even though both keep the
      // draft. Copy differs and so does the diagnostic prefix.
      const transport = classifyPublishError(new TypeError("Failed to fetch"))
      expect(transport.kind).not.toBe("server")
      expect(transport.diagnostic.startsWith("publish-insert: transport")).toBe(true)
    })
  })

  describe("server branch", () => {
    it("treats a PostgrestError with code 42501 (RLS) as a server rejection", () => {
      // Given a real PostgrestError: code is a SQLSTATE, message is the raw
      // Postgres message — never echoed to the user.
      const rls = classifyPublishError({
        code: "42501",
        message: "new row violates row-level security policy for table posts",
        details: null,
        hint: null,
      })
      expect(rls.kind).toBe("server")
      expect(rls.message).toBe("Não foi possível criar a publicação")
      expect(rls.preserveDraft).toBe(true)
    })

    it("treats a PostgrestError shaped by HTTP status alone (no code) as a server rejection", () => {
      // Given a Supabase JS error from a 503 / 502: `code` is undefined,
      // but `status` is present. The classifier must still pick "server".
      const httpOnly = classifyPublishError({
        status: 503,
        message: "Service Unavailable",
      })
      expect(httpOnly.kind).toBe("server")
      expect(httpOnly.message).toBe("Não foi possível criar a publicação")
    })

    it("treats a PostgrestError with only `details`/`hint` (no code, no status) as a server rejection", () => {
      // Given a Supabase JS error that surfaced only the Postgres
      // auxiliary fields. The classifier must still pick "server" — these
      // fields never appear on a plain browser fetch error.
      const pgOnly = classifyPublishError({
        message: "simulated upstream failure",
        details: "Results contain 0 rows",
        hint: null,
      })
      expect(pgOnly.kind).toBe("server")
      expect(pgOnly.message).toBe("Não foi possível criar a publicação")
    })

    it("treats unique-violation (23505) and FK-violation (23503) the same as any other server code", () => {
      // Given two common Postgres errors that aren't RLS. Anti-enumeration:
      // the user-facing copy must NOT distinguish them from 42501.
      const unique = classifyPublishError({ code: "23505", message: "duplicate key value" })
      const fk = classifyPublishError({ code: "23503", message: "foreign key violation" })

      expect(unique.kind).toBe("server")
      expect(fk.kind).toBe("server")
      expect(unique.message).toBe(fk.message)
    })

    it("never uses the raw Postgres message as user-facing copy", () => {
      // The diagnostic keeps the raw message (it never reaches the UI);
      // the user-facing copy is the stable generic string.
      const rls = classifyPublishError({
        code: "42501",
        message: "new row violates row-level security policy for table posts",
      })
      expect(rls.message).not.toContain("row-level security")
      expect(rls.message).not.toContain("policy")
      expect(rls.message).not.toContain("posts")
    })

    it("never reaches the network branch when the shape is server-shaped", () => {
      // The negative half: a code-bearing error must NOT be misclassified
      // as transport, even if it happens to share a substring like
      // "aborted" in the message (RLS errors have nothing to do with
      // aborts, but the test guards against future heuristics that match
      // on message text alone).
      const rls = classifyPublishError({
        code: "42501",
        message: "aborted",
      })
      expect(rls.kind).not.toBe("network")
      expect(rls.kind).toBe("server")
    })
  })

  describe("diagnostic payload", () => {
    it("embeds the code and status in the diagnostic so logs can investigate", () => {
      // The diagnostic is a string used by observability only. It must
      // carry enough to recover the original error without serializing the
      // raw PostgrestError object (which has circular refs).
      const rls = classifyPublishError({
        code: "42501",
        message: "RLS rejection",
        status: 403,
      })
      expect(rls.diagnostic).toContain("42501")
      expect(rls.diagnostic).toContain("403")
    })

    it("never exposes the raw Postgres text in the user-facing message field", () => {
      // Final guardrail: the .message property is the one the UI renders.
      // Anything with a recognizable Postgres token must NOT leak there.
      const rls = classifyPublishError({
        code: "42501",
        message: "violates row-level security policy",
      })
      expect(rls.message.includes("violates")).toBe(false)
    })
  })
})
