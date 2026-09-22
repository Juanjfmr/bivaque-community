// Helper tipado para as RPCs da bio (migration 20260911024732).
//
// O cast em `client.rpc` é intencional e segue o mesmo padrão de
// `profile-rpcs.ts` e `user-group-interests-rpcs.ts`: os tipos gerados só
// ganham o nome da RPC quando `supabase gen types` roda no CI. O contrato de
// runtime está no SQL da migration; esta assinatura espelha aquele contrato.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type ProfileClient = SupabaseClient<Database>

export interface ProfileBioRpcs {
  // SECURITY INVOKER: a RLS de `profiles` decide o que volta. Sem vínculo
  // compartilhado a função devolve `null`, que é o honesto: a linha não existe
  // para o leitor.
  get_profile_bio: {
    args: { p_user_id: string }
    returns: string | null
  }
  // SECURITY INVOKER + auth.uid(): só o próprio perfil. Vazio grava NULL (D3).
  set_profile_bio: {
    args: { p_bio: string | null }
    returns: null
  }
}

export async function callProfileBioRpc<K extends keyof ProfileBioRpcs>(
  client: ProfileClient,
  name: K,
  args: ProfileBioRpcs[K]["args"],
): Promise<{
  data: ProfileBioRpcs[K]["returns"] | null
  error: { message: string; code?: string } | null
}> {
  const fn = client.rpc as unknown as (
    name: K,
    args: ProfileBioRpcs[K]["args"],
  ) => Promise<{
    data: ProfileBioRpcs[K]["returns"] | null
    error: { message: string; code?: string } | null
  }>
  return fn.call(client, name, args)
}
