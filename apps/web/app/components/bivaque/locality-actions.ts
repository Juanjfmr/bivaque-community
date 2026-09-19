"use server"

import { createServerClient } from "../../../lib/supabase/server"

// RUN-006 — catálogo do seletor de cidade do shell.
//
// Por que Server Action e não consulta do cliente: `localities` tem
// `localities_select_same_membership` (RLS: `private.is_locality_member(id)`),
// então o membro não lê o NOME de nenhuma cidade além da sua, e um seletor
// alimentado pelo cliente mostraria uma cidade só. É o mesmo caminho que o
// passo de cidade do onboarding já usa (`searchCitiesAction`): leitura de
// catálogo pelo servidor, sempre limitada.
//
// Por que BUSCA e não lista: hoje são 19 cidades com comunidade, mas o alvo é
// nacional — o catálogo tem 5.571 municípios. Uma lista chapada morre no
// primeiro estado que entrar. A busca acontece no banco, com teto de
// resultados, então o custo não cresce com o catálogo.
//
// O que é exposto, e por que é proporcional: as cidades onde o Bivaque tem
// comunidade. Qualquer sessão autenticada já deriva isso — a policy
// `communities_select_authenticated` libera a linha inteira, com `locality_id`,
// para todo o país; o nome do município é catálogo público do IBGE.
//
// O que NÃO acontece aqui: conceder acesso. Trocar a cidade muda o parâmetro de
// navegação e nada mais; quem decide o que a pessoa lê continua sendo a RLS de
// cada recurso (W02: "cidade de busca não altera autorização").

export type SwitcherCity = {
  id: string
  cityName: string
  stateCode: string
}

const SEARCH_LIMIT = 20
const DEFAULT_LIMIT = 8

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

export async function searchSwitcherCitiesAction(rawQuery: string): Promise<SwitcherCity[]> {
  const query = rawQuery.trim()
  const supabase = createServerClient()

  // Só cidades com comunidade: mandar alguém para um município vazio é um beco
  // sem saída, e o seletor existe para levar a algum lugar.
  const { data: communityRows, error: communitiesError } = await supabase
    .from("communities")
    .select("locality_id")
    .eq("is_deleted", false)

  if (communitiesError) {
    throw new Error("Não foi possível carregar as cidades. Tente novamente.")
  }

  const localityIds = [...new Set((communityRows ?? []).map((row) => row.locality_id))]
  if (localityIds.length === 0) return []

  const selection = supabase
    .from("localities")
    .select("id, city_name, state_code")
    .in("id", localityIds)

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
    stateCode: row.state_code,
  }))
}
