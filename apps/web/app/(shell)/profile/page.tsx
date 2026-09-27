"use client"

import { Button, Modal, useOverlayState } from "@heroui/react"
import {
  Bookmark,
  ChevronRight,
  ClipboardList,
  MapPin,
  MessageCircle,
  Pencil,
  Settings,
  Tag,
} from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import { bioFromRow } from "../../../lib/profile/bio"
import { callProfileBioRpc } from "../../../lib/profile/profile-bio-rpcs"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../../components/bivaque/avatar"
import { ModalCloseTrigger } from "../../components/bivaque/close-button"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { Skeleton } from "../../components/bivaque/skeleton"
import { ARMED_FORCES } from "./affiliation"
import { CitySection } from "./city-section"
import { ProfileIndications } from "./profile-indications"

// O próprio perfil (25/09/2026). Referências do Mobbin: Nextdoor na web
// (https://mobbin.com/screens/10c96bc9-eb70-4bcb-8203-4aa801a13954) — capa,
// foto, nome e bairro, "Editar perfil", um painel "só você vê" com atalhos, e
// depois grupos e publicações; Digg e AllTrails no celular
// (https://mobbin.com/screens/c7f21dd4-8f18-494d-a260-d20bc2fb9ba6,
// https://mobbin.com/screens/6a255b50-4f4e-4904-8937-f129dade1f61) — a edição é
// uma tela à parte. Antes, o perfil era um formulário aberto o tempo todo e não
// mostrava nada do que a pessoa faz no Bivaque; a edição foi para
// /profile/editar, e notificações e família ficam em Configurações.

interface Identity {
  userId: string
  displayName: string
  bio: string
  joinedAt: string | null
  badges: string[]
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

function joinedLabel(iso: string): string {
  const date = new Date(iso)
  return `membro desde ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`
}

// Só o que a pessoa escolheu mostrar (is_visible) vira etiqueta no cabeçalho.
function visibleBadges(rows: { field: string; value: string; is_visible: boolean }[]): string[] {
  const badges: string[] = []
  for (const row of rows) {
    if (!row.is_visible || !row.value) continue
    if (row.field === "armed_force") {
      badges.push(ARMED_FORCES.find((force) => force.id === row.value)?.label ?? row.value)
    } else if (row.field === "om") {
      badges.push(row.value)
    }
  }
  return badges
}

const OWNER_SHORTCUTS = [
  { href: "/salvos", label: "Salvos", Icon: Bookmark },
  { href: "/messages", label: "Mensagens", Icon: MessageCircle },
  { href: "/meus-anuncios", label: "Meus anúncios", Icon: Tag },
  { href: "/pedidos", label: "Meus orçamentos", Icon: ClipboardList },
] as const

export default function ProfilePage() {
  const router = useRouter()
  const { current } = useLocalityContext()
  const { communities } = useMemberContext()
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [hasBusinessPage, setHasBusinessPage] = useState(false)
  const [error, setError] = useState("")
  const signOutModal = useOverlayState()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState("")

  const load = useCallback(async () => {
    setError("")
    const supabase = createBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("Sua sessão expirou. Entre novamente para continuar.")
      return
    }
    const [profileResult, bioResult, affiliationResult, membershipResult, businessResult] =
      await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
        callProfileBioRpc(supabase, "get_profile_bio", { p_user_id: user.id }),
        supabase
          .from("profile_affiliations")
          .select("field, value, is_visible")
          .eq("user_id", user.id),
        supabase
          .from("locality_memberships")
          .select("joined_at")
          .eq("user_id", user.id)
          .eq("kind", "current")
          .maybeSingle(),
        supabase.from("provider_profiles").select("id").eq("owner_user_id", user.id).maybeSingle(),
      ])
    if (profileResult.error || !profileResult.data) {
      setError("Não foi possível carregar seu perfil. Tente novamente.")
      return
    }
    setHasBusinessPage(!businessResult.error && businessResult.data !== null)
    // Apresentação, etiquetas e data são enfeite do cabeçalho: se falharem, o
    // perfil aparece sem eles, com o nome.
    setIdentity({
      userId: user.id,
      displayName: profileResult.data.display_name ?? "Membro",
      bio: bioResult.error ? "" : bioFromRow(bioResult.data),
      joinedAt: (membershipResult.data as { joined_at: string } | null)?.joined_at ?? null,
      badges: affiliationResult.error
        ? []
        : visibleBadges(
            (affiliationResult.data ?? []) as {
              field: string
              value: string
              is_visible: boolean
            }[],
          ),
    })
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function confirmSignOut() {
    setSigningOut(true)
    setSignOutError("")
    const { error: failure } = await createBrowserClient().auth.signOut()
    setSigningOut(false)
    if (failure) {
      setSignOutError("Não foi possível sair agora. Tente novamente.")
      return
    }
    signOutModal.close()
    router.push("/login")
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-12">
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    )
  }

  if (!identity) {
    return (
      <div
        role="status"
        aria-label="Carregando perfil"
        className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 sm:pt-6"
      >
        <Skeleton className="h-56 w-full rounded-ui-lg" />
        <Skeleton className="h-28 w-full rounded-ui-lg" />
        <Skeleton className="h-40 w-full rounded-ui-lg" />
      </div>
    )
  }

  const cityLabel = current.stateCode
    ? `${current.cityName}, ${current.stateCode}`
    : current.cityName

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-10 sm:pt-6">
      <header className="overflow-hidden rounded-ui-lg bg-ui-surface shadow-ui ring-1 ring-ui-line">
        <div className="h-20 bg-linear-to-br from-ui-brand to-ui-brand-hover sm:h-28" />
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="relative -mt-10 sm:-mt-12">
              <MemberAvatar
                name={identity.displayName}
                src={`/api/avatar/${identity.userId}`}
                size="lg"
                className="h-20 w-20 text-2xl ring-4 ring-ui-surface sm:h-24 sm:w-24"
              />
            </div>
            <div className="mt-3 flex items-center gap-1">
              <Link
                href="/profile/editar"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ui-surface px-3 text-sm font-semibold text-ui-ink shadow-ui ring-1 ring-ui-line transition-colors hover:bg-ui-subtle"
              >
                <Pencil size={16} aria-hidden="true" />
                Editar perfil
              </Link>
              <Link
                href="/configuracoes"
                aria-label="Configurações"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ui-ink-2 transition-colors hover:bg-ui-subtle hover:text-ui-ink"
              >
                <Settings size={20} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <h1 className="mt-3 text-xl leading-tight font-semibold tracking-tight text-ui-ink sm:text-2xl">
            {identity.displayName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-ui-ink-2">
            <MapPin size={14} className="shrink-0 text-ui-brand" aria-hidden="true" />
            {cityLabel}
            {identity.joinedAt ? <span>· {joinedLabel(identity.joinedAt)}</span> : null}
          </p>
          {identity.badges.length > 0 ? (
            <ul aria-label="Vínculo" className="mt-2 flex flex-wrap gap-1.5">
              {identity.badges.map((badge) => (
                <li
                  key={badge}
                  className="rounded-full bg-ui-brand-soft px-2.5 py-0.5 text-xs font-semibold text-ui-brand"
                >
                  {badge}
                </li>
              ))}
            </ul>
          ) : null}
          {identity.bio ? (
            <p className="mt-3 max-w-prose text-sm whitespace-pre-line text-ui-ink">
              {identity.bio}
            </p>
          ) : (
            <Link
              href="/profile/editar"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-ui-brand transition-colors"
            >
              Conte um pouco sobre você
            </Link>
          )}
        </div>
      </header>

      <section
        aria-labelledby="perfil-atalhos"
        className="rounded-ui-lg bg-ui-surface p-4 shadow-ui ring-1 ring-ui-line sm:p-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="perfil-atalhos" className="text-base font-semibold text-ui-ink">
            Seu espaço
          </h2>
          <span className="text-xs text-ui-ink-2">Só você vê</span>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {OWNER_SHORTCUTS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href as Route}
                className="flex min-h-11 items-center gap-2 rounded-ui bg-ui-bg px-3 py-3 text-sm font-medium text-ui-ink ring-1 ring-ui-line transition-colors hover:bg-ui-subtle"
              >
                <Icon size={18} className="shrink-0 text-ui-brand" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
          {hasBusinessPage ? (
            <li>
              <Link
                href={"/negocio" as Route}
                className="flex min-h-11 items-center gap-2 rounded-ui bg-ui-bg px-3 py-3 text-sm font-medium text-ui-ink ring-1 ring-ui-line transition-colors hover:bg-ui-subtle"
              >
                <Tag size={18} className="shrink-0 text-ui-brand" aria-hidden="true" />
                Seu negócio
              </Link>
            </li>
          ) : null}
        </ul>
      </section>

      <section
        aria-labelledby="perfil-comunidades"
        className="rounded-ui-lg bg-ui-surface p-4 shadow-ui ring-1 ring-ui-line sm:p-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="perfil-comunidades" className="text-base font-semibold text-ui-ink">
            Suas comunidades
          </h2>
          <Link
            href="/communities"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-ui-brand transition-colors"
          >
            Ver todas
          </Link>
        </div>
        {communities.length === 0 ? (
          <p className="mt-2 text-sm text-ui-ink-2">
            Você ainda não entrou em uma comunidade.{" "}
            <Link
              href="/communities"
              className="inline-flex min-h-11 items-center font-semibold text-ui-brand transition-colors"
            >
              Encontre a sua
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-ui-line">
            {communities.map((community) => (
              <li key={community.id}>
                <Link
                  href={`/communities/${community.id}` as Route}
                  className="flex min-h-12 items-center gap-3 py-2 transition-colors hover:text-ui-brand"
                >
                  {community.thumbnailUrl ? (
                    // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado
                    <img
                      src={community.thumbnailUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-ui object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui bg-ui-brand-soft text-sm font-semibold text-ui-brand"
                    >
                      {community.name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ui-ink">
                    {community.name}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ui-ink-2" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProfileIndications userId={identity.userId} />

      {/* Cidade continua aqui: /profile#cidade e ?mudar= chegam nela. O
          Suspense é exigido pelo useSearchParams da seção. */}
      <Suspense fallback={null}>
        <CitySection />
      </Suspense>

      <div className="flex justify-center pt-2">
        <Button variant="tertiary" onPress={signOutModal.open} className="min-h-11 text-ui-danger">
          Sair da conta
        </Button>
      </div>

      <Modal state={signOutModal}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Sair da conta?</Modal.Heading>
                <ModalCloseTrigger className="min-h-11 min-w-11" />
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">Você pode entrar de novo quando quiser.</p>
                {signOutError ? (
                  <div className="mt-2">
                    <FeedbackAlert variant="danger" description={signOutError} />
                  </div>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={signOutModal.close}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onPress={() => void confirmSignOut()}
                  isDisabled={signingOut}
                >
                  {signingOut ? "Saindo…" : "Sair"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}
