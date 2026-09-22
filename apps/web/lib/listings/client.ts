import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../supabase/client"

// O domínio `listings` já vive no schema público gerado, então o cliente do
// Mercado é tipado como o resto da aplicação.
export type ListingsClient = SupabaseClient<Database>

export function listingsClient(): ListingsClient {
  return createBrowserClient()
}
