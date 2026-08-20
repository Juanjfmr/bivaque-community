import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// Onda T Task 5, Step 2 — o console do fundador enxerga.
//
// Substitui o painel de demanda que morreu com a waitlist geográfica (P0
// Task 8, Step 3): volume de transferências declaradas e ainda não
// degradadas, por localidade de destino. É o dado que decide para onde a
// operação vai em seguida. list_locality_arrivals_volume (20260820051230) é
// operator-only e não expõe nada além de nome da cidade e contagem.
export const dynamic = "force-dynamic"

interface ArrivalVolumeRow {
  locality_id: string
  city_name: string
  arrivals_count: number
}

export default async function AdminArrivalsPage() {
  // The (admin) layout already gated this render on is_current_user_operator
  // for the session's own user, but the RPC re-checks with an explicit id —
  // service_role carries no auth.uid() of its own, so the caller must be
  // read from the session's cookies here, the same way the layout did.
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Server component, no writes.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) {
    return null
  }

  const serviceClient = createServiceClient()
  const { data: volumeData, error } = await serviceClient.rpc("list_locality_arrivals_volume", {
    p_user_id: user.id,
  })

  if (error) {
    throw new Error(`Falha ao ler o volume de chegadas: ${error.message}`)
  }

  const volume = (volumeData as ArrivalVolumeRow[] | null) ?? []

  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12"
      aria-labelledby="arrivals-heading"
    >
      <h1 id="arrivals-heading" className="text-2xl font-semibold tracking-tight">
        Chegadas declaradas
      </h1>
      <p className="text-sm text-muted">
        Transferências declaradas e ainda ativas, por cidade de destino — quem está a caminho, não
        quem já mora lá.
      </p>

      {volume.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma transferência declarada no momento.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {volume.map((row) => (
            <li
              key={row.locality_id}
              className="flex items-center justify-between rounded-md border border-border p-4 text-sm"
            >
              <span className="font-medium">{row.city_name}</span>
              <span className="text-muted">
                {row.arrivals_count} {row.arrivals_count === 1 ? "chegada" : "chegadas"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
