// Shared typed RPC helper for community invitation RPCs that are not yet in
// the generated supabase types. Lives in a non-server-action module so both
// server actions and server components can import it.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type ServiceClient = SupabaseClient<Database>

export interface CommunityInviteRpcs {
  create_community_invitation: {
    args: {
      p_community_id: string
      p_inviter_user_id: string
      p_token_digest: string
      p_expires_at: string
    }
    returns: string
  }
  accept_community_invitation: {
    args: { p_token_digest: string; p_user_id: string }
    returns: string
  }
  revoke_community_invitation: {
    args: { p_invitation_id: string; p_inviter_user_id: string }
    returns: null
  }
  list_pending_community_invitations: {
    args: { p_inviter_user_id: string; p_community_id: string }
    returns: Array<{
      id: string
      community_id: string
      expires_at: string
      created_at: string
    }>
  }
  is_community_member: { args: { p_community_id: string; p_user_id: string }; returns: boolean }
}

// The cast on supabase.rpc is intentional: the generated types do not include
// these names yet. The runtime contract is in the SQL migration; this call
// signature mirrors it. Replace with the generated entry when `supabase gen
// types` runs against a stack that has migration 20260821000002 applied.
export async function callCommunityInviteRpc<K extends keyof CommunityInviteRpcs>(
  supabase: ServiceClient,
  name: K,
  args: CommunityInviteRpcs[K]["args"],
): Promise<{ data: CommunityInviteRpcs[K]["returns"] | null; error: { message: string } | null }> {
  const fn = supabase.rpc as unknown as (
    name: K,
    args: CommunityInviteRpcs[K]["args"],
  ) => Promise<{
    data: CommunityInviteRpcs[K]["returns"] | null
    error: { message: string } | null
  }>
  return fn.call(supabase, name, args)
}
