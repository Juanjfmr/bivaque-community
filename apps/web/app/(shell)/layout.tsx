import { createServerClient as createSsrServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { signCommunityImageUrls } from "../../lib/communities/community-image-urls"
import { LocalityContextProvider, type LocalityCurrent } from "../../lib/locality-context"
import { log } from "../../lib/logger"
import { MemberContextProvider } from "../../lib/member-context"
import { AppShell } from "../components/bivaque/app-shell"
import { ToastProvider } from "../components/bivaque/toast"

type ShellLayoutProperties = Readonly<{
  children: ReactNode
}>

// P0 Task 7: resolve the member's locality once per navigation, in the
// server layout, and hand it to the client tree via the provider. The
// middleware already guarantees a member here has a membership (it
// redirects to /onboarding when there is none); the redirect below is the
// defence in depth for the case where the membership disappears between
// the middleware check and the render.
//
// Onda T Task 4: `kind = 'current'` is now the source of truth for which
// membership is current — ordering by joined_at and taking the first row
// (the P0-era query) silently picked the OLDEST membership, which after a
// declared transfer is the *origin* (kind='leaving'), not the destination.
// That is exactly the failure mode the P0-era comment warned about. The
// leaving row, if any, is fetched separately and exposed as `outbound`.
const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"]
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

interface MembershipRow {
  locality_id: string
  localities: { city_name: string; state_code: string } | null
}

interface OutboundRow {
  locality_id: string
  leaving_at: string | null
  access: "active" | "read_only"
  localities: { city_name: string; state_code: string } | null
}

export default async function ShellLayout({ children }: ShellLayoutProperties) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set")
  }

  const cookieStore = await cookies()
  const supabase = createSsrServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const { data, error } = await supabase
    .from("locality_memberships")
    .select("locality_id, localities(city_name, state_code)")
    .eq("kind", "current")
    .maybeSingle()

  if (error) {
    // Surface the failure. The AGENTS.md / plans README rule: "read the
    // error of every query". A silent null here becomes a blank screen,
    // which is the original failure of this task.
    throw new Error(`Could not resolve the current locality: ${error.message}`)
  }

  if (data === null) {
    // The middleware should have caught this and routed the eligible-but-
    // not-provisioned member to the post-eligibility step. If we land here,
    // the gate is out of sync with the layout — fail loud, do not render.
    redirect("/onboarding/locality")
  }

  const row = data as unknown as MembershipRow
  const current: LocalityCurrent = {
    id: row.locality_id,
    cityName: row.localities?.city_name ?? row.locality_id,
    stateCode: row.localities?.state_code ?? "",
  }

  const { data: outboundData, error: outboundError } = await supabase
    .from("locality_memberships")
    .select("locality_id, leaving_at, access, localities(city_name, state_code)")
    .eq("kind", "leaving")
    .maybeSingle()

  if (outboundError) {
    throw new Error(`Could not resolve the outbound locality: ${outboundError.message}`)
  }

  const outboundRow = outboundData as unknown as OutboundRow | null
  const outbound =
    outboundRow === null
      ? null
      : {
          id: outboundRow.locality_id,
          cityName: outboundRow.localities?.city_name ?? outboundRow.locality_id,
          stateCode: outboundRow.localities?.state_code ?? "",
          endsAt: outboundRow.leaving_at ?? "",
          readOnly: outboundRow.access === "read_only",
        }

  // G0: identidade do membro + "Minhas comunidades" + badge de não-lidas para a
  // sidebar rica. Resolvido aqui, no servidor, e distribuído via MemberContext.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || user === null) {
    // O middleware garante um usuário autenticado aqui; se sumiu entre o gate e
    // o render, falhe alto como nos blocos acima.
    redirect("/login")
  }

  // ── Dados da sidebar: falha NÃO derruba o shell ──────────────────────────
  //
  // A localidade acima é estrutural: sem ela não há o que renderizar, e por isso
  // ela lança. Identidade, comunidades e contagem de não-lidas são o conteúdo da
  // sidebar. Este layout embrulha TODA rota autenticada, então lançar aqui
  // transformava um soluço na contagem de não-lidas em 500 em todas as páginas
  // do membro, com stack do Postgres chegando ao navegador — o oposto de
  // "erro interno nunca chega ao membro" (DESIGN_SYSTEM §6.1).
  //
  // Agora cada consulta degrada para um padrão seguro e o erro é registrado. O
  // erro continua sendo LIDO, que é a regra da casa; o que muda é a resposta a
  // ele: a sidebar mostra menos, em vez de o aplicativo inteiro cair.

  // A PK de `profiles` é `user_id`, não `id` (migration
  // 20260802000100_locality_profile_foundation.sql:32). O client SSR aqui é
  // instanciado sem o genérico <Database>, então o typecheck não confere nome
  // de coluna — este erro só aparece em runtime.
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profileError) {
    log.error("shell: could not resolve the member profile", {
      user_id: user.id,
      error: profileError.message,
    })
  }

  // `profiles` exige uma linha de membership, que o bloco acima já resolveu, então
  // a ausência de perfil aqui é anomalia, não estado normal. Ainda assim ela não
  // pode virar nome em branco na sidebar: o avatar renderiza inicial vazia e o
  // rodapé fica sem identidade nenhuma. Rótulo neutro é melhor que buraco.
  const displayName =
    (profileRow as { display_name: string } | null)?.display_name?.trim() || "Membro"

  const { data: communityRows, error: communitiesError } = await supabase
    .from("community_memberships")
    .select("communities(id, name, is_deleted, thumbnail_path)")
    .eq("user_id", user.id)
    .eq("status", "approved")

  if (communitiesError) {
    log.error("shell: could not resolve the member communities", {
      user_id: user.id,
      error: communitiesError.message,
    })
  }

  // Comunidade apagada continua com a linha de membership; a sidebar não pode
  // listá-la (communities.is_deleted, migration 20260805211933:26).
  type CommunityEmbed = {
    id: string
    name: string
    is_deleted: boolean
    thumbnail_path: string | null
  }
  const communityRowsFiltered = (
    (communityRows as unknown as { communities: CommunityEmbed | null }[]) ?? []
  )
    .map((r) => r.communities)
    .filter((c): c is CommunityEmbed => c !== null && c.is_deleted !== true)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))

  // URL assinada da miniatura de cada comunidade: o client autenticado assina,
  // então a policy de leitura de storage decide de novo se o membro alcança a
  // comunidade. Sem imagem, o item cai para a inicial do nome.
  const communityImageUrls = await signCommunityImageUrls(
    supabase,
    communityRowsFiltered.map((c) => ({
      communityId: c.id,
      banner: false,
      thumbnail: c.thumbnail_path !== null,
    })),
  )

  const communities = communityRowsFiltered.map((c) => ({
    id: c.id,
    name: c.name,
    thumbnailUrl: communityImageUrls.get(c.id)?.thumbnailUrl ?? null,
  }))

  const { count: unreadRaw, error: unreadError } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", user.id)
    .is("read_at", null)

  if (unreadError) {
    log.error("shell: could not resolve unread notifications", {
      user_id: user.id,
      error: unreadError.message,
    })
  }

  const unreadCount = unreadRaw ?? 0

  return (
    <LocalityContextProvider value={{ current, outbound }}>
      <MemberContextProvider value={{ displayName, communities, unreadCount }}>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </MemberContextProvider>
    </LocalityContextProvider>
  )
}
