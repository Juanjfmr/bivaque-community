import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

/**
 * O que as rotas de perguntas compartilham entre si.
 *
 * A cidade da sessão, a validação de id e a tradução de erro do banco já moram
 * em `../eventos/_comum`, e são as mesmas para qualquer jornada: importar de lá
 * é melhor do que uma quarta cópia do recorte `kind = 'current'`.
 *
 * Aqui fica só o que é desta jornada: os nomes de quem escreveu. Nome ausente
 * não é falha de leitura — é uma pessoa sem nome público, e a tela diz "Alguém
 * da cidade" em vez de inventar.
 */

export async function nomesDeAutores(
  client: SupabaseClient<Database>,
  ids: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const unicos = [...new Set(ids)]
  if (unicos.length === 0) return new Map()
  const { data, error } = await client
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", unicos)
  if (error) throw error
  return new Map((data ?? []).map((perfil) => [perfil.user_id, perfil.display_name]))
}
