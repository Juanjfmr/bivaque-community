import { PROVIDER_CATEGORY_LABELS } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type Cliente = SupabaseClient<Database>
type Perfil = Pick<
  Database["public"]["Tables"]["provider_profiles"]["Row"],
  "id" | "display_name" | "category" | "bio"
>

// Compatibilidade com o alcance antigo: comunidades só restringem a consulta
// à cidade atual. Não saem no contrato do app nem viram filtro de produto.
export async function alcanceDaCidade(client: Cliente, cidadeId: string): Promise<string> {
  const ids: string[] = []
  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await client
      .from("communities")
      .select("id")
      .eq("locality_id", cidadeId)
      .eq("is_deleted", false)
      .range(inicio, inicio + 999)
    if (error) throw error
    for (const linha of data ?? []) ids.push(linha.id)
    if ((data?.length ?? 0) < 1000) break
  }
  const local = `and(scope_type.eq.locality,scope_id.eq.${cidadeId})`
  return ids.length === 0
    ? local
    : `${local},and(scope_type.eq.community,scope_id.in.(${ids.join(",")}))`
}

export function consultaNegocios(client: Cliente, alcance: string) {
  return client
    .from("provider_profiles")
    .select(
      "id,display_name,category,bio,owner_user_id,provider_reach!inner(scope_type,scope_id,active)",
    )
    .eq("is_deleted", false)
    .eq("provider_reach.active", true)
    .or(alcance, { referencedTable: "provider_reach" })
}

export function resumoDoNegocio(perfil: Perfil) {
  return {
    id: perfil.id,
    nome: perfil.display_name,
    categoria: perfil.category,
    categoriaNome: PROVIDER_CATEGORY_LABELS[perfil.category],
    descricao: perfil.bio,
  }
}
