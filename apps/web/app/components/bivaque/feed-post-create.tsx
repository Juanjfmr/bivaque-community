"use client"

// Criação de publicação (prancha 45, painel esquerdo). Composição: destino
// real ("Quem pode ver?"), texto, detalhes opcionais, foto opcional e a
// prévia "Como sua publicação será vista" repetindo o público escolhido.
//
// Rascunho (RECON-014): o texto fica no armazenamento do PRÓPRIO navegador
// (feed-post-draft), nunca no servidor; quem foi interrompido recupera o que
// escreveu ao reabrir; descartar é explícito e confirmado — nada apaga em
// silêncio. Publicar continua sendo decisão da pessoa: nenhum rascunho vira
// publicação sozinho.

import { detectCep, detectCpf } from "@bivaque/domain"
import { Button, Input, Modal, Spinner, TextArea, useOverlayState } from "@heroui/react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { classifyPublishError } from "../../../lib/composer/publish-error"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "./avatar"
import { ConnectionLostState } from "./error-state"
import {
  type AudienceDestination,
  AudiencePicker,
  audienceNoticeText,
  cityDestination,
  DestinationIcon,
  usePostAudience,
} from "./feed-post-audience"
import {
  clearPostDraft,
  hasDraftContent,
  loadPostAudience,
  loadPostDraft,
  type PostDraftFields,
  savePostAudience,
  savePostDraftFields,
} from "./feed-post-draft"
import { DraftDiscardDialog, DraftNotices } from "./feed-post-draft-ui"
import { PhotoField } from "./feed-post-photo"
import { PostPiiWarning } from "./feed-post-pii-warning"
import { PollEditor } from "./feed-post-poll-editor"
import { PostPreview } from "./feed-post-preview"
import {
  type AudienceKey,
  CITY_AUDIENCE_KEY,
  composePostContent,
  POST_TYPE_LABELS,
  POST_TYPE_ORDER,
  parseAudienceKey,
  useCurrentUser,
} from "./feed-post-shared"
import { FeedbackAlert } from "./feedback-alert"
import { showToast } from "./toast"

interface CreatePostModalProps {
  localityId: string
  defaultPostType?: string | undefined
  defaultCommunityId?: string | undefined
  onCreated: () => void
  onClose: () => void
  /**
   * The same composer contract can be mounted on the addressable
   * /publicacoes/nova surface. The modal remains the compact in-feed entry
   * point until every caller has moved to the route.
   */
  pageMode?: boolean
}

const AUTOSAVE_DELAY_MS = 400
const QUESTION_TITLE_MAX = 120
const QUESTION_BODY_MAX = 1000

export function CreatePostModal({
  localityId,
  defaultPostType,
  defaultCommunityId,
  onCreated,
  onClose,
  pageMode = false,
}: CreatePostModalProps) {
  const modal = useOverlayState({ defaultOpen: true, onOpenChange: (open) => !open && onClose() })
  const { current: locality } = useLocalityContext()
  const currentUser = useCurrentUser()
  const ownerId = currentUser.user?.id ?? null
  const draftScopeKey = ownerId ? `${ownerId}:${localityId}` : null
  const loadedDraftScopeRef = useRef<string | null>(null)
  const suppressDraftFlushRef = useRef(false)
  const scopeIsCurrent = loadedDraftScopeRef.current === draftScopeKey
  const [draftReady, setDraftReady] = useState(false)
  const [postType, setPostType] = useState(defaultPostType ?? "text")
  const [content, setContent] = useState("")
  const [details, setDetails] = useState("")
  const [photoPath, setPhotoPath] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  // O `kind` do classificador decide a SUPERFÍCIE do erro: falha de transporte
  // (offline, DNS, timeout) é o estado "Sem conexão" da prancha 60, com retomada
  // real; rejeição do servidor continua no alerta genérico (anti-enumeração).
  const [error, setError] = useState("")
  const [errorKind, setErrorKind] = useState<"network" | "server" | null>(null)
  const [photoError, setPhotoError] = useState("")
  const [piiWarning, setPiiWarning] = useState(false)
  const [audienceKey, setAudienceKey] = useState<AudienceKey>(
    defaultCommunityId ? `community:${defaultCommunityId}` : CITY_AUDIENCE_KEY,
  )
  const [draftRestored, setDraftRestored] = useState(false)
  // Dito quando a audiência cai da vila para a cidade sem a pessoa ter pedido.
  const [audienceFallback, setAudienceFallback] = useState("")
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const dialogContentRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient()

  const audience = usePostAudience(localityId)
  const city = cityDestination(locality?.cityName ?? "")
  const destinations: AudienceDestination[] = [city, ...audience.communities, ...audience.groups]
  const availableAudienceKeys = useMemo(
    () =>
      new Set([
        CITY_AUDIENCE_KEY,
        ...audience.communities.map((d) => d.key),
        ...audience.groups.map((d) => d.key),
      ]),
    [audience.communities, audience.groups],
  )
  // `selected` existe para EXIBIR o destino (o nome no seletor). Ele cai para a
  // cidade quando a chave ainda não está na lista — e a lista chega depois,
  // porque é uma consulta.
  const selected = destinations.find((d) => d.key === audienceKey) ?? city
  // O DESTINO REAL vem da chave escolhida, nunca dessa degradação. Derivar o
  // tipo de `selected` fazia quem abrisse o compositor e publicasse antes da
  // lista carregar mandar o post para a CIDADE INTEIRA em vez da vila — com o
  // aviso concordando com o erro. É a corrida de alcance que a onda E chamou
  // de vazamento por desatenção, e ela entrou na separação da RECON-014: a
  // versão anterior montava o insert a partir do communityId direto, sem
  // passar por uma lista que pode estar vazia.
  const selectedKind = parseAudienceKey(audienceKey)

  useEffect(() => {
    suppressDraftFlushRef.current = false
    if (currentUser.loading) {
      loadedDraftScopeRef.current = null
      setDraftReady(false)
      return
    }

    // Uma troca de conta/locality nunca pode herdar os campos da tela anterior.
    // O unload flush e o autosave ficam presos ao guard de escopo abaixo.
    loadedDraftScopeRef.current = null
    setDraftReady(false)
    setPostType(defaultPostType ?? "text")
    setContent("")
    setDetails("")
    setPhotoPath("")
    setLinkUrl("")
    setPollOptions([])
    setAudienceKey(defaultCommunityId ? `community:${defaultCommunityId}` : CITY_AUDIENCE_KEY)
    setDraftRestored(false)
    setAudienceFallback("")
    setStorageUnavailable(false)

    if (!ownerId) {
      setDraftReady(true)
      return
    }

    const draft = loadPostDraft(ownerId, localityId)
    if (draft) {
      setPostType(draft.postType)
      setContent(draft.content)
      setDetails(draft.details)
      setPhotoPath(draft.photoPath)
      setLinkUrl(draft.linkUrl)
      setPollOptions(draft.pollOptions)
      setAudienceKey(draft.audienceKey)
      setDraftRestored(hasDraftContent(draft))
    } else {
      const preferredAudience = defaultCommunityId
        ? `community:${defaultCommunityId}`
        : loadPostAudience(ownerId, localityId)
      if (preferredAudience) setAudienceKey(preferredAudience)
    }

    loadedDraftScopeRef.current = draftScopeKey
    setDraftReady(true)
  }, [currentUser.loading, draftScopeKey, ownerId, localityId, defaultCommunityId, defaultPostType])

  useEffect(() => {
    if (!modal.isOpen) {
      onClose()
    }
  }, [modal.isOpen, onClose])

  useLayoutEffect(() => {
    if (pageMode || !modal.isOpen) return
    if (!dialogContentRef.current) return
    const focusable = dialogContentRef.current.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable && document.activeElement !== focusable) {
      focusable.focus()
    }
  }, [modal.isOpen, pageMode])

  // A audiência salva é apenas uma preferência local. Depois que a consulta
  // real termina, qualquer chave que não esteja mais autorizada (revogação,
  // mudança de cidade) volta para a cidade com aviso explícito.
  // O servidor deve autorizar todo destino antes de publicar.
  useEffect(() => {
    if (audience.loading || audience.error || !draftReady || !scopeIsCurrent) return
    if (!availableAudienceKeys.has(audienceKey)) {
      setAudienceKey(CITY_AUDIENCE_KEY)
      setAudienceFallback(
        "Esse destino não está mais disponível. A publicação foi ajustada para toda a cidade — confira antes de publicar.",
      )
    }
  }, [
    audience.loading,
    audience.error,
    audienceKey,
    availableAudienceKeys,
    draftReady,
    scopeIsCurrent,
  ])

  // Autosave do rascunho — melhor esforço, nunca quebra a tela. Campos vazios
  // não removem nada: apagar o rascunho é uma ação explícita, confirmada pelo
  // diálogo. Assim, uma edição que chega a zero não apaga o texto anterior.
  const persistDraft = useCallback(
    (fields: PostDraftFields): boolean => {
      if (!draftReady || !ownerId || loadedDraftScopeRef.current !== draftScopeKey) return false
      const scope = { ownerId, localityId, audienceKey }
      if (!hasDraftContent({ ...scope, ...fields, savedAt: 0 })) return false
      const saved = savePostDraftFields(fields, scope)
      setStorageUnavailable(!saved)
      return saved
    },
    [audienceKey, draftReady, draftScopeKey, localityId, ownerId],
  )

  useEffect(() => {
    if (draftReady && ownerId && scopeIsCurrent) {
      savePostAudience(ownerId, localityId, audienceKey)
    }
  }, [audienceKey, draftReady, localityId, ownerId, scopeIsCurrent])

  const draftFields = useMemo<PostDraftFields>(
    () => ({ postType, content, details, linkUrl, pollOptions, photoPath }),
    [postType, content, details, linkUrl, pollOptions, photoPath],
  )

  useEffect(() => {
    const timer = setTimeout(() => persistDraft(draftFields), AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draftFields, persistDraft])

  // O debounce acima é cancelado quando o modal fecha antes do timer — sem
  // este flush, a última coisa digitada antes de fechar se perderia. O cleanup
  // roda no unmount e também na troca de escopo/audiência; a closure executa
  // com o contexto anterior, antes de o próximo efeito zerar os campos.
  const latestFields = useRef(draftFields)
  latestFields.current = draftFields
  useEffect(() => {
    return () => {
      if (suppressDraftFlushRef.current) return
      persistDraft(latestFields.current)
    }
  }, [persistDraft])

  const resetForm = useCallback(() => {
    setPostType("text")
    setContent("")
    setDetails("")
    setPhotoPath("")
    setLinkUrl("")
    setPollOptions([])
    setError("")
    setErrorKind(null)
    setPhotoError("")
    setPiiWarning(false)
    setDraftRestored(false)
    // PRIVACY (Step 3 da onda E): depois de publicar na vila, o seletor
    // CONTINUA na vila. Zerar para cidade fazia o segundo post da sessão sair
    // para a cidade inteira sem a pessoa ter escolhido — exatamente o
    // vazamento por desatenção que o plano mandou evitar.
    setAudienceKey((prev) =>
      prev === CITY_AUDIENCE_KEY || audience.error ? CITY_AUDIENCE_KEY : prev,
    )
  }, [audience.error])

  const handleSubmit = useCallback(async () => {
    if (!draftReady || !scopeIsCurrent || audience.loading || audience.error) return
    setError("")
    setErrorKind(null)
    setPhotoError("")
    const effectivePostType =
      pageMode && postType === "text" && photoPath.trim() ? "photo" : postType

    if (!content.trim()) {
      setError("A publicação precisa de texto.")
      return
    }
    if (pageMode && content.length > QUESTION_TITLE_MAX) {
      setError(`A pergunta pode ter no máximo ${QUESTION_TITLE_MAX} caracteres.`)
      return
    }
    if (pageMode && details.length > QUESTION_BODY_MAX) {
      setError(`O corpo pode ter no máximo ${QUESTION_BODY_MAX} caracteres.`)
      return
    }
    if (effectivePostType === "photo" && !photoPath.trim()) {
      setError("Foto requer uma imagem anexada")
      return
    }
    if (effectivePostType === "link" && !linkUrl.trim()) {
      setError("Link requer uma URL")
      return
    }
    if (effectivePostType === "poll" && pollOptions.length < 2) {
      setError("Enquete requer pelo menos 2 opções")
      return
    }

    const composed = composePostContent(content, details)
    if (!piiWarning && (detectCpf(composed) || detectCep(composed))) {
      setPiiWarning(true)
      return
    }

    setSubmitting(true)

    // Mesma fonte do aviso: a chave que a pessoa escolheu, não o destino
    // resolvido para exibição.
    const kind = parseAudienceKey(audienceKey)
    const insertData = {
      locality_id: localityId,
      post_type: effectivePostType,
      content: composed,
      community_id: kind.kind === "community" ? kind.id : null,
      group_id: kind.kind === "group" ? kind.id : null,
    } as const

    const extras: { photo_path?: string; link_url?: string; poll_options?: string[] } = {}
    if (effectivePostType === "photo" && photoPath.trim()) {
      extras.photo_path = photoPath.trim()
    }
    if (postType === "link" && linkUrl.trim()) {
      extras.link_url = linkUrl.trim()
    }
    if (postType === "poll" && pollOptions.length >= 2) {
      extras.poll_options = pollOptions
    }

    const { error: insertError } = await supabase
      .from("posts")
      .insert({ ...insertData, ...extras } as Database["public"]["Tables"]["posts"]["Insert"])

    if (insertError) {
      // Anti-enumeração: 42501 (RLS), 23505 (unique) e qualquer outra
      // resposta do PostgREST compartilham a mesma mensagem. O `kind`
      // discrimina o que fazer (mostrar feedback inline vs. pedir para
      // checar a conexão); o texto nunca revela o motivo do servidor.
      const view = classifyPublishError(insertError)
      setErrorKind(view.kind)
      setError(view.message)
      // `preserveDraft` é sobre o conteúdo (não limpamos; o rascunho no
      // navegador também sobrevive); o botão volta a ficar clicável para a
      // pessoa corrigir e tentar de novo — manter `submitting` trancaria o
      // caminho de recuperação.
      setSubmitting(false)
      return
    }

    // Publicado: o rascunho cumpriu o papel dele e sai do navegador só agora,
    // pela ação concluída da pessoa — nunca antes, nunca sozinho. A guarda
    // impede que o cleanup do unmount recrie o texto já publicado.
    suppressDraftFlushRef.current = true
    clearPostDraft(ownerId, localityId)
    resetForm()
    showToast(
      kind.kind === "community"
        ? {
            title: "Publicado na sua vila",
            description: "Os aprovados desta vila podem ler agora.",
            variant: "success",
          }
        : kind.kind === "group"
          ? {
              title: "Publicado no seu grupo",
              description: "Os aprovados deste grupo podem ler agora.",
              variant: "success",
            }
          : {
              title: "Publicado para toda a cidade",
              description: `Os membros verificados de ${locality?.cityName ?? "sua cidade"} podem ler agora.`,
              variant: "success",
            },
    )
    onCreated()
    modal.close()
    setSubmitting(false)
  }, [
    content,
    details,
    draftReady,
    scopeIsCurrent,
    audience.loading,
    audience.error,
    postType,
    photoPath,
    linkUrl,
    pollOptions,
    piiWarning,
    audienceKey,
    ownerId,
    localityId,
    locality?.cityName,
    supabase,
    resetForm,
    onCreated,
    modal,
    pageMode,
  ])

  const handleSaveDraft = useCallback(() => {
    const saved = persistDraft(draftFields)
    showToast(
      saved
        ? {
            title: "Rascunho salvo",
            description: "Você pode voltar e continuar depois.",
            variant: "success",
          }
        : {
            title: "Não foi possível salvar o rascunho",
            description: "O navegador recusou o armazenamento local. Seu texto continua aqui.",
            variant: "danger",
          },
    )
  }, [draftFields, persistDraft])

  const discardConfirm = useOverlayState()

  const discardDraft = useCallback(() => {
    clearPostDraft(ownerId, localityId)
    setContent("")
    setDetails("")
    setLinkUrl("")
    setPollOptions([])
    setPhotoPath("")
    setDraftRestored(false)
    setStorageUnavailable(false)
    discardConfirm.close()
  }, [discardConfirm, ownerId, localityId])

  const placeName =
    selectedKind.kind === "city"
      ? (locality?.cityName ?? null)
      : selected.kind !== "city"
        ? selected.name
        : null

  const audienceNotice = audienceNoticeText(selectedKind.kind, locality?.cityName ?? null)
  const offlinePage = pageMode && errorKind === "network"

  const composerContent = (
    <div
      className={
        pageMode
          ? offlinePage
            ? "mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,42rem)] justify-start gap-8 px-6 py-8"
            : "mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,38rem)_20rem]"
          : "gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]"
      }
    >
      <div
        ref={dialogContentRef}
        data-composer-form="true"
        data-draft-ready={draftReady ? "true" : "false"}
      >
        {offlinePage ? (
          <>
            <div className="mb-6 flex justify-end">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 text-sm font-medium">
                <DestinationIcon kind={selected.kind} />
                {selected.name}
                <span aria-hidden="true">⌄</span>
              </span>
            </div>
            <div className="mb-6">
              <ConnectionLostState
                description={offlinePage ? "Tente publicar quando a conexão voltar." : error}
                onRetry={() => {
                  void handleSubmit()
                }}
              />
            </div>
          </>
        ) : null}
        {!offlinePage ? (
          <div className="flex gap-2 overflow-x-auto">
            {POST_TYPE_ORDER.map((type) => (
              <Button
                key={type}
                size="sm"
                variant={postType === type ? "primary" : "tertiary"}
                onPress={() => setPostType(type)}
              >
                {POST_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
        ) : null}

        <DraftNotices
          draftRestored={draftRestored}
          storageUnavailable={storageUnavailable}
          onRequestDiscard={discardConfirm.open}
        />

        {!offlinePage ? (
          <div className="mt-4">
            <AudiencePicker
              value={selected.key}
              onChange={setAudienceKey}
              destinations={destinations}
              loading={audience.loading}
              error={audience.error}
              onRetry={audience.retry}
            />
            <p aria-live="polite" className="mt-2 text-xs text-muted" data-testid="audience-notice">
              {audienceNotice}
            </p>
            {audienceFallback.length > 0 && (
              <div className="mt-2">
                <FeedbackAlert variant="warning" description={audienceFallback} />
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-4">
          <label htmlFor="post-conteudo" className="mb-1 block text-sm font-medium">
            {pageMode ? "Qual é a sua pergunta?" : "Conteúdo"} <span aria-hidden="true">*</span>
            <span className="sr-only"> (obrigatório)</span>
          </label>
          <TextArea
            id="post-conteudo"
            aria-label="Conteúdo"
            required
            aria-required="true"
            maxLength={pageMode ? QUESTION_TITLE_MAX : undefined}
            aria-describedby={pageMode ? "post-conteudo-counter" : undefined}
            className="w-full"
            placeholder={
              postType === "poll"
                ? "Pergunta da enquete..."
                : pageMode
                  ? "Escreva sua pergunta"
                  : "O que você quer compartilhar?"
            }
            value={content}
            onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
          />
          {pageMode ? (
            <p id="post-conteudo-counter" className="mt-1 text-right text-xs text-muted">
              {content.length}/{QUESTION_TITLE_MAX}
            </p>
          ) : null}
        </div>

        <div className="mt-4">
          <label htmlFor="post-detalhes" className="mb-1 block text-sm font-medium">
            {pageMode ? "Conte mais sobre sua dúvida (opcional)" : "Detalhes (opcional)"}
          </label>
          <TextArea
            id="post-detalhes"
            aria-label="Detalhes"
            maxLength={pageMode ? QUESTION_BODY_MAX : undefined}
            aria-describedby={pageMode ? "post-detalhes-counter" : undefined}
            className="w-full"
            placeholder={
              pageMode
                ? "Conte mais sobre sua dúvida, se quiser"
                : "Conte mais sobre sua publicação, se quiser"
            }
            value={details}
            onChange={(e) => setDetails((e.target as HTMLTextAreaElement).value)}
          />
          {pageMode ? (
            <p id="post-detalhes-counter" className="mt-1 text-right text-xs text-muted">
              {details.length}/{QUESTION_BODY_MAX}
            </p>
          ) : null}
        </div>

        {postType === "photo" || (pageMode && !offlinePage) ? (
          <div className="mt-4">
            <p className="mb-1 text-sm font-medium">Adicionar foto (opcional)</p>
            <PhotoField value={photoPath} onChange={setPhotoPath} onError={setPhotoError} />
            {photoError ? (
              <p aria-live="polite" className="mt-1 text-xs text-[var(--semantic-danger)]">
                {photoError}
              </p>
            ) : null}
          </div>
        ) : null}

        {postType === "link" ? (
          <Input
            aria-label="URL"
            placeholder="URL (https://...)"
            value={linkUrl}
            onChange={(e) => setLinkUrl((e.target as HTMLInputElement).value)}
            className="mt-4 w-full"
          />
        ) : null}

        {postType === "poll" ? (
          <PollEditor options={pollOptions} onOptionsChange={setPollOptions} />
        ) : null}

        {error && !offlinePage ? (
          <div className="mt-4" data-testid="publish-error">
            {/* Prancha 60, painel direito: falha de TRANSPORTE é o
              estado "Sem conexão" — a ação nunca chegou ao servidor,
              então a retomada é real (republicar) e o rascunho fica.
              Rejeição do servidor segue no alerta genérico, que é o
              anti-enumeração do lib/composer/publish-error. */}
            {errorKind === "network" ? (
              <ConnectionLostState
                description={offlinePage ? "Tente publicar quando a conexão voltar." : error}
                onRetry={() => {
                  void handleSubmit()
                }}
              />
            ) : (
              <FeedbackAlert
                variant="danger"
                description={offlinePage ? "Tente publicar quando a conexão voltar." : error}
              />
            )}
          </div>
        ) : null}
        {piiWarning ? (
          <PostPiiWarning onConfirm={handleSubmit} onCancel={() => setPiiWarning(false)} />
        ) : null}

        {!offlinePage ? (
          <div className="mt-4 flex flex-col items-end gap-1">
            <Button
              onPress={handleSubmit}
              isDisabled={
                submitting ||
                !draftReady ||
                !scopeIsCurrent ||
                audience.loading ||
                Boolean(audience.error) ||
                !content.trim()
              }
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
            <p className="text-xs text-[var(--semantic-action-primary)]">
              {placeName
                ? `Visível para membros do Bivaque em ${placeName}.`
                : "Escolha quem pode ver."}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-xs text-[var(--semantic-action-primary)]">
            {placeName
              ? `Visível para membros do Bivaque em ${placeName}.`
              : "Escolha quem pode ver."}
          </p>
        )}
      </div>

      {!offlinePage ? (
        <div className="hidden lg:block">
          <PostPreview
            destination={selected}
            destinationLoading={audience.loading}
            authorName={currentUser.user?.displayName ?? null}
            authorLoading={currentUser.loading}
            content={composePostContent(content, details)}
            placeName={placeName}
          />
        </div>
      ) : null}
    </div>
  )

  if (pageMode) {
    return (
      <>
        <div className="flex min-h-full flex-col bg-[var(--semantic-surface)]">
          <header className="border-b border-border bg-[var(--semantic-surface)]">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-[var(--semantic-link)] transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                >
                  <span aria-hidden="true">←</span> Voltar
                </button>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Nova pergunta</h1>
              </div>
              <div className="flex items-center gap-2 pl-1">
                <MemberAvatar name={currentUser.user?.displayName ?? "Você"} size="sm" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {currentUser.user?.displayName ?? "Você"}
                  </span>
                  <span className="text-xs text-muted">Agora mesmo</span>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1">{composerContent}</main>
          <footer className="border-t border-border bg-[var(--semantic-surface)]">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-3 px-6 pb-20 pt-4">
              <Button
                variant="tertiary"
                onPress={handleSaveDraft}
                isDisabled={submitting || !content.trim()}
              >
                Salvar rascunho
              </Button>
              <Button variant="tertiary" onPress={onClose} isDisabled={submitting}>
                Cancelar
              </Button>
            </div>
          </footer>
        </div>
        <DraftDiscardDialog
          open={discardConfirm.isOpen}
          onOpenChange={discardConfirm.setOpen}
          onDiscard={discardDraft}
        />
      </>
    )
  }

  return (
    <>
      <Modal state={modal}>
        <Modal.Backdrop
          {...(pageMode
            ? {
                variant: "transparent" as const,
                isDismissable: false,
                className: "!static !min-h-screen !bg-transparent !p-0",
              }
            : {})}
        >
          {/* O compositor é de duas colunas (formulário + "Como sua publicação
              será vista"), como a prancha 45 desenha. O prefixo `lg:` do grid
              responde à LARGURA DA JANELA, não à do diálogo: num monitor de
              1440px o `size="lg"` (512px) abria as duas colunas e sobravam 120px
              para o formulário — medido no navegador em 16/09/2026 (coluna do
              formulário e alerta de erro em 120px de largura). A largura do
              diálogo acompanha o conteúdo. */}
          <Modal.Container
            {...(pageMode
              ? { size: "cover" as const, className: "!static !min-h-screen !p-0" }
              : { size: "lg" as const })}
          >
            <Modal.Dialog
              className={
                pageMode
                  ? "!m-0 !min-h-screen !w-full !max-w-none !rounded-none !border-0 !bg-transparent !shadow-none"
                  : "max-w-4xl"
              }
            >
              <Modal.Header
                className={
                  pageMode
                    ? "mx-auto flex w-full max-w-5xl items-center border-b border-border bg-[var(--semantic-surface)] px-6 py-4"
                    : ""
                }
              >
                {pageMode ? (
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-[var(--semantic-link)] transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                    >
                      <span aria-hidden="true">←</span> Voltar
                    </button>
                    <Modal.Heading className="sr-only">Criar publicação</Modal.Heading>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      Nova pergunta
                    </h1>
                  </div>
                ) : (
                  <Modal.Heading>Criar publicação</Modal.Heading>
                )}
                <Modal.CloseTrigger
                  className={pageMode ? "hidden" : "min-h-11 min-w-11"}
                  aria-label="Fechar"
                />
              </Modal.Header>
              <Modal.Body
                className={
                  pageMode ? "!flex-1 !overflow-visible !bg-[var(--semantic-surface)] !p-0" : ""
                }
              >
                {composerContent}
              </Modal.Body>
              <Modal.Footer
                className={
                  pageMode
                    ? "mx-auto flex w-full max-w-5xl items-center justify-end gap-3 border-t border-border bg-[var(--semantic-surface)] px-6 pb-20 pt-4"
                    : ""
                }
              >
                {pageMode ? (
                  <>
                    <Button
                      variant="tertiary"
                      onPress={handleSaveDraft}
                      isDisabled={submitting || !content.trim()}
                    >
                      Salvar rascunho
                    </Button>
                    <Button variant="tertiary" onPress={onClose} isDisabled={submitting}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button variant="tertiary" onPress={modal.close} isDisabled={submitting}>
                    Cancelar
                  </Button>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <DraftDiscardDialog
        open={discardConfirm.isOpen}
        onOpenChange={discardConfirm.setOpen}
        onDiscard={discardDraft}
      />
    </>
  )
}
