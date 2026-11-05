import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

/**
 * O que as rotas da jornada de eventos compartilham: o formato de id que elas
 * aceitam e a resposta a uma pergunta que TODAS fazem — de que cidade é a pessoa
 * da sessão.
 *
 * A cidade é sempre lida do banco, nunca do pedido, e sempre pelo vínculo
 * `kind = 'current'`: quem está em transferência tem duas linhas (a atual e a
 * que está deixando) e a leitura sem o filtro cai na cidade errada — o mesmo
 * recorte que `apps/web/app/(shell)/layout.tsx` usa.
 */

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Id no formato que as rotas aceitam. Não é prova de existência. */
export function ehUuid(valor: string | undefined): valor is string {
  return typeof valor === "string" && UUID.test(valor)
}

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

export type EncontroDaSessao = Readonly<{
  starts_at: string
  locality_id: string
  organizer_id: string
}>

/**
 * O encontro como as rotas de escrita precisam dele. `null` é "não existe ou não
 * é visível" — a RLS decide, e é por isso que a resposta é 404 e não 403.
 */
export async function encontroDaSessao(
  client: SupabaseClient<Database>,
  eventoId: string,
): Promise<EncontroDaSessao | null> {
  const { data, error } = await client
    .from("events")
    .select("starts_at, locality_id, organizer_id")
    .eq("id", eventoId)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * O que uma recusa do banco significa para a rota. A mensagem do Postgres nunca
 * vai para a pessoa: ela é técnica, em inglês, e às vezes cita a política.
 *
 * - `42501` (RLS/permissão) e `P0001` (o `raise` de um trigger, como o que
 *   impede o organizador de confirmar presença no próprio encontro) são recusa;
 * - `23514` (check) e `22023` (argumento inválido do Postgres) são dado inválido;
 * - o resto é indisponibilidade: a rota não sabe o que aconteceu.
 */
export type ErroDoBanco = Readonly<{
  status: 400 | 403 | 503
  corpo: Readonly<Record<string, unknown>>
}>

export function interpretarErroDoBanco(
  codigo: string | undefined,
  mensagens: Readonly<{ recusado: string; dados: string }>,
): ErroDoBanco {
  if (codigo === "42501" || codigo === "P0001") {
    return { status: 403, corpo: { erro: "recusado", mensagem: mensagens.recusado } }
  }
  if (codigo === "23514" || codigo === "22023") {
    return { status: 400, corpo: { erro: "dados-invalidos", mensagem: mensagens.dados } }
  }
  return { status: 503, corpo: { erro: "escrita-indisponivel" } }
}

/**
 * O caminho de capa que o app pode mandar: vazio (tirar a capa) ou dentro da
 * pasta de quem organiza. `..`, `//` e `\` nunca são caminho legítimo de bucket
 * — são tentativa de sair da pasta.
 */
export function caminhoDeCapaValido(valor: string, userId: string): boolean {
  if (valor === "") return true
  if (valor.includes("..") || valor.includes("//") || valor.includes("\\")) return false
  return valor.startsWith(`${userId}/`)
}
