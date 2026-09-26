import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { BusinessForm, type BusinessProfile } from "./business-form"

export default async function BusinessPage() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) throw new Error("Supabase web environment is required")

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll() {},
    },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Entre novamente para gerenciar seu negócio.")

  const { data, error } = await supabase
    .from("provider_profiles")
    .select("id, display_name, category, bio")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (error) throw new Error(`Não foi possível carregar sua página: ${error.message}`)

  return <BusinessForm profile={(data as BusinessProfile | null) ?? null} />
}
