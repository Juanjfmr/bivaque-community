import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

/**
 * De que cidade é a pessoa da sessão.
 *
 * A cidade é sempre lida do banco, nunca do pedido, e sempre pelo vínculo
 * `kind = 'current'`: quem está em transferência tem duas linhas (a atual e a
 * que está deixando) e a leitura sem o filtro cai na cidade errada — o mesmo
 * recorte que `apps/web/app/(shell)/layout.tsx` usa.
 *
 * Mora aqui, e não junto das rotas de eventos, porque toda rota do app que
 * escopa dado por cidade faz a mesma pergunta: entrada, Início, busca, guia,
 * mercado, perfil. Uma leitura só é uma resposta só.
 */

export type CidadeDaSessao = Readonly<{ id: string; nome: string }>

/**
 * A cidade atual de quem está na sessão, ou `null` para quem ainda não tem
 * vínculo. Erro de leitura sobe: quem chama decide entre 503 e seguir.
 */
export async function cidadeDaSessao(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<CidadeDaSessao | null> {
  const { data, error } = await client
    .from("locality_memberships")
    .select("locality_id, localities(city_name)")
    .eq("user_id", userId)
    .eq("kind", "current")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (data === null) return null
  return { id: data.locality_id, nome: data.localities?.city_name ?? "" }
}
