import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

/**
 * Quantos membros aprovados tem cada grupo, sem o embed `group_memberships(count)`.
 *
 * O grant de `group_memberships` é por coluna (group_id, user_id, role, status,
 * joined_at), sem SELECT de tabela para `authenticated` (20261024120000). O embed
 * de contagem do PostgREST exige o SELECT de tabela e responde 403, que a rota
 * vira 503. Aqui a contagem vem de linhas de colunas concedidas; a RLS continua
 * decidindo quais vínculos a pessoa enxerga, então a conta não amplia o que ela
 * já via pelo embed.
 */
export async function contarMembrosAprovados(
  client: SupabaseClient<Database>,
  grupoIds: readonly string[],
): Promise<ReadonlyMap<string, number>> {
  const ids = [...new Set(grupoIds)]
  const contagem = new Map<string, number>()
  if (ids.length === 0) return contagem
  const { data, error } = await client
    .from("group_memberships")
    .select("group_id")
    .in("group_id", ids)
    .eq("status", "approved")
  if (error) throw error
  for (const linha of data ?? []) {
    contagem.set(linha.group_id, (contagem.get(linha.group_id) ?? 0) + 1)
  }
  return contagem
}
