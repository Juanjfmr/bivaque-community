import type { SupabaseClient } from "@supabase/supabase-js"
import { createBrowserClient } from "../supabase/client"

// O `Database` gerado ainda não carrega as tabelas de anúncio: ele é gerado a
// partir do stack local, e a migration deste lote não está aplicada ao banco
// compartilhado (esta sessão não pode alterá-lo). Este shim mantém as consultas
// do Mercado funcionando e tipadas nas bordas até `pnpm generate:types` rodar
// depois da migration. Ao regenerar os tipos, troque por createBrowserClient().
export type ListingsClient = SupabaseClient

export function listingsClient(): ListingsClient {
  return createBrowserClient() as unknown as ListingsClient
}
