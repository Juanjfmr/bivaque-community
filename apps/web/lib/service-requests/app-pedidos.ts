import { PROVIDER_CATEGORY_LABELS } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type Cliente = SupabaseClient<Database>

export function consultaPedidos(client: Cliente, userId: string) {
  return client
    .from("service_requests")
    .select(
      "id,provider_id,category,description,when_text,status,created_at,updated_at,conversation_id,provider_profiles(display_name)",
    )
    .eq("requester_user_id", userId)
}

type LinhaPedido = Pick<
  Database["public"]["Tables"]["service_requests"]["Row"],
  | "id"
  | "provider_id"
  | "category"
  | "description"
  | "when_text"
  | "status"
  | "created_at"
  | "updated_at"
  | "conversation_id"
> & {
  provider_profiles: { display_name: string } | null
}

export function resumoDoPedido(linha: LinhaPedido) {
  return {
    id: linha.id,
    negocioId: linha.provider_id,
    negocioNome: linha.provider_profiles?.display_name ?? "Negócio indisponível",
    categoriaNome: PROVIDER_CATEGORY_LABELS[linha.category],
    descricao: linha.description,
    quando: linha.when_text,
    situacao: linha.status,
    criadoEm: linha.created_at,
    atualizadoEm: linha.updated_at,
    conversaId: linha.conversation_id,
  }
}

export async function pedidoDoMembro(client: Cliente, userId: string, id: string) {
  const { data, error } = await consultaPedidos(client, userId).eq("id", id).maybeSingle()
  if (error) throw error
  return data === null ? null : resumoDoPedido(data)
}
