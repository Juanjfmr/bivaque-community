"use client"

import { Button, Input, ListBox, Select, Switch, TextArea } from "@heroui/react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import {
  BIO_FIELD_LABEL,
  BIO_MAX_LENGTH,
  bioFromRow,
  validateBio,
} from "../../../../lib/profile/bio"
import { callProfileBioRpc } from "../../../../lib/profile/profile-bio-rpcs"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { ErrorState } from "../../../components/bivaque/error-state"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { Skeleton } from "../../../components/bivaque/skeleton"
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
} from "../affiliation"
import { saveAffiliationAction } from "../affiliation-actions"
import AvatarSection from "../avatar-section"
import { saveBioAction } from "../bio-actions"

// Editar perfil: tela própria, aberta pelo botão do perfil (referências do
// Mobbin, 25/09/2026: GoFundMe https://mobbin.com/screens/3c8e6a78-9322-4e94-b891-2c4b55f293be
// e Reddit https://mobbin.com/screens/8980b985-cbfc-4ec3-81bd-5a1732ca4d55 —
// o perfil mostra, a edição fica à parte). Foto, nome, apresentação, Força
// Armada e OM com o "Exibir no perfil" de cada um (D2/D3), e os assuntos de
// interesse. Os campos persistem em `public.profile_affiliations` pelo mesmo
// `saveAffiliationAction` de antes; o erro é recuperável e o texto não se perde.

interface ProfileRow {
  user_id: string
  display_name: string | null
}

export default function EditarPerfilPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
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

    const [profileResult, affiliationResult, bioResult] = await Promise.all([
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
    router.push("/profile")
  }

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Carregando perfil"
        className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6"
      >
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-ui-lg" />
        <Skeleton className="h-64 w-full rounded-ui-lg" />
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

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-4 pb-10 sm:pt-6">
      <Link
        href="/profile"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ui-brand"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Perfil
      </Link>
      <h1 className="text-xl font-semibold tracking-tight text-ui-ink sm:text-2xl">
        Editar perfil
      </h1>

      <AvatarSection />

      <section
        aria-label="Seus dados"
        className="rounded-ui-lg bg-ui-surface p-4 shadow-ui ring-1 ring-ui-line sm:p-6"
      >
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
                {affiliation.omVisible ? VISIBILITY_STATE_LABELS.on : VISIBILITY_STATE_LABELS.off}
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

      <Link
        href="/profile/interests"
        className="flex min-h-11 items-center justify-between gap-3 rounded-ui-lg bg-ui-surface p-4 shadow-ui ring-1 ring-ui-line transition-colors hover:bg-ui-subtle"
      >
        <span>
          <span className="block text-sm font-semibold text-ui-ink">Assuntos de interesse</span>
          <span className="block text-sm text-ui-ink-2">
            Usamos para sugerir grupos da sua cidade.
          </span>
        </span>
        <span aria-hidden="true" className="text-ui-ink-2">
          ›
        </span>
      </Link>
    </div>
  )
}
