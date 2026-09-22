import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { describe, expect, it } from "vitest"
import { resolveCityLabel } from "web/app/(shell)/communities/[id]/community-detail-loaders"

// COMM-CIDADE-ROTULO: quem é de outra cidade lia "fica em outra cidade" porque a RLS de
// `localities` só abre a própria cidade. O recurso ao catálogo nomeia a cidade — e só isso.

type Row = { city_name: string; state_code: string } | null
interface Call {
  table: string
  columns: string
  filters: Array<[string, string]>
}

function fakeClient(row: Row, error: { message: string } | null = null) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, columns: "", filters: [] }
      calls.push(call)
      const query = {
        select(columns: string) {
          call.columns = columns
          return query
        },
        eq(column: string, value: string) {
          call.filters.push([column, value])
          return query
        },
        maybeSingle: async () => ({ data: row, error }),
      }
      return query
    },
  }
  return { client: client as unknown as SupabaseClient<Database>, calls }
}

const LOCALITY = "00000000-0000-4000-8000-000000000002"

describe("rótulo da cidade da comunidade", () => {
  it("usa a leitura da sessão e não toca o catálogo quando a RLS já abre a cidade", async () => {
    const session = fakeClient({ city_name: "Manaus", state_code: "AM" })
    const catalog = fakeClient({ city_name: "Outra", state_code: "XX" })

    expect(await resolveCityLabel(session.client, catalog.client, LOCALITY)).toBe("Manaus, AM")
    expect(catalog.calls).toHaveLength(0)
  })

  it("nomeia a cidade de fora pelo catálogo, lendo só nome e UF desta localidade", async () => {
    const session = fakeClient(null)
    const catalog = fakeClient({ city_name: "Rio de Janeiro", state_code: "RJ" })

    expect(await resolveCityLabel(session.client, catalog.client, LOCALITY)).toBe(
      "Rio de Janeiro, RJ",
    )
    expect(catalog.calls).toEqual([
      { table: "localities", columns: "city_name, state_code", filters: [["id", LOCALITY]] },
    ])
  })

  it("sem catálogo, mantém o vazio honesto em vez de inventar cidade", async () => {
    const session = fakeClient(null)
    expect(await resolveCityLabel(session.client, null, LOCALITY)).toBeNull()
  })

  it("falha de leitura lança, não vira rótulo vazio", async () => {
    const session = fakeClient(null, { message: "boom" })
    await expect(resolveCityLabel(session.client, null, LOCALITY)).rejects.toThrow(
      "Falha ao ler a cidade da comunidade.",
    )
    const catalogFails = fakeClient(null, { message: "boom" })
    await expect(
      resolveCityLabel(fakeClient(null).client, catalogFails.client, LOCALITY),
    ).rejects.toThrow("Falha ao ler a cidade da comunidade.")
  })
})
