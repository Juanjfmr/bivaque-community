"use client"

// Compositor da prancha 45 com os estados da 60 (contadores 120/1000, faixa
// "Sem conexão", "Salvar rascunho"). Grava em `posts` — a única superfície onde
// foto opcional e audiência por comunidade têm coluna real hoje. O modal do
// feed (RECON-014) continua o caminho rápido; esta página é a tela da prancha.

import { detectCep, detectCpf } from "@bivaque/domain"
import { Button, Input, Spinner, TextArea } from "@heroui/react"
import { LinkIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { classifyPublishError } from "../../../../lib/composer/publish-error"
import { useLocalityContext } from "../../../../lib/locality-context"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { MemberAvatar } from "../../../components/bivaque/avatar"
import {
  type AudienceDestination,
  AudiencePicker,
  audienceNoticeText,
  cityDestination,
  usePostAudience,
} from "../../../components/bivaque/feed-post-audience"
import {
  clearPostDraft,
  hasDraftContent,
  loadPostDraft,
  type PostDraftFields,
  savePostDraftFields,
} from "../../../components/bivaque/feed-post-draft"
import { DraftDiscardDialog, DraftNotices } from "../../../components/bivaque/feed-post-draft-ui"
import { PhotoField } from "../../../components/bivaque/feed-post-photo"
import { PostPiiWarning } from "../../../components/bivaque/feed-post-pii-warning"
import { PostPreview } from "../../../components/bivaque/feed-post-preview"
import {
  type AudienceKey,
  CITY_AUDIENCE_KEY,
  communityAudienceKey,
  composePostContent,
  parseAudienceKey,
  useCurrentUser,
} from "../../../components/bivaque/feed-post-shared"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { showToast } from "../../../components/bivaque/toast"

const QUESTION_MAX = 120
const BODY_MAX = 1000
const AUTOSAVE_DELAY_MS = 400

export function QuestionComposer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { current: locality } = useLocalityContext()
  const supabase = createBrowserClient()
  const initialDraft = useRef(loadPostDraft())

  const [question, setQuestion] = useState(initialDraft.current?.content ?? "")
  const [details, setDetails] = useState(initialDraft.current?.details ?? "")
  const [photoPath, setPhotoPath] = useState(initialDraft.current?.photoPath ?? "")
  const [audienceKey, setAudienceKey] = useState<AudienceKey>(() => {
    const communityId = searchParams.get("comunidade")
    return communityId ? communityAudienceKey(communityId) : CITY_AUDIENCE_KEY
  })
  const [draftRestored, setDraftRestored] = useState(hasDraftContent(initialDraft.current))
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [piiWarning, setPiiWarning] = useState(false)
  const [offline, setOffline] = useState(() =>
    typeof window === "undefined" ? false : !window.navigator.onLine,
  )
  const [draftSavedFeedback, setDraftSavedFeedback] = useState(false)

  const localityId = locality.id
  const audience = usePostAudience(localityId)
  const currentUser = useCurrentUser()
  const city = cityDestination(locality?.cityName ?? "")
  const destinations: AudienceDestination[] = [city, ...audience.communities, ...audience.groups]
  const selected = destinations.find((d) => d.key === audienceKey) ?? city
  const selectedKind = parseAudienceKey(audienceKey)

  useEffect(() => {
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  const persistDraft = useCallback((fields: PostDraftFields) => {
    if (hasDraftContent({ ...fields, savedAt: 0 })) {
      setStorageUnavailable(!savePostDraftFields(fields))
    } else {
      clearPostDraft()
      setStorageUnavailable(false)
    }
  }, [])

  const draftFields = useMemo<PostDraftFields>(
    () => ({
      postType: "text",
      content: question,
      details,
      linkUrl: "",
      pollOptions: [],
      photoPath,
    }),
    [question, details, photoPath],
  )

  useEffect(() => {
    const timer = setTimeout(() => persistDraft(draftFields), AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draftFields, persistDraft])

  const latestFields = useRef(draftFields)
  latestFields.current = draftFields
  useEffect(() => () => persistDraft(latestFields.current), [persistDraft])

  const [discardOpen, setDiscardOpen] = useState(false)

  const composed = composePostContent(question, details)
  const placeName =
    selectedKind.kind === "city"
      ? (locality?.cityName ?? null)
      : selected.kind !== "city"
        ? selected.name
        : null

  const handlePublish = useCallback(async () => {
    setError("")
    setPhotoError("")
    if (!question.trim()) {
      setError("A publicação precisa de texto.")
      return
    }
    if (!piiWarning && (detectCpf(composed) || detectCep(composed))) {
      setPiiWarning(true)
      return
    }
    setSubmitting(true)

    const kind = parseAudienceKey(audienceKey)
    const photo = photoPath.trim()
    const insertData = {
      locality_id: localityId,
      post_type: photo ? "photo" : "text",
      content: composed,
      community_id: kind.kind === "community" ? kind.id : null,
      group_id: kind.kind === "group" ? kind.id : null,
      ...(photo ? { photo_path: photo } : {}),
    } as Database["public"]["Tables"]["posts"]["Insert"]

    const { error: insertError } = await supabase.from("posts").insert(insertData)
    if (insertError) {
      const view = classifyPublishError(insertError)
      setError(view.message)
      setSubmitting(false)
      return
    }

    clearPostDraft()
    setDraftRestored(false)
    showToast({
      title: "Publicado.",
      description: placeName
        ? `Visível para os aprovados em ${placeName}.`
        : "A publicação está no ar.",
      variant: "success",
    })
    router.push("/inicio")
    router.refresh()
  }, [
    question,
    composed,
    piiWarning,
    audienceKey,
    photoPath,
    localityId,
    supabase,
    placeName,
    router,
  ])

  const handleSaveDraft = useCallback(() => {
    const saved = savePostDraftFields(draftFields)
    setStorageUnavailable(!saved)
    if (saved) {
      setDraftSavedFeedback(true)
      setTimeout(() => setDraftSavedFeedback(false), 4000)
    }
  }, [draftFields])

  const discardDraft = useCallback(() => {
    clearPostDraft()
    setQuestion("")
    setDetails("")
    setPhotoPath("")
    setDraftRestored(false)
    setStorageUnavailable(false)
    setDiscardOpen(false)
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[var(--semantic-selected)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-5 w-5"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">Nova pergunta</h1>
      </div>

      <div className="flex items-center gap-2">
        <MemberAvatar name={currentUser.user?.displayName ?? "?"} className="h-8 w-8 text-xs" />
        <span className="text-sm font-medium">{currentUser.user?.displayName ?? "Você"}</span>
      </div>

      {offline && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--semantic-warning)] bg-[var(--semantic-warning-soft)] px-4 py-3"
        >
          <LinkIcon
            className="h-5 w-5 shrink-0 text-[var(--semantic-warning)]"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Sem conexão</p>
            <p className="text-xs text-muted">Tente publicar quando a conexão voltar.</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            isDisabled
            className="min-h-11"
            aria-label="Tentar novamente (aguardando conexão)"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      <DraftNotices
        draftRestored={draftRestored}
        storageUnavailable={storageUnavailable}
        onRequestDiscard={() => setDiscardOpen(true)}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <div>
            <AudiencePicker
              value={selected.key}
              onChange={setAudienceKey}
              destinations={destinations}
              loading={audience.loading}
              error={audience.error}
              onRetry={audience.retry}
            />
            <p aria-live="polite" className="mt-2 text-xs text-muted" data-testid="audience-notice">
              {audience.loading
                ? "Carregando suas comunidades e grupos."
                : audienceNoticeText(selectedKind.kind, locality.cityName)}
            </p>
          </div>

          <div>
            <label htmlFor="nova-pergunta" className="mb-1 block text-sm font-medium">
              Qual é a sua pergunta? <span aria-hidden="true">*</span>
              <span className="sr-only"> (obrigatório)</span>
            </label>
            <Input
              id="nova-pergunta"
              required
              aria-required="true"
              maxLength={QUESTION_MAX}
              placeholder="Ex.: Indicação de escola na Asa Norte?"
              value={question}
              onChange={(e) => {
                setQuestion((e.target as HTMLInputElement).value)
                setError("")
                setPiiWarning(false)
              }}
            />
            <p className="mt-1 text-right text-xs text-muted" aria-live="polite">
              {question.length}/{QUESTION_MAX}
            </p>
          </div>

          <div>
            <label htmlFor="nova-duvida" className="mb-1 block text-sm font-medium">
              Conte mais sobre sua dúvida (opcional)
            </label>
            <TextArea
              id="nova-duvida"
              maxLength={BODY_MAX}
              rows={4}
              value={details}
              onChange={(e) => setDetails((e.target as HTMLTextAreaElement).value)}
            />
            <p className="mt-1 text-right text-xs text-muted" aria-live="polite">
              {details.length}/{BODY_MAX}
            </p>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">Adicionar foto (opcional)</p>
            <PhotoField value={photoPath} onChange={setPhotoPath} onError={setPhotoError} />
            {photoError ? (
              <p aria-live="polite" className="mt-1 text-xs text-[var(--semantic-danger)]">
                {photoError}
              </p>
            ) : null}
          </div>

          {error ? (
            <div data-testid="publish-error">
              <FeedbackAlert variant="danger" description={error} />
            </div>
          ) : null}
          {piiWarning ? (
            <PostPiiWarning onConfirm={handlePublish} onCancel={() => setPiiWarning(false)} />
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button variant="secondary" onPress={handleSaveDraft} isDisabled={submitting}>
              Salvar rascunho
            </Button>
            <Button
              onPress={handlePublish}
              isDisabled={submitting || offline || !question.trim()}
              variant="primary"
              aria-busy={submitting}
              data-testid="publish-submit"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" aria-label="Publicando" />
                  Publicando…
                </>
              ) : (
                "Publicar"
              )}
            </Button>
          </div>
          <p
            aria-live="polite"
            className="text-right text-xs text-[var(--semantic-action-primary)]"
          >
            {placeName
              ? `Visível para membros do Bivaque em ${placeName}.`
              : "Escolha quem pode ver."}
          </p>
          {draftSavedFeedback && (
            <p aria-live="polite" className="text-right text-xs text-muted">
              Rascunho salvo neste navegador.
            </p>
          )}
        </div>

        <PostPreview
          destination={selected}
          destinationLoading={audience.loading}
          authorName={currentUser.user?.displayName ?? null}
          authorLoading={currentUser.loading}
          content={composed}
          placeName={placeName}
        />
      </div>

      <DraftDiscardDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onDiscard={discardDraft}
      />
    </div>
  )
}
