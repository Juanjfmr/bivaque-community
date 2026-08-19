// Shared typed RPC helper for user group interest RPCs.
// RPCs introduced in migration 20260821000003 (Wave E Task 11).
// Lives outside the server-action module so server components can import
// it too.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type ServiceClient = SupabaseClient<Database>

export interface UserGroupInterestsRpcs {
  record_user_group_interests: {
    args: { p_user_id: string; p_locality_id: string; p_group_ids: string[] }
    returns: null
  }
  list_user_group_interests: {
    args: { p_user_id: string }
    returns: Array<{ group_id: string; created_at: string }>
  }
  list_available_groups_for_interests: {
    args: { p_user_id: string; p_locality_id: string }
    returns: Array<{
      id: string
      name: string
      description: string | null
      visibility: "public" | "private"
      already_member: boolean
      already_interest: boolean
    }>
  }
  suggest_groups_for_user: {
    args: { p_user_id: string; p_locality_id: string }
    returns: Array<{
      id: string
      name: string
      description: string | null
      visibility: "public" | "private"
    }>
  }
}

// The cast on supabase.rpc is intentional: the generated types do not
// include these names until `supabase gen types` runs in CI. The runtime
// contract is in the SQL migration; this signature mirrors it.
export async function callUserGroupInterestsRpc<K extends keyof UserGroupInterestsRpcs>(
  supabase: ServiceClient,
  name: K,
  args: UserGroupInterestsRpcs[K]["args"],
): Promise<{
  data: UserGroupInterestsRpcs[K]["returns"] | null
  error: { message: string } | null
}> {
  const fn = supabase.rpc as unknown as (
    name: K,
    args: UserGroupInterestsRpcs[K]["args"],
  ) => Promise<{
    data: UserGroupInterestsRpcs[K]["returns"] | null
    error: { message: string } | null
  }>
  return fn.call(supabase, name, args)
}
