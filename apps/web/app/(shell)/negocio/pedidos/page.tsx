import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  REQUEST_STATUS_LABELS,
  type ServiceRequestStatus,
} from "../../../../lib/service-requests/tracking"
import { ButtonLink } from "../../../components/ui/button"
import { Panel } from "../../../components/ui/panel"

export default async function BusinessRequestsPage() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"],
    key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !key) throw new Error("Supabase web environment is required")
  const cookieStore = await cookies()
  const client = createServerClient(url, key, {
    cookies: { getAll: () => cookieStore.getAll(), setAll() {} },
  })
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile, error: profileError } = await client
    .from("provider_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (profileError) throw new Error("Não foi possível carregar o negócio.")
  if (!profile) redirect("/negocio")
  const { data: requests, error } = await client
    .from("service_requests")
    .select("id,description,status,updated_at")
    .eq("provider_user_id", user.id)
    .eq("provider_id", profile.id)
    .order("updated_at", { ascending: false })
  if (error) throw new Error("Não foi possível carregar os pedidos recebidos.")
  return (
    <div className="mx-auto w-full max-w-[72rem] space-y-5 px-4 pt-5 pb-8 lg:px-8">
      <ButtonLink href="/negocio" variant="ghost">
        Voltar ao negócio
      </ButtonLink>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ui-ink">Pedidos recebidos</h1>
        <p className="mt-2 text-sm text-ui-ink-2">
          Converse, combine o orçamento e acompanhe cada pedido dirigido ao seu negócio.
        </p>
      </header>
      <Panel title="Pedidos do seu negócio" titleId="business-incoming-title" bodyClassName="p-5">
        {requests?.length ? (
          <ul className="divide-y divide-ui-line">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line font-medium text-ui-ink [overflow-wrap:anywhere]">
                    {request.description}
                  </p>
                  <p className="mt-2 text-sm text-ui-ink-2">
                    {REQUEST_STATUS_LABELS[request.status as ServiceRequestStatus]} ·{" "}
                    {new Date(request.updated_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <ButtonLink href={`/pedidos/${request.id}`}>Abrir pedido</ButtonLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ui-ink-2">
            Quando alguém pedir um orçamento na sua página, ele aparece aqui.
          </p>
        )}
      </Panel>
    </div>
  )
}
