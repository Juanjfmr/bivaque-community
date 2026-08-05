"use client"

import { Avatar, Tab, TabList, TabPanel, Tabs } from "@heroui/react"
import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "../../lib/supabase/client"

interface ProfileRow {
  user_id: string
  display_name: string | null
  locality_id: string
}

interface MembershipRow {
  joined_at: string
  localities: { city_name: string; state_code: string } | null
}

interface PostRow {
  id: string
  content: string | null
  post_type: string
  created_at: string
  comment_count: number | null
  reaction_count: number | null
}

interface EventRow {
  id: string
  title: string
  starts_at: string
  locality_id: string
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
]

function formatJoinedMonthYear(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  })
}

export default function ProfilePage() {
  const supabase = createBrowserClient()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [membership, setMembership] = useState<MembershipRow | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("Sessao expirada. Faca login novamente.")
      setLoading(false)
      return
    }

    const [{ data: profileRow }, { data: membershipRow }, { data: postRows }, { data: eventRows }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, locality_id")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("locality_memberships")
          .select("joined_at, localities(city_name, state_code)")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("feed_posts", {
          p_locality_id: "00000000-0000-4000-8000-000000000001",
          p_order: "recent",
        }),
        supabase
          .from("events")
          .select("id, title, starts_at, locality_id")
          .order("starts_at", { ascending: true })
          .limit(10),
      ])

    if (profileRow) {
      setProfile(profileRow as ProfileRow)
      if (membershipRow) setMembership(membershipRow as MembershipRow)
    } else {
      setError("Perfil nao encontrado.")
    }

    const allPosts = (postRows ?? []) as unknown as PostRow[]
    setPosts(allPosts.slice(0, 20))
    setEvents((eventRows ?? []) as EventRow[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 py-12">
        <div className="h-16 w-16 animate-pulse rounded-full bg-[var(--surface-subtle)]" />
        <div className="h-5 w-40 animate-pulse rounded bg-[var(--surface-subtle)]" />
        <div className="h-3 w-56 animate-pulse rounded bg-[var(--surface-subtle)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <p className="text-sm text-[var(--danger)]">{error}</p>
      </div>
    )
  }

  if (!profile) return null

  const initials = (profile.display_name ?? "?").charAt(0).toUpperCase()
  const localityName = membership?.localities?.city_name ?? "Manaus"
  const localityState = membership?.localities?.state_code ?? "AM"
  const joinedLabel = membership?.joined_at
    ? `membro desde ${formatJoinedMonthYear(membership.joined_at)}`
    : null

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <Avatar className="h-16 w-16 bg-[var(--surface-subtle)] text-[var(--foreground)] text-xl">
          {initials}
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile.display_name ?? "Membro"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {localityName}, {localityState}
            {joinedLabel ? (
              <>
                {" \u00b7 "}
                {joinedLabel}
              </>
            ) : null}
          </p>
        </div>
      </header>

      <Tabs aria-label="Secoes do perfil" variant="primary" className="rounded-xl">
        <TabList>
          <Tab id="posts">Publicacoes</Tab>
          <Tab id="events">Eventos</Tab>
          <Tab id="settings">Configuracoes</Tab>
        </TabList>

        <TabPanel id="posts">
          {posts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              Voce ainda nao publicou nada.
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {posts.map((p) => (
                <li key={p.id} className="rounded-xl border border-border bg-[var(--surface)] p-4">
                  <p className="text-sm break-words whitespace-pre-wrap">{p.content ?? ""}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span>{formatShortDate(p.created_at)}</span>
                    {p.reaction_count !== null && p.reaction_count > 0 && (
                      <span>{p.reaction_count} reacao(oes)</span>
                    )}
                    {p.comment_count !== null && p.comment_count > 0 && (
                      <span>{p.comment_count} comentario(s)</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabPanel>

        <TabPanel id="events">
          {events.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              Nenhum evento cadastrado.
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-[var(--surface)] px-4 py-3"
                >
                  <span className="text-sm font-medium">{e.title}</span>
                  <span className="text-xs text-muted">{formatShortDate(e.starts_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </TabPanel>

        <TabPanel id="settings">
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
              <p className="text-sm font-medium">Preferencias de notificacao</p>
              <p className="mt-1 text-xs text-muted">
                Receber alertas de novas mensagens, comentarios e eventos.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
              <p className="text-sm font-medium">Privacidade do perfil</p>
              <p className="mt-1 text-xs text-muted">
                Seu perfil e visivel apenas para membros da sua comunidade.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
              <p className="text-sm font-medium">Convites de familia</p>
              <p className="mt-1 text-xs text-muted">
                Gerencie os convites enviados para familiares.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = "/login"
              }}
              className="flex w-full min-h-11 items-center justify-center rounded-xl border border-[var(--danger-soft)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)]"
            >
              Sair da conta
            </button>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  )
}
