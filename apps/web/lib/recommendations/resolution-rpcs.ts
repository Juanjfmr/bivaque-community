// Wrapper tipado dos RPCs de resolução (RECON-035).
//
// O cast é intencional e segue apps/web/lib/*-rpcs.ts: os tipos gerados vêm de
// `supabase gen types` contra um banco que aplicou a migration
// 20260911025357_recon_035_resolved_reply. Até essa regeneração acontecer, o
// nome do RPC não existe em database.generated.ts.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type ServiceClient = SupabaseClient<Database>

export interface ResolutionRpcs {
  mark_recommendation_reply_resolved: {
    args: { p_request_id: string; p_reply_id: string }
  }
  clear_recommendation_resolved_reply: {
    args: { p_request_id: string }
  }
  reopen_recommendation: {
    args: { p_request_id: string }
  }
}

export async function callResolutionRpc<K extends keyof ResolutionRpcs>(
  supabase: ServiceClient,
  name: K,
  args: ResolutionRpcs[K]["args"],
): Promise<{ error: { message: string } | null }> {
  const fn = supabase.rpc as unknown as (
    name: K,
    args: ResolutionRpcs[K]["args"],
  ) => Promise<{ data: unknown; error: { message: string } | null }>
  const { error } = await fn.call(supabase, name, args)
  return { error }
}
