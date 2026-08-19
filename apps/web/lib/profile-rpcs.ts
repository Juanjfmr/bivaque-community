// Shared typed RPC helper for the other-member profile RPCs.
// RPCs introduced in migrations 20260821000004 (display name policy) and
// 20260821000005 (profile visibility RPCs).

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type ServiceClient = SupabaseClient<Database>

export interface ProfileRpcs {
  profile_posts_for: {
    args: { p_target_user_id: string }
    returns: Array<{
      id: string
      locality_id: string
      community_id: string | null
      group_id: string | null
      post_type: "text" | "photo" | "link" | "poll"
      content: string | null
      photo_path: string | null
      link_url: string | null
      poll_options: unknown
      created_at: string
    }>
  }
  profile_events_for: {
    args: { p_target_user_id: string }
    returns: Array<{
      id: string
      title: string
      starts_at: string
      locality_id: string
    }>
  }
  profile_is_visible_to_viewer: {
    args: { p_target_user_id: string }
    returns: boolean
  }
}

// The cast on supabase.rpc is intentional: the generated types do not
// include these names until `supabase gen types` runs in CI.
export async function callProfileRpc<K extends keyof ProfileRpcs>(
  supabase: ServiceClient,
  name: K,
  args: ProfileRpcs[K]["args"],
): Promise<{
  data: ProfileRpcs[K]["returns"] | null
  error: { message: string } | null
}> {
  const fn = supabase.rpc as unknown as (
    name: K,
    args: ProfileRpcs[K]["args"],
  ) => Promise<{
    data: ProfileRpcs[K]["returns"] | null
    error: { message: string } | null
  }>
  return fn.call(supabase, name, args)
}
