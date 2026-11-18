import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

// AUTHZ-007 — o veto de foto de anúncio, de evento e de portfólio é do
// servidor, ANTES do upload com service_role (que ignora RLS). A linha no
// banco já é vetada pelas policies restritivas do AUTHZ-006/007; conferir a
// conta aqui é o que evita o objeto órfão no bucket.
//
// `public.can_account_write_content()` é a RPC pública de autoverificação
// criada na migration do AUTHZ-007: o predicado de verdade é o mesmo
// `private.can_write_own_content()` das policies, e a identidade sai do JWT da
// sessão — o cliente passado aqui é sempre o da pessoa, nunca um de serviço.

export type EscritaDaConta = { ok: true } | { ok: false; motivo: "conta" | "indisponivel" }

export async function conferirEscritaDaConta(
  client: SupabaseClient<Database>,
): Promise<EscritaDaConta> {
  const { data, error } = await client.rpc("can_account_write_content")
  if (error) return { ok: false, motivo: "indisponivel" }
  return data === true ? { ok: true } : { ok: false, motivo: "conta" }
}
