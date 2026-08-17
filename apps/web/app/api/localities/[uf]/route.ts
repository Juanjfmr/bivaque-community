import { NextResponse } from "next/server"
import { createServerClient } from "../../../../lib/supabase/server"

// P0 Task 5: municípios de uma UF, do catálogo canônico (Task 1). Valida a UF
// contra o catálogo antes de responder — UF inexistente é 404, não lista vazia.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: { params: Promise<{ uf: string }> }) {
  const { uf } = await context.params
  const stateCode = uf.toUpperCase()

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("localities")
    .select("id, city_name, ibge_code")
    .eq("state_code", stateCode)
    .order("city_name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "unknown_uf" }, { status: 404 })
  }

  return NextResponse.json({
    municipalities: data.map((row) => ({
      id: row.id,
      cityName: row.city_name,
      ibgeCode: row.ibge_code,
    })),
  })
}
