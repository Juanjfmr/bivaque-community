import { describe, expect, it } from "vitest"
import { isDefiniteSqlRejection } from "../../../apps/web/lib/storage/rpc-outcome"

// SEC-006 tentativa 2 — nem todo erro do PostgREST prova rollback. SQLSTATE
// (5 caracteres) é uma recusa da instrução; código PGRST, código vazio ou
// ausência de código podem ser falha de transporte/gateway e são inconclusivos.

describe("SEC-006 classificação de erro de RPC", () => {
  it.each(["23505", "42501", "22023", "P0002", "54000"])(
    "trata o SQLSTATE %s como recusa definitiva",
    (code) => {
      expect(isDefiniteSqlRejection({ message: "recusa", code })).toBe(true)
    },
  )

  it.each(["PGRST000", "PGRST116", "", "abc"])("não trata %s como prova de rollback", (code) => {
    expect(isDefiniteSqlRejection({ message: "ambíguo", code })).toBe(false)
  })

  it("erro sem código ou ausente é inconclusivo", () => {
    expect(isDefiniteSqlRejection({ message: "gateway" })).toBe(false)
    expect(isDefiniteSqlRejection(null)).toBe(false)
  })
})
