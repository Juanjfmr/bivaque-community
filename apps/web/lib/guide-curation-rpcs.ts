// Typed RPC helper for the E8 guide-curation RPCs.
// Lives in the same place as the other typed RPC helpers; the cast is
// intentional (generated types do not include these names yet).

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type ServiceClient = SupabaseClient<Database>

export interface GuideCurationRpcs {
  promote_reply_to_guide_entry: {
    args: {
      p_reply_id: string
      p_locality_id: string
      p_category: "school" | "hospital" | "transporter" | "courier"
      p_name: string
      p_description: string
      p_website_url: string | null
      p_phone: string | null
      p_operator_user_id: string
    }
    returns: string
  }
  list_promotable_replies: {
    args: { p_locality_id: string; p_limit: number }
    returns: Array<{
      reply_id: string
      body: string
      created_at: string
      request_title: string
      request_category: string
      author_display_name: string | null
    }>
  }
}

export async function callGuideCurationRpc<K extends keyof GuideCurationRpcs>(
  supabase: ServiceClient,
  name: K,
  args: GuideCurationRpcs[K]["args"],
): Promise<{
  data: GuideCurationRpcs[K]["returns"] | null
  error: { message: string } | null
}> {
  const fn = supabase.rpc as unknown as (
    name: K,
    args: GuideCurationRpcs[K]["args"],
  ) => Promise<{
    data: GuideCurationRpcs[K]["returns"] | null
    error: { message: string } | null
  }>
  return fn.call(supabase, name, args)
}
