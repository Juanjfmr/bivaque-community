// Onda E Task 7 — other-member profile page (Server Component).
//
// /profile/[userId] is the page the privacy copy presupposes: a place to
// see another verified member's history. Three boundaries:
//   1. The viewer must be logged in (shell layout already gates this, but
//      we double-check).
//   2. The target must share a locality with the viewer (otherwise RLS
//      hides everything anyway; we notFound() for cleanliness — and for
//      the README "E2E ensinou": next 16 notFound responds 200, so the
//      test asserts the UI, not the status).
//   3. The two tabs (Publicações, Eventos) call RPCs that scope by the
//      VIEWER's locality — the leak-by-attention that the existing
//      /profile had is gone (post in vila A is invisible to a non-A viewer
//      even though it's in the same locality).

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { callProfileBioRpc } from "../../../../lib/profile/profile-bio-rpcs"
import { callProfileRpc } from "../../../../lib/profile-rpcs"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { MemberAvatar } from "../../../components/bivaque/avatar"
import { type AffiliationRow, ARMED_FORCES, affiliationFromRows } from "../affiliation"

interface PageProps {
  params: Promise<{ userId: string }>
}

// Helper: render one of the two profile sections (posts or events) given
// already-resolved rows. Kept here so the test file can read the JSX shape
// without re-importing the RPC.
function PostsSection({ rows }: { rows: PostRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">Nenhuma publicação visível.</p>
  }
  return (
    <ul className="space-y-3">
      {rows.map((p) => (
        <li key={p.id} className="rounded-xl border border-border bg-[var(--surface)] p-4">
          <p className="text-sm break-words whitespace-pre-wrap">{p.content ?? ""}</p>
          <p className="mt-1 text-xs text-muted">
            {new Date(p.created_at).toLocaleDateString("pt-BR")}
          </p>
        </li>
      ))}
    </ul>
  )
}

function EventsSection({ rows }: { rows: EventRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">Nenhum evento visível.</p>
  }
  return (
    <ul className="space-y-2">
      {rows.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between rounded-xl border border-border bg-[var(--surface)] px-4 py-3"
        >
          <span className="text-sm font-medium">{e.title}</span>
          <span className="text-xs text-muted">
            {new Date(e.starts_at).toLocaleDateString("pt-BR")}
          </span>
        </li>
      ))}
    </ul>
  )
}

type PostRow = {
  id: string
  content: string | null
  created_at: string
}

type EventRow = {
  id: string
  title: string
  starts_at: string
}

type ProfileRow = {
  display_name: string | null
}

export default async function OtherMemberProfilePage({ params }: PageProps) {
  const { userId } = await params

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
      setAll() {},
    },
  })

  const {
    data: { user: viewer },
  } = await authClient.auth.getUser()
  if (!viewer) {
    // The (shell) layout redirects anonymous users; this is defense in depth.
    notFound()
  }

  const serviceClient = createServiceClient()

  // Visibility: viewer and target must share a locality. This RPC is the
  // single source of truth (Step 3 of the plan: read every error; no embed
  // across tables without an FK).
  const { data: isVisible, error: visibilityError } = await callProfileRpc(
    serviceClient,
    "profile_is_visible_to_viewer",
    { p_target_user_id: userId, p_viewer_user_id: viewer.id },
  )
  if (visibilityError) {
    throw new Error(`Falha ao verificar visibilidade: ${visibilityError.message}`)
  }
  if (!isVisible) {
    // Target is in a locality the viewer doesn't share — the rest of the
    // page would render empty, so the honest answer is notFound(). The
    // privacy boundary is that the existence of the target's profile is
    // itself invisible to a viewer who doesn't share a locality.
    notFound()
  }

  // Profile metadata (display name). We read errors and never embed.
  const { data: profileRow, error: profileError } = await serviceClient
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle()
  if (profileError) {
    throw new Error(`Falha ao ler o perfil: ${profileError.message}`)
  }

  // Self-declared Armed Force / OM. This read goes through the VIEWER's
  // session client (authClient), deliberately NOT the service client the
  // rest of the page uses: service_role bypasses RLS, and bypassing it here
  // would hand a third party the rows the owner hid (is_visible = false).
  // Under the viewer's own role, `profile_affiliations_select_own_or_visible`
  // returns exactly the lines this viewer may see — nothing more. The result
  // IS the visibility decision; we render what came back and trust it.
  const { data: affiliationRows, error: affiliationError } = await authClient
    .from("profile_affiliations")
    .select("field, value, is_visible")
    .eq("user_id", userId)
  if (affiliationError) {
    throw new Error(`Falha ao ler a afiliação declarada: ${affiliationError.message}`)
  }
  const affiliation = affiliationFromRows((affiliationRows ?? []) as AffiliationRow[])
  const armedForceLabel = ARMED_FORCES.find((force) => force.id === affiliation.armedForce)

  // A bio segue a visibilidade do perfil (ADR D2): a leitura vai pelo cliente
  // da SESSÃO, não pelo service client. Sob a role do leitor, a RLS de
  // `profiles` devolve a bio quando a linha é visível e NULL quando não é — o
  // resultado É a decisão de visibilidade, e é ele que a tela renderiza.
  const { data: bioRow, error: bioError } = await callProfileBioRpc(authClient, "get_profile_bio", {
    p_user_id: userId,
  })
  if (bioError) {
    throw new Error(`Falha ao ler a apresentação: ${bioError.message}`)
  }
  const bio = bioRow ?? ""

  // Posts and events: scoped by the RPC (Step 3: server-side visibility).
  const [postsResult, eventsResult] = await Promise.all([
    callProfileRpc(serviceClient, "profile_posts_for", {
      p_target_user_id: userId,
      p_viewer_user_id: viewer.id,
    }),
    callProfileRpc(serviceClient, "profile_events_for", {
      p_target_user_id: userId,
      p_viewer_user_id: viewer.id,
    }),
  ])
  if (postsResult.error) {
    throw new Error(`Falha ao ler publicações: ${postsResult.error.message}`)
  }
  if (eventsResult.error) {
    throw new Error(`Falha ao ler eventos: ${eventsResult.error.message}`)
  }

  const profile = (profileRow as ProfileRow | null) ?? { display_name: null }
  const posts = (postsResult.data as PostRow[] | null) ?? []
  const events = (eventsResult.data as EventRow[] | null) ?? []

  // Prancha 51 (painel direito): identidade no topo e "Atividade recente".
  // Duas coisas NÃO estão aqui de propósito, e não por esquecimento:
  //
  //   - A cidade da pessoa. A prancha mostra "Brasília, DF", mas a única
  //     garantia real desta página é que existe UMA localidade compartilhada
  //     (`profile_is_visible_to_viewer`). Ler a localidade do alvo por fora
  //     das RPCs seria contorno de visibilidade — proibido pelo contrato.
  //   - O menu "Denunciar perfil / Bloquear usuário" da prancha. Denúncia não
  //     tem target type "profile" no contrato de `reports`, e bloqueio não tem
  //     contrato nenhum; o guia manda o menu só "where applicable". Afordância
  //     sem efeito é proibida (G1), então o menu entra quando o contrato existir.
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6 pb-8">
      <header className="flex items-start gap-4">
        <MemberAvatar
          name={profile.display_name}
          size="lg"
          src={`/api/avatar/${userId}`}
          className="h-16 w-16 text-xl"
        />
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">
            {profile.display_name ?? "Membro"}
          </h1>
          {bio.trim().length > 0 ? (
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-muted">{bio}</p>
          ) : null}
          <p className="mt-1 text-sm text-muted">
            Apenas conteúdo que você e esta pessoa podem ver pela mesma cidade.
          </p>
        </div>
      </header>

      {affiliation.armedForce !== "" || affiliation.om !== "" ? (
        // What the member chose to say, shown exactly as declared: no rank,
        // no unit inferred by verification, and deliberately no verification
        // badge on these fields — they are self-declared. Lines the viewer
        // cannot see never arrived, so an absent field renders no row at all.
        <section
          aria-labelledby="affiliation-heading"
          className="rounded-xl border border-border bg-[var(--surface)] p-4"
        >
          <h2 id="affiliation-heading" className="text-sm font-semibold">
            Afiliação declarada
          </h2>
          <dl className="mt-3 space-y-2">
            {affiliation.armedForce !== "" && armedForceLabel ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted">Força Armada</dt>
                <dd className="text-sm font-medium">{armedForceLabel.label}</dd>
              </div>
            ) : null}
            {affiliation.om !== "" ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted">OM</dt>
                <dd className="min-w-0 text-right text-sm font-medium break-words">
                  {affiliation.om}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section aria-labelledby="activity-heading" className="space-y-4">
        <h2 id="activity-heading" className="text-base font-semibold tracking-tight">
          Atividade recente
        </h2>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Publicações</h3>
          <PostsSection rows={posts} />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Eventos</h3>
          <EventsSection rows={events} />
        </div>
      </section>
    </div>
  )
}
