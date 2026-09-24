"use client"

import {
  Button,
  Input,
  ListBox,
  Modal,
  Select,
  Switch,
  TextArea,
  useOverlayState,
} from "@heroui/react"
import { ChevronRight, ClipboardList, MapPin, Settings, Tag } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { BIO_FIELD_LABEL, BIO_MAX_LENGTH, bioFromRow, validateBio } from "../../../lib/profile/bio"
import { callProfileBioRpc } from "../../../lib/profile/profile-bio-rpcs"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../../components/bivaque/avatar"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { Skeleton } from "../../components/bivaque/skeleton"
import {
  AFFILIATION_SEMANTICS_NOTE,
  type AffiliationDraft,
  type AffiliationRow,
  ARMED_FORCE_NONE_ID,
  ARMED_FORCES,
  affiliationFromRows,
  armedForceFromKey,
  EMPTY_AFFILIATION,
  isAffiliationUntouched,
  normalizeAffiliation,
  OM_MAX_LENGTH,
  VISIBILITY_STATE_LABELS,
  VISIBILITY_TOGGLE_LABEL,
  validateOm,
} from "./affiliation"
import { saveAffiliationAction } from "./affiliation-actions"
import AvatarSection from "./avatar-section"
import { saveBioAction } from "./bio-actions"
import FamilyInviteSection from "./family-invite-section"
import NotificationPreferencesSection from "./notification-preferences-section"

// Prancha 51 (esquerda): o próprio perfil — cabeçalho com identidade real,
// edição com Nome e os dois campos opcionais da D2 (Força Armada, OM), cada
// um com seu "Exibir no perfil" desligado por padrão (D3/correção 6).
// Os campos persistem em `public.profile_affiliations` (uma linha por campo):
// o estado carregado vem da consulta, e "Salvar alterações" grava pelo server
// action `saveAffiliationAction` — upsert com o is_visible do toggle, DELETE
// quando a pessoa limpa o campo. O erro do banco é recuperável na tela e o
// valor digitado não se perde.
// Nada aqui vem de fixture: nome, cidade, atividade e foto vêm de contexto
// ou de consulta real; sem dado, estado vazio honesto.

const PROFILE_SHORTCUTS = [
  { href: "/pedidos", label: "Meus pedidos", hint: "Acompanhe seus pedidos", Icon: ClipboardList },
  { href: "/meus-anuncios", label: "Meus anúncios", hint: "Gerencie seus anúncios", Icon: Tag },
  { href: "#configuracoes", label: "Configurações", hint: "Gerencie sua conta", Icon: Settings },
] as const

// Só uma das duas cópias fica visível por largura; a escondida sai da árvore de acessibilidade.
function ProfileShortcuts({ className }: { className: string }) {
  return (
    <section aria-label="Atalhos do perfil" className={`space-y-3 ${className}`}>
      {PROFILE_SHORTCUTS.map(({ href, label, hint, Icon }) => (
        <a
          key={href}
          href={href}
          className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-[var(--surface)] p-4 transition-colors hover:bg-[var(--surface-sunken)]"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--muted)]" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-muted">{hint}</span>
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        </a>
      ))}
    </section>
  )
}

interface ProfileRow {
  user_id: string
  display_name: string | null
}

interface MembershipRow {
  joined_at: string
  localities: { city_name: string; state_code: string } | null
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

export default function ProfilePage() {
  const router = useRouter()
  const { current } = useLocalityContext()
  const supabase = createBrowserClient()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [membership, setMembership] = useState<MembershipRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [serverBio, setServerBio] = useState("")
  const [bioFeedback, setBioFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [affiliation, setAffiliation] = useState<AffiliationDraft>(EMPTY_AFFILIATION)
  // Último estado confirmado no banco (carregado ou salvo). "Cancelar" volta
  // para aqui, não para um vazio inventado.
  const [serverAffiliation, setServerAffiliation] = useState<AffiliationDraft>(EMPTY_AFFILIATION)
  const [omError, setOmError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [nameFeedback, setNameFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [affiliationFeedback, setAffiliationFeedback] = useState<{
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
      setError("Sua sessão expirou. Entre novamente para continuar.")
      setLoading(false)
      return
    }

    const [profileResult, affiliationResult, bioResult, membershipResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, display_name")
        .eq("user_id", user.id)
        .maybeSingle(),
      // Dono lê as duas linhas sempre, visíveis ou não — é ele quem está
      // editando a própria declaração. A consulta é a fonte do estado.
      supabase
        .from("profile_affiliations")
        .select("field, value, is_visible")
        .eq("user_id", user.id),
      // A bio vem pela RPC SECURITY INVOKER: a RLS de `profiles` decide o que
      // volta, e para o dono a própria linha sempre volta.
      callProfileBioRpc(supabase, "get_profile_bio", { p_user_id: user.id }),
      supabase
        .from("locality_memberships")
        .select("joined_at, localities(city_name, state_code)")
        .eq("user_id", user.id)
        .eq("kind", "current")
        .maybeSingle(),
    ])

    // Falha na leitura da afiliação entra no erro da tela inteira, com a nova
    // tentativa que já existe: renderizar o formulário vazio sobre uma consulta
    // que falhou seria estado falso. A bio é diferente — ela é um campo só, e a
    // falha dela vira erro recuperável no próprio campo, sem derrubar nome,
    // afiliação e o resto do perfil que carregaram bem.
    if (profileResult.error || affiliationResult.error) {
      setError("Não foi possível carregar seu perfil. Tente novamente.")
      setLoading(false)
      return
    }

    if (profileResult.data) {
      const row = profileResult.data as ProfileRow
      const loadedBio = bioResult.error ? "" : bioFromRow(bioResult.data)
      setProfile(row)
      setDisplayName(row.display_name ?? "")
      setBio(loadedBio)
      setServerBio(loadedBio)
      if (bioResult.error) {
        setBioFeedback({
          type: "error",
          message:
            "Não foi possível carregar sua apresentação. Recarregue a página e tente de novo.",
        })
      }
      const loaded = affiliationFromRows((affiliationResult.data ?? []) as AffiliationRow[])
      setAffiliation(loaded)
      setServerAffiliation(loaded)
      if (membershipResult.data) setMembership(membershipResult.data as MembershipRow)
    } else {
      setError("Não foi possível encontrar seu perfil.")
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = async () => {
    const trimmed = displayName.trim()
    setNameFeedback(null)
    setAffiliationFeedback(null)
    setBioFeedback(null)
    setOmError(null)

    if (trimmed.length < 2 || trimmed.length > 80) {
      setNameFeedback({ type: "error", message: "O nome deve ter entre 2 e 80 caracteres." })
      return
    }

    const bioIssue = validateBio(bio)
    if (bioIssue) {
      setBioFeedback({ type: "error", message: bioIssue })
      return
    }

    // OM é texto livre e superfície: tamanho + a varredura de conteúdo
    // proibido que o repositório já aplica a texto de membro. Vazio sempre
    // passa — nenhum campo opcional é exigido para salvar. O servidor
    // revalida do mesmo modo; a checagem daqui é resposta imediata, não
    // concessão.
    const omIssue = validateOm(affiliation.om)
    if (omIssue) {
      setOmError(omIssue)
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("user_id", profile?.user_id ?? "")

    if (updateError) {
      setNameFeedback({ type: "error", message: "Não foi possível salvar. Tente novamente." })
      setSaving(false)
      return
    }

    setProfile((prev) => (prev ? { ...prev, display_name: trimmed } : prev))
    setNameFeedback({ type: "success", message: "Nome atualizado." })

    // A bio é apagável: esvaziar grava NULL (D3). A action revalida no
    // servidor; o erro é recuperável e o texto da pessoa continua no formulário.
    try {
      await saveBioAction(bio)
      setServerBio(bio)
      if (bio.trim().length > 0) {
        setBioFeedback({ type: "success", message: "Apresentação atualizada." })
      }
    } catch (err) {
      setBioFeedback({
        type: "error",
        message:
          err instanceof Error && err.message
            ? err.message
            : "Não foi possível salvar a apresentação. Tente novamente.",
      })
    }

    // D3: limpar o campo é o apagar de verdade (DELETE da linha); desligar o
    // toggle é ocultar (linha preservada com is_visible = false). Normalizado
    // o estado, a action decide qual das duas operações cada campo recebe.
    const normalized = normalizeAffiliation(affiliation)
    setAffiliation(normalized)
    try {
      await saveAffiliationAction(normalized)
      setServerAffiliation(normalized)
      if (!isAffiliationUntouched(normalized)) {
        setAffiliationFeedback({ type: "success", message: "Força Armada e OM atualizados." })
      }
    } catch (err) {
      // Erro recuperável com os valores da pessoa intocados no formulário —
      // o estado do draft não é resetado em caminho nenhum de falha.
      setAffiliationFeedback({
        type: "error",
        message:
          err instanceof Error && err.message
            ? err.message
            : "Não foi possível salvar Força Armada ou OM. Tente novamente.",
      })
    }
    setSaving(false)
  }

  const handleCancel = () => {
    setDisplayName(profile?.display_name ?? "")
    setBio(serverBio)
    setAffiliation(serverAffiliation)
    setOmError(null)
    setNameFeedback(null)
    setBioFeedback(null)
    setAffiliationFeedback(null)
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
    router.push("/login")
  }

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Carregando perfil"
        className="mx-auto w-full max-w-5xl px-4 py-8"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 space-y-6">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-[var(--surface)] p-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-border bg-[var(--surface)] p-6">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-10 w-full max-w-md" />
              <div className="flex gap-3">
                <Skeleton className="h-11 flex-1" />
                <Skeleton className="h-11 w-28" />
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-12">
        <ErrorState message={error} onRetry={loadProfile} />
      </div>
    )
  }

  if (!profile) return null

  const localityName = current.cityName
  const localityState = current.stateCode
  const joinedLabel = membership?.joined_at
    ? `membro desde ${formatJoinedMonthYear(membership.joined_at)}`
    : null

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* <div>, nao <main>: o AppShell ja emite o landmark main da pagina.
            Dois mains e violacao de landmark e quebrou o DS-010, que le
            page.locator("main") e encontrava dois elementos. */}
        <div className="min-w-0 space-y-6">
          <header className="flex flex-col items-center gap-4 rounded-xl border border-border bg-[var(--surface)] p-6 text-center sm:flex-row sm:items-start sm:text-left">
            <MemberAvatar
              name={profile.display_name}
              size="lg"
              src={`/api/avatar/${profile.user_id}`}
              className="h-20 w-20 text-2xl"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">
                {profile.display_name ?? "Membro"}
              </h1>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted sm:justify-start">
                <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
                {localityName}, {localityState}
                {joinedLabel ? (
                  <>
                    {" \u00b7 "}
                    {joinedLabel}
                  </>
                ) : null}
              </p>
              {serverBio.trim().length > 0 ? (
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
                  {serverBio}
                </p>
              ) : null}
            </div>
          </header>

          <ProfileShortcuts className="lg:hidden" />

          <section
            aria-labelledby="edit-profile-heading"
            className="rounded-xl border border-border bg-[var(--surface)] p-6"
          >
            <h2 id="edit-profile-heading" className="text-lg font-semibold tracking-tight">
              Editar perfil
            </h2>

            <div className="mt-4 space-y-6">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="profile-name">
                  Nome
                </label>
                <Input
                  id="profile-name"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName((e.target as HTMLInputElement).value)
                    setNameFeedback(null)
                  }}
                  maxLength={80}
                  className="w-full sm:max-w-md"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="profile-bio">
                  {BIO_FIELD_LABEL}
                </label>
                <TextArea
                  id="profile-bio"
                  value={bio}
                  onChange={(event) => {
                    setBio((event.target as HTMLTextAreaElement).value)
                    setBioFeedback(null)
                  }}
                  maxLength={BIO_MAX_LENGTH}
                  className="w-full sm:max-w-lg"
                />
                <p className="mt-1 text-right text-sm text-muted">
                  {bio.length}/{BIO_MAX_LENGTH}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 sm:max-w-xs sm:flex-1">
                  <p className="mb-1 text-sm font-medium" id="armed-force-label">
                    Força Armada (opcional)
                  </p>
                  <Select
                    aria-labelledby="armed-force-label"
                    selectedKey={affiliation.armedForce === "" ? null : affiliation.armedForce}
                    onSelectionChange={(key) => {
                      if (typeof key === "string") {
                        setAffiliation((prev) => ({
                          ...prev,
                          armedForce: armedForceFromKey(key),
                        }))
                        setAffiliationFeedback(null)
                      }
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value>Selecione</Select.Value>
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item key={ARMED_FORCE_NONE_ID} id={ARMED_FORCE_NONE_ID}>
                          Nenhuma
                        </ListBox.Item>
                        {ARMED_FORCES.map((force) => (
                          <ListBox.Item key={force.id} id={force.id}>
                            {force.label}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
                <div className="flex items-center gap-3 [&_input]:min-h-11 [&_input]:min-w-11 [&_input]:opacity-0 [&_input]:transition-opacity sm:pb-2">
                  <Switch
                    aria-label="Exibir Força Armada no perfil"
                    isSelected={affiliation.armedForceVisible}
                    onChange={(isSelected) => {
                      setAffiliation((prev) => ({ ...prev, armedForceVisible: isSelected }))
                      setAffiliationFeedback(null)
                    }}
                  >
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      {VISIBILITY_TOGGLE_LABEL}
                    </Switch.Content>
                  </Switch>
                  <span className="text-sm text-muted">
                    {affiliation.armedForceVisible
                      ? VISIBILITY_STATE_LABELS.on
                      : VISIBILITY_STATE_LABELS.off}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 sm:max-w-xs sm:flex-1">
                  <label className="mb-1 block text-sm font-medium" htmlFor="profile-om">
                    OM (opcional)
                  </label>
                  <Input
                    id="profile-om"
                    placeholder="Digite sua OM"
                    value={affiliation.om}
                    onChange={(e) => {
                      setAffiliation((prev) => ({
                        ...prev,
                        om: (e.target as HTMLInputElement).value,
                      }))
                      setOmError(null)
                    }}
                    maxLength={OM_MAX_LENGTH}
                    aria-invalid={Boolean(omError)}
                    aria-describedby={omError ? "om-error" : undefined}
                  />
                  <p className="mt-1 text-right text-sm text-muted">
                    {affiliation.om.length}/{OM_MAX_LENGTH}
                  </p>
                </div>
                <div className="flex items-center gap-3 [&_input]:min-h-11 [&_input]:min-w-11 [&_input]:opacity-0 [&_input]:transition-opacity sm:pb-8">
                  <Switch
                    aria-label="Exibir OM no perfil"
                    isSelected={affiliation.omVisible}
                    onChange={(isSelected) => {
                      setAffiliation((prev) => ({ ...prev, omVisible: isSelected }))
                      setAffiliationFeedback(null)
                    }}
                  >
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      {VISIBILITY_TOGGLE_LABEL}
                    </Switch.Content>
                  </Switch>
                  <span className="text-sm text-muted">
                    {affiliation.omVisible
                      ? VISIBILITY_STATE_LABELS.on
                      : VISIBILITY_STATE_LABELS.off}
                  </span>
                </div>
              </div>

              {omError && (
                <div id="om-error">
                  <FeedbackAlert variant="danger" description={omError} />
                </div>
              )}

              <p role="note" className="text-sm leading-relaxed text-muted">
                {AFFILIATION_SEMANTICS_NOTE}
              </p>

              {nameFeedback && (
                <FeedbackAlert
                  variant={nameFeedback.type === "success" ? "success" : "danger"}
                  description={nameFeedback.message}
                />
              )}
              {bioFeedback && (
                <FeedbackAlert
                  variant={bioFeedback.type === "success" ? "success" : "danger"}
                  description={bioFeedback.message}
                />
              )}
              {affiliationFeedback && (
                <FeedbackAlert
                  variant={affiliationFeedback.type === "success" ? "success" : "danger"}
                  description={affiliationFeedback.message}
                />
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="primary"
                  onPress={handleSave}
                  isDisabled={saving}
                  className="min-h-11 flex-1"
                >
                  {saving ? "Salvando…" : "Salvar alterações"}
                </Button>
                <Button variant="tertiary" onPress={handleCancel} className="min-h-11 sm:px-8">
                  Cancelar
                </Button>
              </div>
            </div>
          </section>

          <section
            id="configuracoes"
            aria-labelledby="settings-heading"
            className="scroll-mt-6 space-y-3"
          >
            <h2 id="settings-heading" className="text-lg font-semibold tracking-tight">
              Configurações
            </h2>
            <AvatarSection />
            <NotificationPreferencesSection />
            <FamilyInviteSection />
            <div className="rounded-xl border border-border bg-[var(--surface)] p-4">
              <p className="text-sm font-medium">Assuntos de interesse</p>
              <p className="mt-1 text-xs text-muted">
                Sugerem grupos da sua cidade. Usados só para isso.
              </p>
              <div className="mt-3">
                <a
                  href="/profile/interests"
                  className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--accent)] transition-colors hover:underline"
                >
                  Escolher assuntos de interesse
                </a>
              </div>
            </div>
            <Button
              type="button"
              variant="danger"
              onPress={signOutModal.open}
              className="w-full min-h-11"
            >
              Sair da conta
            </Button>
          </section>
        </div>

        {/* Rail da prancha 51. "Meus pedidos" entra porque o DESIGN_SYSTEM 7.1
            põe /pedidos no Perfil e nada mais levava até lá (NAV-PEDIDOS-ORFA).
            "Meu negócio" não entra: o painel do prestador é outra conta, não o
            perfil do membro. Abaixo de lg a mesma lista vem logo depois do
            cartão de identidade — esconder deixava o celular sem a entrada. */}
        <div className="hidden lg:block">
          <ProfileShortcuts className="lg:sticky lg:top-6" />
        </div>
      </div>

      <Modal state={signOutModal}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Sair da conta</Modal.Heading>
                <Modal.CloseTrigger className="min-h-11 min-w-11" />
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
