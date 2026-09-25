"use client"

// Criação de publicação (prancha 44 painel 1 + prancha 45). Composição: a
// PERGUNTA primeiro, depois destino real ("Quem pode ver?"), detalhes
// opcionais, anexo opcional e a prévia "Como sua publicação será vista".
//
// A intenção já foi escolhida na tela anterior ("Fazer uma pergunta" /
// "Pedir uma indicação"), então o compositor NÃO pergunta o formato de novo:
// não existe seletor de Texto/Foto/Link/Enquete antes do conteúdo. Anexar foto
// ou link é opção SOBRE a pergunta e começa vazia; é o ANEXO REAL que deriva o
// `post_type` gravado (ver `derived`). Não há enquete — nem editor, nem estado.
//
// Rascunho (RECON-014): o texto fica no armazenamento do PRÓPRIO navegador
// (feed-post-draft), nunca no servidor; quem foi interrompido recupera o que
// escreveu ao reabrir; descartar é explícito e confirmado — nada apaga em
// silêncio. Publicar continua sendo decisão da pessoa: nenhum rascunho vira
// publicação sozinho.

import { detectCep, detectCpf } from "@bivaque/domain"
import { Button, Input, Modal, Spinner, TextArea, useOverlayState } from "@heroui/react"
import { ImagePlus, Link2 } from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import {
  attachmentPublishBlocker,
  derivePostType,
  normalizeAttachment,
  type PostAttachment,
} from "../../../lib/composer/post-attachment"
import { classifyPublishError } from "../../../lib/composer/publish-error"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "./avatar"
import { ModalCloseTrigger } from "./close-button"
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
import { PostPreview } from "./feed-post-preview"
import {
  type AudienceKey,
  CITY_AUDIENCE_KEY,
  composePostContent,
  parseAudienceKey,
  useCurrentUser,
} from "./feed-post-shared"
import { FeedbackAlert } from "./feedback-alert"
import { showToast } from "./toast"

interface CreatePostModalProps {
  localityId: string
  /** Dica da TELA DE ENTRADA: qual anexo já vem oferecido ao abrir. Nunca
   *  escolhe o formato — o `post_type` sai do anexo real (`derived`), então
   *  abrir por aqui e não anexar nada publica uma pergunta de texto. */
  initialAttachment?: string | undefined
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
  initialAttachment,
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
  const [attachment, setAttachment] = useState<PostAttachment>(() =>
    normalizeAttachment(initialAttachment),
  )
  const [content, setContent] = useState("")
  const [details, setDetails] = useState("")
  const [photoPath, setPhotoPath] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
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
    setAttachment(normalizeAttachment(initialAttachment))
    setContent("")
    setDetails("")
    setPhotoPath("")
    setLinkUrl("")
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
      // O rascunho não guarda formato: o anexo restaurado sai do anexo real.
      setAttachment(
        draft.photoPath.trim()
          ? "photo"
          : draft.linkUrl.trim()
            ? "link"
            : normalizeAttachment(initialAttachment),
      )
      setContent(draft.content)
      setDetails(draft.details)
      setPhotoPath(draft.photoPath)
      setLinkUrl(draft.linkUrl)
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
  }, [
    currentUser.loading,
    draftScopeKey,
    ownerId,
    localityId,
    defaultCommunityId,
    initialAttachment,
  ])

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

  // Trocar de anexo LIMPA o outro. É o que mantém o estado representável no
  // banco: `photo_path` e `link_url` não coexistem sob as CHECKs de
  // `public.posts`, e um campo escondido mas preenchido publicaria um anexo que
  // ninguém vê.
  const selectAttachment = useCallback(
    (next: PostAttachment) => {
      const chosen = attachment === next ? null : next
      if (chosen !== "photo") setPhotoPath("")
      if (chosen !== "link") setLinkUrl("")
      setAttachment(chosen)
    },
    [attachment],
  )

  // O ANEXO DERIVA O FORMATO. Tipo e colunas extras saem do mesmo objeto
  // (`lib/composer/post-attachment`); anexo ligado e vazio cai no ramo `text`
  // e é barrado por `attachmentPublishBlocker` no handleSubmit.
  const derived = useMemo(
    () => derivePostType(attachment, photoPath, linkUrl),
    [attachment, photoPath, linkUrl],
  )

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
    () => ({ content, details, linkUrl, photoPath }),
    [content, details, linkUrl, photoPath],
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
    setAttachment(null)
    setContent("")
    setDetails("")
    setPhotoPath("")
    setLinkUrl("")
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
    // O anexo escolhido e o anexo publicado têm de ser o mesmo: anexo ligado e
    // vazio (ou foto ainda enviando) não pode virar pergunta de texto em
    // silêncio.
    const blocked = attachmentPublishBlocker(attachment, photoPath, linkUrl)
    if (blocked) {
      setError(blocked)
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
      post_type: derived.postType,
      content: composed,
      community_id: kind.kind === "community" ? kind.id : null,
      group_id: kind.kind === "group" ? kind.id : null,
    } as const

    // Tipo e extras saem do MESMO objeto `derived`: a coluna extra nunca entra
    // sem o `post_type` que a CHECK correspondente exige.
    const { error: insertError } = await supabase.from("posts").insert({
      ...insertData,
      ...derived.extras,
    } as Database["public"]["Tables"]["posts"]["Insert"])

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
    derived,
    attachment,
    photoPath,
    linkUrl,
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
    setAttachment(null)
    setContent("")
    setDetails("")
    setLinkUrl("")
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

  const reachNotice = placeName
    ? `Visível para membros do Bivaque em ${placeName}.`
    : "Escolha quem pode ver."

  const publishButton = (
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
  )

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
        <DraftNotices
          draftRestored={draftRestored}
          storageUnavailable={storageUnavailable}
          onRequestDiscard={discardConfirm.open}
        />

        {/* A PERGUNTA VEM PRIMEIRO: destino é decisão SOBRE a pergunta — quem
            vai ler o que já foi escrito —, não um passo que a antecede
            (prancha 45 painel 2). */}
        <div className="mt-4">
          <label htmlFor="post-conteudo" className="mb-1 block text-sm font-medium">
            {pageMode ? "Qual é a sua pergunta?" : "Pergunta"} <span aria-hidden="true">*</span>
            <span className="sr-only"> (obrigatório)</span>
          </label>
          <TextArea
            id="post-conteudo"
            aria-label="Pergunta"
            required
            aria-required="true"
            maxLength={pageMode ? QUESTION_TITLE_MAX : undefined}
            aria-describedby={pageMode ? "post-conteudo-counter" : undefined}
            className="w-full"
            placeholder={pageMode ? "Escreva sua pergunta" : "O que você quer perguntar?"}
            value={content}
            onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
          />
          {pageMode ? (
            <p id="post-conteudo-counter" className="mt-1 text-right text-xs text-muted">
              {content.length}/{QUESTION_TITLE_MAX}
            </p>
          ) : null}
        </div>

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

        {/* Anexo é opção SOBRE a pergunta, nunca passo anterior: vem DEPOIS do
            texto, começa vazio (nenhum anexo é o default) e não decide o formato
            sozinho — quem decide é o anexo real, em `derived`. O `min-w-0`
            neutraliza o `min-inline-size: min-content` padrão do fieldset, que
            estouraria a coluna do formulário em 375px. */}
        {!offlinePage ? (
          <fieldset className="mt-4 min-w-0">
            <legend className="mb-1 block text-sm font-medium">Anexar à pergunta (opcional)</legend>
            <p className="mb-2 text-xs text-muted">Uma pergunta pode levar uma foto ou um link.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={attachment === "photo" ? "primary" : "tertiary"}
                aria-pressed={attachment === "photo"}
                onPress={() => selectAttachment("photo")}
                className="min-h-11"
              >
                <ImagePlus size={16} aria-hidden="true" />
                Foto
              </Button>
              <Button
                size="sm"
                variant={attachment === "link" ? "primary" : "tertiary"}
                aria-pressed={attachment === "link"}
                onPress={() => selectAttachment("link")}
                className="min-h-11"
              >
                <Link2 size={16} aria-hidden="true" />
                Link
              </Button>
            </div>

            {attachment === "photo" ? (
              <div className="mt-3">
                <PhotoField value={photoPath} onChange={setPhotoPath} onError={setPhotoError} />
                {photoError ? (
                  <p aria-live="polite" className="mt-1 text-xs text-[var(--semantic-danger)]">
                    {photoError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {attachment === "link" ? (
              <Input
                aria-label="URL"
                placeholder="URL (https://...)"
                value={linkUrl}
                onChange={(e) => setLinkUrl((e.target as HTMLInputElement).value)}
                className="mt-3 w-full"
              />
            ) : null}
          </fieldset>
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

        {/* No MODAL, o primário vive na barra de ações do rodapé, fora da área
            que rola: com ele no fim do `Modal.Body` (overflow-y-auto), o centro
            do botão caía fora da caixa visível em 375x568 e o hit-test resolvia
            para o "Cancelar" do rodapé (medido em 19/09/2026). Na ROTA não há
            corpo rolável, e o primário fecha o formulário. */}
        {pageMode && !offlinePage ? (
          <div className="mt-4 flex flex-col items-end gap-1">
            {publishButton}
            <p className="text-xs text-[var(--semantic-action-primary)]">{reachNotice}</p>
          </div>
        ) : (
          <p className="mt-4 text-xs text-[var(--semantic-action-primary)]">{reachNotice}</p>
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
                <ModalCloseTrigger className={pageMode ? "hidden" : "min-h-11 min-w-11"} />
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
                  <>
                    <Button variant="tertiary" onPress={modal.close} isDisabled={submitting}>
                      Cancelar
                    </Button>
                    {publishButton}
                  </>
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
