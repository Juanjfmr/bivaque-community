import { createServerClient } from "@supabase/ssr"
import { MessageSquare, Package } from "lucide-react"
import { cookies } from "next/headers"
import { businessContent, ownBusinessDetails } from "../../../lib/providers/business-data"
import { ButtonLink } from "../../components/ui/button"
import { Panel } from "../../components/ui/panel"
import { BusinessContent } from "./business-content"
import { BusinessDetailsEditor } from "./business-details-editor"
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

  const profile = (data as BusinessProfile | null) ?? null
  if (!profile) return <BusinessForm profile={null} />
  const details = await ownBusinessDetails(supabase, profile.id)
  const content = details ? await businessContent(supabase, profile.id) : null
  const { count, error: requestError } = await supabase
    .from("service_requests")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", profile.id)
    .eq("provider_user_id", user.id)
    .in("status", ["open", "in_conversation"])
  if (requestError) throw new Error("Não foi possível carregar os pedidos do negócio.")
  return (
    <BusinessForm profile={profile}>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5">
          {details ? (
            <BusinessDetailsEditor providerId={profile.id} initial={details} />
          ) : (
            <Panel title="Gestão indisponível" titleId="business-ineligible-title">
              <p className="text-sm text-ui-ink-2">
                A edição exige participação ativa na cidade em que o negócio foi criado. Seus dados
                não foram apagados.
              </p>
            </Panel>
          )}
          {content && details && (
            <BusinessContent
              content={content}
              details={details}
              name={profile.display_name}
              owner
            />
          )}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-6">
          <Panel
            title="Pedidos recebidos"
            titleId="business-requests-title"
            bodyClassName="space-y-4 p-5"
          >
            <MessageSquare size={24} className="text-ui-brand" aria-hidden="true" />
            <p className="text-sm text-ui-ink-2">
              {count
                ? `${count} pedido${count === 1 ? "" : "s"} em acompanhamento`
                : "Nenhum pedido em acompanhamento"}
            </p>
            <ButtonLink href="/negocio/pedidos" variant="primary" className="w-full">
              Ver pedidos recebidos
            </ButtonLink>
          </Panel>
          <Panel
            title="Produtos do negócio"
            titleId="business-links-title"
            bodyClassName="space-y-4 p-5"
          >
            <Package size={24} className="text-ui-brand" aria-hidden="true" />
            <p className="text-sm text-ui-ink-2">
              Escolha quais anúncios pertencem ao negócio. Desapegos pessoais continuam separados.
            </p>
            <ButtonLink href="/negocio/anuncios" className="w-full">
              Vincular anúncios
            </ButtonLink>
            <ButtonLink href="/mercado/novo" variant="ghost" className="w-full">
              Publicar produto
            </ButtonLink>
          </Panel>
        </aside>
      </div>
    </BusinessForm>
  )
}
