import { NextResponse } from "next/server"
import { createServerClient } from "../../../lib/supabase/server"

// P0 Task 5: o catálogo canônico servido do banco (Task 1). Nunca a BrasilAPI
// em runtime. Só UFs distintas do catálogo — a tela pede UF primeiro e depois
// município.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase.rpc("list_locality_state_codes")

  if (error) {
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  const ufs = (data ?? []).map((row) => row.state_code)
  return NextResponse.json({ ufs })
}
