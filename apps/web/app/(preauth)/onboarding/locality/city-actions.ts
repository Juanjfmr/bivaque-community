"use server"

import { createServerClient } from "../../../../lib/supabase/server"

// Catálogo canônico de localidades para o passo de contexto (prancha 39).
// O catálogo não é dado pessoal e já é servido hoje por `/api/localities`;
// aqui a mesma leitura vira Server Action porque a tela precisa buscar por
// nome de cidade, não por UF. Só leitura, sempre limitada.

export type CityOption = {
  cityName: string
  ibgeCode: string
  id: string
  stateCode: string
}

const SEARCH_LIMIT = 20
const DEFAULT_LIMIT = 8

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

export async function searchCitiesAction(rawQuery: string): Promise<CityOption[]> {
  const query = rawQuery.trim()
  const supabase = createServerClient()

  const selection = supabase.from("localities").select("id, city_name, state_code, ibge_code")
  const filtered =
    query.length > 0 ? selection.ilike("city_name", `%${escapeLike(query)}%`) : selection

  const { data, error } = await filtered
    .order("city_name", { ascending: true })
    .limit(query.length > 0 ? SEARCH_LIMIT : DEFAULT_LIMIT)

  if (error) {
    throw new Error("Não foi possível carregar as cidades. Tente novamente.")
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    cityName: row.city_name,
    ibgeCode: row.ibge_code,
    stateCode: row.state_code,
  }))
}
