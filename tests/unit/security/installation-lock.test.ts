import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// M2 da revisao final de 2026-10-21 - a migration SEC-006 renumera
// `listing_photos` e so depois cria o UNIQUE. Sem segurar as escritas, outra
// sessao pode inserir uma posicao duplicada entre a renumeracao e o
// `ADD CONSTRAINT`, e a implantacao aborta no meio.
//
// pgTAP roda em uma transacao unica e nao consegue provar concorrencia entre
// sessoes; este teste prende a unica parte verificavel no repositorio: o
// `LOCK TABLE ... SHARE ROW EXCLUSIVE` precisa continuar existindo e vir antes
// da renumeracao e do UNIQUE. SHARE ROW EXCLUSIVE bloqueia INSERT/UPDATE/DELETE
// e continua permitindo SELECT, diferente de ACCESS EXCLUSIVE.

const MIGRATION = "20261019235819_sec006_photo_invariants_and_atomic_writes.sql"

function migrationSql(): string {
  return readFileSync(join(process.cwd(), "supabase", "migrations", MIGRATION), "utf8")
}

describe("M2 instalacao da migration SEC-006", () => {
  it("trava listing_photos contra escrita antes de renumerar e criar o UNIQUE", () => {
    const sql = migrationSql()
    const lock = sql.indexOf("lock table public.listing_photos in share row exclusive mode")
    const renumber = sql.indexOf("select private.renumber_listing_photos()")
    const unique = sql.indexOf("add constraint listing_photos_listing_position_unique")

    expect(lock).toBeGreaterThan(-1)
    expect(renumber).toBeGreaterThan(-1)
    expect(unique).toBeGreaterThan(-1)
    expect(lock).toBeLessThan(renumber)
    expect(lock).toBeLessThan(unique)
  })

  it("documenta por que a tabela fica travada por pouco tempo", () => {
    const sql = migrationSql()
    expect(sql).toMatch(/SHARE ROW EXCLUSIVE/i)
    expect(sql).toMatch(/pouco tempo/i)
  })
})
