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

/**
 * A pergunta como a tela a recebe. UMA função, para todos os caminhos que
 * devolvem uma pergunta — lista da cidade, detalhe e criação em grupo — porque
 * a origem dupla (RUN-178) acrescentou `grupo` ao formato e um caminho que
 * esquecesse o campo quebraria o contrato só nele.
 */
export type LinhaDePergunta = Readonly<{
  id: string
  title: string
  category: Database["public"]["Enums"]["recommendation_category"]
  created_at: string
  is_resolved: boolean
  reply_count: number
  author_id: string
  group_id: string | null
  group_name: string | null
}>

export function apresentarPergunta(
  linha: LinhaDePergunta,
  nomes: ReadonlyMap<string, string>,
  userId: string,
) {
  return {
    id: linha.id,
    titulo: linha.title,
    categoria: linha.category,
    criadaEm: linha.created_at,
    resolvida: linha.is_resolved === true,
    respostas: linha.reply_count,
    propria: linha.author_id !== "" && linha.author_id === userId,
    autor: nomes.get(linha.author_id) ?? "",
    autorId: linha.author_id,
    grupo: linha.group_id === null ? null : { id: linha.group_id, nome: linha.group_name ?? "" },
  }
}
