import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// Onda G Task 4 — o painel do prestador (D37): anúncio, métrica e caixa de
// pedidos. Duas das três ainda não existem de fato, e o painel DIZ ISSO em
// vez de fingir:
//   * Ficha/catálogo/portfólio: entrega completa desta task.
//   * Métrica: depende do PostHog (onda H) — estado vazio honesto, nunca
//     "0 visualizações", que é número inventado com cara de fato.
//   * Caixa de pedidos: chega na Task 6 — não há caixa vazia antes da hora.
//   * Alcance: mostra o estado atual (vila própria, grátis); upgrade é Task 7.

export default async function PrestadorHomePage() {
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
        // Read-only here.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return null
  }

  // service_role is privilege, not caller identity — the provider account
  // lookup passes the real user id explicitly (apps/web/AGENTS.md trust
  // boundary). The showcase reads below go through the AUTHENTICATED client:
  // the owner-only RLS of the showcase migration is what authorizes them.
  const serviceClient = createServiceClient()
  const { data: row, error: accountError } = await serviceClient
    .from("provider_accounts")
    .select("community_id, locality_id, created_at")
    .eq("auth_user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle()
  if (accountError) throw new Error(`Falha ao carregar a conta: ${accountError.message}`)
  if (!row) return null

  const { data: community, error: communityError } = await serviceClient
    .from("communities")
    .select("name")
    .eq("id", row.community_id)
    .maybeSingle()
  if (communityError) throw new Error(`Falha ao carregar a comunidade: ${communityError.message}`)

  const { data: profile, error: profileError } = await authClient
    .from("provider_profiles")
    .select("id, display_name")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (profileError) throw new Error(`Falha ao carregar a ficha: ${profileError.message}`)

  const { count: itemCount, error: itemError } = await authClient
    .from("provider_catalog_items")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", profile?.id ?? "")
  if (itemError) throw new Error(`Falha a contar o catálogo: ${itemError.message}`)

  const { count: photoCount, error: photoError } = await authClient
    .from("provider_portfolio_photos")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", profile?.id ?? "")
  if (photoError) throw new Error(`Falha a contar o portfólio: ${photoError.message}`)

  // PRIVACIDADE (D43/D37) — linha que um refactor futuro vai atravessar sem
  // perceber: o prestador vê APENAS o display_name do membro, e só consegue
  // lê-lo porque `conversation_counterpart_name` é um RPC estreito dentro de
  // conversa existente. NÃO troque por select em `profiles`: o prestador não
  // tem locality_memberships, nenhuma linha de profiles é visível para ele,
  // e afrouxar essa policy para "consertar" a lista expõe militares a civis.
  // Não o e-mail, não a vila, não a afiliação. O nome. E nada mais.
  const { data: ordersData, error: ordersError } = await authClient
    .from("dm_conversations")
    .select("id, context_id, created_at")
    .eq("context_type", "provider")
    .order("created_at", { ascending: false })
  if (ordersError) throw new Error(`Falha ao carregar a caixa de pedidos: ${ordersError.message}`)
  const orders = (ordersData ?? []) as Array<{
    id: string
    context_id: string | null
    created_at: string
  }>
  const orderNames = await Promise.all(
    orders.map(async (order) => {
      const { data: name } = await authClient.rpc("conversation_counterpart_name", {
        p_conversation_id: order.id,
      })
      return { ...order, counterpart: name ?? "Membro" }
    }),
  )

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold">Painel do prestador</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você foi indicado pela comunidade <strong>{community?.name ?? "desconhecida"}</strong>.
        </p>
      </header>

      <section aria-label="Ficha" className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-medium">Minha ficha</h2>
        {profile ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.display_name} · {itemCount ?? 0} {itemCount === 1 ? "item" : "itens"} no
              catálogo · {photoCount ?? 0} {photoCount === 1 ? "foto" : "fotos"} no portfólio
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href="/prestador/ficha" className="min-h-11 px-1 leading-[2.75rem] underline">
                Editar ficha
              </Link>
              <Link
                href="/prestador/catalogo"
                className="min-h-11 px-1 leading-[2.75rem] underline"
              >
                Catálogo e portfólio
              </Link>
              {profile.id ? (
                <Link
                  href={`/prestadores/${profile.id}`}
                  className="min-h-11 px-1 leading-[2.75rem] underline"
                >
                  Ver como o membro vê
                </Link>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Sua vitrine ainda não foi criada. Comece pela ficha: nome público, categoria e uma
              descrição curta do que você faz.
            </p>
            <div className="mt-3 text-sm">
              <Link href="/prestador/ficha" className="min-h-11 px-1 leading-[2.75rem] underline">
                Criar minha ficha
              </Link>
            </div>
          </>
        )}
      </section>

      <section aria-label="Alcance" className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-medium">Alcance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua vitrine aparece para os membros aprovados de{" "}
          <strong>{community?.name ?? "sua comunidade"}</strong>. Fazer a ficha aparecer além dela é
          um passo pago que ainda não existe no produto.
        </p>
      </section>

      <section aria-label="Pedidos" className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-medium">Pedidos</h2>
        {profile ? (
          orderNames.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Nenhuma conversa iniciada por membros ainda.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {orderNames.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {order.counterpart} ·{" "}
                    <span className="text-xs text-muted">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                  <Link
                    href={`/messages?conversation=${order.id}`}
                    className="min-h-11 px-1 leading-[2.75rem] underline"
                  >
                    Abrir conversa
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Disponível quando sua ficha estiver publicada.
          </p>
        )}
      </section>

      <section aria-label="Métrica" className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-medium">Métrica</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ainda não medimos visitas à sua ficha — quando a medição chegar, ela aparece aqui com os
          números reais. Não vamos mostrar zero só para preencher espaço.
        </p>
      </section>
    </main>
  )
}
