"use client"

import { Button, Input, ListBox, Select, Spinner, Switch } from "@heroui/react"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  AFFILIATION_SEMANTICS_NOTE,
  type AffiliationDraft,
  type AffiliationRow,
  ARMED_FORCE_NONE_ID,
  ARMED_FORCES,
  affiliationFromRows,
  armedForceFromKey,
  EMPTY_AFFILIATION,
  normalizeAffiliation,
  OM_MAX_LENGTH,
  VISIBILITY_STATE_LABELS,
  VISIBILITY_TOGGLE_LABEL,
  validateOm,
} from "../../../../app/(shell)/profile/affiliation"
import { saveAffiliationAction } from "../../../../app/(shell)/profile/affiliation-actions"
import {
  getAvatarSignedUrlAction,
  uploadAvatarAction,
} from "../../../../app/(shell)/profile/avatar-actions"
import {
  getUserInterestsDataAction,
  recordUserGroupInterestsAction,
} from "../../../../app/(shell)/profile/interests-actions"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { MemberAvatar } from "../../../components/bivaque/avatar"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { readStoredCity, type StoredCity } from "../city-storage"
import { ContextSteps } from "../components/context-steps"
import styles from "../onboarding.module.css"
import { type InterestOption, loadInterestOptionsAction } from "./perfil-actions"

// Prancha 39 (painel direito) — personalização opcional: foto, nome, interesses
// e as duas declarações autodeclaradas (Força Armada e OM), cada uma com
// "Exibir no perfil" desligado por padrão. "Concluir" grava; "Pular por
// enquanto" conclui a etapa sem inventar afiliação.
//
// O vínculo de localidade é criado aqui, no "Concluir"/"Pular" (R15), porque é
// aqui que o nome é confirmado. Nada de dado do Portal: o nome sugerido chega
// só em memória e é descartado na leitura.
//
// A tela também abre para quem já é membro (a captura visual roda com a conta
// do seed, que já tem localidade): nesse caso ela lê o perfil existente em vez
// de provisionar de novo.

const SUGGESTED_NAME_KEY = "onboarding:suggestedName"

type BootState = "loading" | "ready"

export default function OnboardingProfilePage() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])

  const [boot, setBoot] = useState<BootState>("loading")
  const [storedCity, setStoredCity] = useState<StoredCity | null>(null)
  const [isMember, setIsMember] = useState(false)

  const [name, setName] = useState("")
  const [serverName, setServerName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [interestOptions, setInterestOptions] = useState<InterestOption[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [serverInterests, setServerInterests] = useState<string[]>([])
  const [interestsLoaded, setInterestsLoaded] = useState(false)

  const [affiliation, setAffiliation] = useState<AffiliationDraft>(EMPTY_AFFILIATION)
  const [serverAffiliation, setServerAffiliation] = useState<AffiliationDraft>(EMPTY_AFFILIATION)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login?return=/onboarding/perfil")
        return
      }

      const city = readStoredCity(window.sessionStorage)

      let member = false
      try {
        const res = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const status = (await res.json()) as { localityMember?: boolean }
          member = Boolean(status.localityMember)
        }
      } catch {
        // Falha de rede não decide vínculo; o servidor continua sendo a fonte
        // e o "Concluir" tenta de novo.
      }

      if (!city && !member) {
        router.replace("/onboarding/locality")
        return
      }

      setStoredCity(city)
      setIsMember(member)

      const suggested = window.sessionStorage.getItem(SUGGESTED_NAME_KEY)
      window.sessionStorage.removeItem(SUGGESTED_NAME_KEY)
      const metadata = session.user.user_metadata as Record<string, unknown>
      let resolvedName = ""
      if (typeof suggested === "string" && suggested.trim().length > 0) {
        resolvedName = suggested
      } else {
        for (const key of ["display_name", "name", "full_name"]) {
          const value = metadata[key]
          if (typeof value === "string" && value.trim().length > 0) {
            resolvedName = value
            break
          }
        }
      }

      getAvatarSignedUrlAction()
        .then((url) => setAvatarUrl(url))
        .catch(() => {})

      if (member) {
        const { data: row } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", session.user.id)
          .maybeSingle()
        if (row?.display_name) resolvedName = row.display_name

        const { data: rows } = await supabase
          .from("profile_affiliations")
          .select("field, value, is_visible")
          .eq("user_id", session.user.id)
        const loaded = affiliationFromRows((rows ?? []) as AffiliationRow[])
        setAffiliation(loaded)
        setServerAffiliation(loaded)
      }

      setName(resolvedName)
      setServerName(resolvedName)
      setBoot("ready")
    }
    run()
  }, [router, supabase])

  useEffect(() => {
    if (boot !== "ready") return
    let cancelled = false
    const load = async () => {
      try {
        if (storedCity) {
          const options = await loadInterestOptionsAction(storedCity.id)
          if (cancelled) return
          const recorded = options.filter((option) => option.alreadyInterest).map((o) => o.id)
          setInterestOptions(options)
          setSelectedInterests(recorded)
          setServerInterests(recorded)
        } else if (isMember) {
          const data = await getUserInterestsDataAction()
          if (cancelled || !data) return
          const options = data.available.map((group) => ({
            id: group.id,
            name: group.name,
            alreadyInterest: group.already_interest,
          }))
          const recorded = data.recorded.map((interest) => interest.group_id)
          setInterestOptions(options)
          setSelectedInterests(recorded)
          setServerInterests(recorded)
        }
      } catch {
        if (!cancelled) setInterestOptions([])
      } finally {
        if (!cancelled) setInterestsLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [boot, storedCity, isMember])

  const toggleInterest = (id: string) => {
    setError("")
    setSelectedInterests((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    )
  }

  const handlePhoto = async (formData: FormData) => {
    setUploadingPhoto(true)
    setError("")
    try {
      await uploadAvatarAction(formData)
      const url = await getAvatarSignedUrlAction()
      setAvatarUrl(url)
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível enviar a foto. Tente novamente.",
      )
    } finally {
      setUploadingPhoto(false)
    }
  }

  const finalize = async (skip: boolean) => {
    setError("")
    const trimmed = name.trim()
    if (trimmed.length < 2 || trimmed.length > 80) {
      setError("Informe seu nome, entre 2 e 80 caracteres, para continuar.")
      return
    }
    const omIssue = validateOm(affiliation.om)
    if (omIssue) {
      setError(omIssue)
      return
    }

    setSubmitting(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/login?return=/onboarding/perfil")
        return
      }

      let member = isMember
      if (!member) {
        if (!storedCity) {
          router.replace("/onboarding/locality")
          return
        }
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "provision",
            ibge_code: storedCity.ibgeCode,
            display_name: trimmed,
          }),
        })
        if (!res.ok) {
          if (res.status === 409) {
            setError(
              "Sua entrada já foi concluída em outra aba. Recarregue a página para continuar.",
            )
            return
          }
          setError("Não foi possível concluir sua entrada. Tente novamente.")
          return
        }
        member = true
        setIsMember(true)
      } else if (trimmed !== serverName) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ display_name: trimmed })
          .eq("user_id", session.user.id)
        if (updateError) {
          setError("Não foi possível salvar seu nome. Tente novamente.")
          return
        }
        setServerName(trimmed)
      }

      if (!skip) {
        const normalized = normalizeAffiliation(affiliation)
        if (JSON.stringify(normalized) !== JSON.stringify(serverAffiliation)) {
          await saveAffiliationAction(normalized)
          setServerAffiliation(normalized)
        }

        const sortedSelected = [...selectedInterests].sort()
        const sortedServer = [...serverInterests].sort()
        if (JSON.stringify(sortedSelected) !== JSON.stringify(sortedServer)) {
          const formData = new FormData()
          for (const id of sortedSelected) formData.append("groupIds", id)
          await recordUserGroupInterestsAction(formData)
          setServerInterests(sortedSelected)
        }
      }

      router.replace("/onboarding/welcome")
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível concluir a etapa. Tente novamente.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (boot === "loading") {
    return (
      <ContextSteps current="perfil" titleId="profile-step-heading" title="Deixe com a sua cara.">
        <div className={styles["loadingState"]}>
          <Spinner size="lg" color="accent" />
          <p>Preparando sua personalização...</p>
        </div>
      </ContextSteps>
    )
  }

  return (
    <ContextSteps
      current="perfil"
      titleId="profile-step-heading"
      title="Deixe com a sua cara."
      description="Conte um pouco sobre você para começarmos. Você decide o que compartilhar. Pode alterar depois."
    >
      <div className={styles["contextWidth"]}>
        <div className={styles["contextFormGrid"]}>
          <div className={styles["contextColumn"]}>
            <div className={styles["fieldGroup"]}>
              <p className={styles["fieldLabel"]}>Foto (opcional)</p>
              <div className={styles["photoRow"]}>
                <MemberAvatar name={name || "Membro"} size="lg" src={avatarUrl} />
                <form action={handlePhoto} className={styles["fileControl"]}>
                  <label className={styles["filePicker"]} htmlFor="onboarding-avatar">
                    {avatarUrl ? "Trocar foto" : "Adicionar foto"}
                    <input
                      id="onboarding-avatar"
                      className={styles["visuallyHidden"]}
                      type="file"
                      name="avatar"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) event.currentTarget.form?.requestSubmit()
                      }}
                    />
                  </label>
                  {uploadingPhoto ? <span className={styles["fileName"]}>Enviando...</span> : null}
                </form>
              </div>
            </div>

            <div className={styles["fieldGroup"]}>
              <label className={styles["fieldLabel"]} htmlFor="onboarding-name">
                Nome
              </label>
              <Input
                id="onboarding-name"
                className={styles["control"] ?? ""}
                value={name}
                onChange={(event) => {
                  setName((event.target as HTMLInputElement).value)
                  setError("")
                }}
                maxLength={80}
              />
            </div>

            <div className={styles["fieldGroup"]}>
              <p className={styles["fieldLabel"]}>Interesses (opcional)</p>
              {!interestsLoaded ? (
                <p className={styles["cityEmpty"]}>Carregando interesses...</p>
              ) : interestOptions.length === 0 ? (
                <p className={styles["cityEmpty"]}>
                  Ainda não há grupos nesta cidade para marcar como interesse. Você pode escolher
                  depois, no seu perfil.
                </p>
              ) : (
                <fieldset className={styles["chipRow"]} aria-label="Interesses">
                  {interestOptions.map((option) => {
                    const isSelected = selectedInterests.includes(option.id)
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={styles["chipButton"]}
                        data-state={isSelected ? "selected" : "idle"}
                        aria-pressed={isSelected}
                        onClick={() => toggleInterest(option.id)}
                      >
                        {isSelected ? <Check aria-hidden="true" /> : null}
                        {option.name}
                      </button>
                    )
                  })}
                </fieldset>
              )}
              <p className={styles["fieldSupport"]}>
                Selecione um ou mais temas que te interessam. Eles só sugerem grupos da sua cidade.
              </p>
            </div>
          </div>

          <div className={styles["contextColumn"]}>
            <div className={styles["fieldGroup"]}>
              <p className={styles["fieldLabel"]}>Força Armada (opcional)</p>
              <Select
                aria-label="Força Armada"
                selectedKey={affiliation.armedForce === "" ? null : affiliation.armedForce}
                onSelectionChange={(key) => {
                  if (typeof key === "string") {
                    setAffiliation((previous) => ({
                      ...previous,
                      armedForce: armedForceFromKey(key),
                    }))
                    setError("")
                  }
                }}
              >
                <Select.Trigger>
                  <Select.Value>Selecionar</Select.Value>
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
              <div className={styles["contextVisibilityRow"]}>
                <Switch
                  aria-label="Exibir Força Armada no perfil"
                  isSelected={affiliation.armedForceVisible}
                  onChange={(isSelected) => {
                    setAffiliation((previous) => ({ ...previous, armedForceVisible: isSelected }))
                    setError("")
                  }}
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    {VISIBILITY_TOGGLE_LABEL}
                  </Switch.Content>
                </Switch>
                <span className={styles["fileName"]}>
                  {affiliation.armedForceVisible
                    ? VISIBILITY_STATE_LABELS.on
                    : VISIBILITY_STATE_LABELS.off}
                </span>
              </div>
            </div>

            <div className={styles["fieldGroup"]}>
              <label className={styles["fieldLabel"]} htmlFor="onboarding-om">
                OM (opcional)
              </label>
              <Input
                id="onboarding-om"
                className={styles["control"] ?? ""}
                placeholder="Organização Militar"
                value={affiliation.om}
                onChange={(event) => {
                  setAffiliation((previous) => ({
                    ...previous,
                    om: (event.target as HTMLInputElement).value,
                  }))
                  setError("")
                }}
                maxLength={OM_MAX_LENGTH}
              />
              <div className={styles["contextVisibilityRow"]}>
                <Switch
                  aria-label="Exibir OM no perfil"
                  isSelected={affiliation.omVisible}
                  onChange={(isSelected) => {
                    setAffiliation((previous) => ({ ...previous, omVisible: isSelected }))
                    setError("")
                  }}
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    {VISIBILITY_TOGGLE_LABEL}
                  </Switch.Content>
                </Switch>
                <span className={styles["fileName"]}>
                  {affiliation.omVisible ? VISIBILITY_STATE_LABELS.on : VISIBILITY_STATE_LABELS.off}
                </span>
              </div>
            </div>

            <p role="note" className={styles["fieldSupport"]}>
              {AFFILIATION_SEMANTICS_NOTE}
            </p>
          </div>
        </div>

        {error ? (
          <div className={styles["stack"]}>
            <FeedbackAlert variant="danger" description={error} />
          </div>
        ) : null}

        <div className={styles["contextFooter"]}>
          <Button
            type="button"
            variant="primary"
            className="min-h-11 px-8"
            isDisabled={submitting}
            onPress={() => finalize(false)}
          >
            {submitting ? "Concluindo..." : "Concluir"}
          </Button>
          <button
            type="button"
            className={styles["contextSkip"]}
            disabled={submitting}
            onClick={() => finalize(true)}
          >
            Pular por enquanto
          </button>
        </div>
      </div>
    </ContextSteps>
  )
}
