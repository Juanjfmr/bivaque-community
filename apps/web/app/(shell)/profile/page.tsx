"use client"

import {
  Avatar,
  Button,
  Input,
  Modal,
  Radio,
  RadioGroup,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  useOverlayState,
} from "@heroui/react"
import { useCallback, useEffect, useState } from "react"
import { PILOT_LOCALITY_ID } from "../../../lib/locality"
import { createBrowserClient } from "../../../lib/supabase/client"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { Skeleton } from "../../components/bivaque/skeleton"
import AvatarSection from "./avatar-section"
import FamilyInviteSection from "./family-invite-section"
import NotificationPreferencesSection from "./notification-preferences-section"

interface ProfileRow {
  user_id: string
  display_name: string | null
  locality_id: string
  visibility: string
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
  "março",
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

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

export default function ProfilePage() {
  const supabase = createBrowserClient()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [membership, setMembership] = useState<MembershipRow | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [displayName, setDisplayName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [nameFeedback, setNameFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const [visibility, setVisibility] = useState("locality_members")
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [visibilityFeedback, setVisibilityFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const signOutModal = useOverlayState()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState("")

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("Sessão expirada. Faça login novamente.")
      setLoading(false)
      return
    }

    const [{ data: profileRow }, { data: membershipRow }, { data: postRows }, { data: eventRows }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, locality_id, visibility")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("locality_memberships")
          .select("joined_at, localities(city_name, state_code)")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("feed_posts", {
          p_locality_id: PILOT_LOCALITY_ID,
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
      setDisplayName((profileRow as ProfileRow).display_name ?? "")
      setVisibility((profileRow as ProfileRow).visibility ?? "locality_members")
      if (membershipRow) setMembership(membershipRow as MembershipRow)
    } else {
      setError("Perfil não encontrado.")
    }

    const allPosts = (postRows ?? []) as unknown as PostRow[]
    setPosts(allPosts.slice(0, 20))
    setEvents((eventRows ?? []) as EventRow[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSaveDisplayName = async () => {
    const trimmed = displayName.trim()
    setNameFeedback(null)

    if (trimmed.length < 2 || trimmed.length > 80) {
      setNameFeedback({ type: "error", message: "O nome deve ter entre 2 e 80 caracteres." })
      return
    }

    setSavingName(true)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("user_id", profile?.user_id ?? "")

    if (updateError) {
      setNameFeedback({ type: "error", message: updateError.message })
    } else {
      setNameFeedback({ type: "success", message: "Nome atualizado." })
      setProfile((prev) => (prev ? { ...prev, display_name: trimmed } : prev))
    }
    setSavingName(false)
  }

  const handleSaveVisibility = async (value: "locality_members" | "hidden") => {
    setVisibilityFeedback(null)
    setSavingVisibility(true)

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ visibility: value })
      .eq("user_id", profile?.user_id ?? "")

    if (updateError) {
      setVisibilityFeedback({ type: "error", message: updateError.message })
    } else {
      setVisibility(value)
      setVisibilityFeedback({ type: "success", message: "Visibilidade atualizada." })
      setProfile((prev) => (prev ? { ...prev, visibility: value } : prev))
    }
    setSavingVisibility(false)
  }

  const handleConfirmSignOut = async () => {
    setSigningOut(true)
    setSignOutError("")
    const { error: signOutError } = await supabase.auth.signOut()
    setSigningOut(false)
    if (signOutError) {
      setSignOutError(signOutError.message)
      return
    }
    signOutModal.close()
    window.location.href = "/login"
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 py-12">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-5 w-40 rounded" />
        <Skeleton className="h-3 w-56 rounded" />
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

      <Tabs aria-label="Seções do perfil" variant="primary" className="rounded-xl">
        <TabList>
          <Tab id="posts">Publicações</Tab>
          <Tab id="events">Eventos</Tab>
          <Tab id="settings">Configurações</Tab>
        </TabList>

        <TabPanel id="posts">
          {posts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              Você ainda não publicou nada.
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {posts.map((p) => (
                <li key={p.id} className="rounded-xl border border-border bg-[var(--surface)] p-4">
                  <p className="text-sm break-words whitespace-pre-wrap">{p.content ?? ""}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span>{formatShortDate(p.created_at)}</span>
                    {p.reaction_count !== null && p.reaction_count > 0 && (
                      <span>
                        {p.reaction_count} {pluralize(p.reaction_count, "reação", "reações")}
                      </span>
                    )}
                    {p.comment_count !== null && p.comment_count > 0 && (
                      <span>
                        {p.comment_count} {pluralize(p.comment_count, "comentário", "comentários")}
                      </span>
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
              <p className="text-sm font-medium">Nome de exibição</p>
              <p className="mt-0.5 text-xs text-muted">
                Visível para outros membros da comunidade. Use entre 2 e 80 caracteres.
              </p>
              <div className="mt-3 flex items-start gap-2">
                <Input
                  aria-label="Nome de exibição"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName((e.target as HTMLInputElement).value)
                    setNameFeedback(null)
                  }}
                  maxLength={80}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onPress={handleSaveDisplayName}
                  isDisabled={savingName}
                  className="min-h-10"
                >
                  {savingName ? "Salvando…" : "Salvar"}
                </Button>
              </div>
              {nameFeedback && (
                <div className="mt-2">
                  <FeedbackAlert
                    variant={nameFeedback.type === "success" ? "success" : "danger"}
                    description={nameFeedback.message}
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
              <RadioGroup
                aria-label="Visibilidade do perfil"
                value={visibility}
                onChange={(value) => handleSaveVisibility(value as "locality_members" | "hidden")}
                isDisabled={savingVisibility}
                orientation="vertical"
              >
                <Radio value="locality_members">
                  <div className="flex flex-col gap-0.5">
                    <span>Membros da localidade</span>
                    <span className="text-xs text-muted">
                      Membros da sua comunidade podem ver seu perfil.
                    </span>
                  </div>
                </Radio>
                <Radio value="hidden">
                  <div className="flex flex-col gap-0.5">
                    <span>Oculto</span>
                    <span className="text-xs text-muted">
                      Seu perfil fica oculto para outros membros.
                    </span>
                  </div>
                </Radio>
              </RadioGroup>
              <p className="mt-2 text-xs text-muted">
                Controle quem pode ver seu perfil dentro da comunidade.
              </p>
              {visibilityFeedback && (
                <div className="mt-2">
                  <FeedbackAlert
                    variant={visibilityFeedback.type === "success" ? "success" : "danger"}
                    description={visibilityFeedback.message}
                  />
                </div>
              )}
            </div>

            <AvatarSection />

            <NotificationPreferencesSection />

            <FamilyInviteSection />

            <Button type="button" variant="danger" onPress={signOutModal.open} className="w-full">
              Sair da conta
            </Button>
          </div>
        </TabPanel>
      </Tabs>

      <Modal state={signOutModal}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Sair da conta</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">
                  Tem certeza que deseja sair da conta? Você podera entrar novamente a qualquer
                  momento.
                </p>
                {signOutError && (
                  <div className="mt-2">
                    <FeedbackAlert variant="danger" description={signOutError} />
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={signOutModal.close}>
                  Cancelar
                </Button>
                <Button variant="danger" onPress={handleConfirmSignOut} isDisabled={signingOut}>
                  {signingOut ? "Saindo..." : "Sair"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}
