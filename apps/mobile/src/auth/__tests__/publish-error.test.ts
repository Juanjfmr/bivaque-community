// Testes do classificador de erros do compositor mobile.
// Porta dos mesmos casos cobertos pelo apps/web em tests/unit/composer/publish-error.test.ts
// (commit efab5a9, fatia W1). Mesma matriz de aceitacao: positivo +
// negativo, sem omitir caminho de erro.

import { describe, expect, it } from "vitest"
import { classifyPublishError, type PublishErrorKind } from "../publish-error"

interface Case {
  name: string
  input: unknown
  expectedKind: PublishErrorKind
  expectedMessage: string
}

const cases: Case[] = [
  {
    name: "PostgrestError com code 42501 (RLS) e status 403 — server, copy generica",
    input: {
      name: "PostgrestError",
      message: 'new row violates row-level security policy for table "posts"',
      code: "42501",
      status: 403,
      details: "Failing row contains (foo)",
      hint: null,
    },
    expectedKind: "server",
    expectedMessage: "Não foi possível criar a publicação",
  },
  {
    name: "PostgrestError com code 23505 (unique violation) e status 409 — server",
    input: {
      name: "PostgrestError",
      message: "duplicate key value violates unique constraint",
      code: "23505",
      status: 409,
      details: null,
      hint: null,
    },
    expectedKind: "server",
    expectedMessage: "Não foi possível criar a publicação",
  },
  {
    name: "PostgrestError com status 500 e sem code — server",
    input: {
      name: "PostgrestError",
      message: "internal server error",
      code: null,
      status: 500,
      details: null,
      hint: null,
    },
    expectedKind: "server",
    expectedMessage: "Não foi possível criar a publicação",
  },
  {
    name: "fetch throw com TypeError 'Failed to fetch' — network",
    input: {
      name: "TypeError",
      message: "Failed to fetch",
    },
    expectedKind: "network",
    expectedMessage: "Verifique sua conexão e tente de novo",
  },
  {
    name: "AbortError — network",
    input: {
      name: "AbortError",
      message: "The operation was aborted.",
    },
    expectedKind: "network",
    expectedMessage: "Verifique sua conexão e tente de novo",
  },
  {
    name: "NetworkError — network",
    input: {
      name: "NetworkError",
      message: "Network request failed",
    },
    expectedKind: "network",
    expectedMessage: "Verifique sua conexão e tente de novo",
  },
  {
    name: "fetch throw com message 'aborted' (Android RN fetch) — network",
    input: {
      name: "TypeError",
      message: "aborted",
    },
    expectedKind: "network",
    expectedMessage: "Verifique sua conexão e tente de novo",
  },
  {
    name: "fetch throw com message 'Network request failed' sem name — network",
    input: {
      name: "Error",
      message: "Network request failed",
    },
    expectedKind: "network",
    expectedMessage: "Verifique sua conexão e tente de novo",
  },
  {
    name: "Erro totalmente desconhecido (string crua) — conservative network",
    input: "alguma coisa estranha",
    expectedKind: "network",
    expectedMessage: "Verifique sua conexão e tente de novo",
  },
  {
    name: "null — conservative network",
    input: null,
    expectedKind: "network",
    expectedMessage: "Verifique sua conexão e tente de novo",
  },
  {
    name: "undefined — conservative network",
    input: undefined,
    expectedKind: "network",
    expectedMessage: "Verifique sua conexão e tente de novo",
  },
  {
    name: "PostgrestError com code 23503 (FK violation) — server",
    input: {
      name: "PostgrestError",
      message: "insert or update on table posts violates foreign key constraint",
      code: "23503",
      status: 409,
      details: null,
      hint: null,
    },
    expectedKind: "server",
    expectedMessage: "Não foi possível criar a publicação",
  },
]

describe("publish-error.classifyPublishError", () => {
  for (const c of cases) {
    it(c.name, () => {
      const result = classifyPublishError(c.input)
      expect(result.kind).toBe(c.expectedKind)
      expect(result.message).toBe(c.expectedMessage)
      expect(result.preserveDraft).toBe(true)
      expect(typeof result.diagnostic).toBe("string")
    })
  }

  it("anti-enumeracao §4.3: copy e' identica para 42501 e 23503 e 23505", () => {
    const r1 = classifyPublishError({
      code: "42501",
      message: "RLS",
      status: 403,
    })
    const r2 = classifyPublishError({
      code: "23503",
      message: "FK",
      status: 409,
    })
    const r3 = classifyPublishError({
      code: "23505",
      message: "unique",
      status: 409,
    })
    expect(r1.message).toBe(r2.message)
    expect(r2.message).toBe(r3.message)
  })
})
