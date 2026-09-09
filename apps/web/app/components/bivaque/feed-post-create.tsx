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
import {
  type AudienceDestination,
  AudiencePicker,
  audienceNoticeText,
  cityDestination,
  usePostAudience,
} from "./feed-post-audience"
import {
  clearPostDraft,
  hasDraftContent,
  loadPostDraft,
  type PostDraftFields,
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
}

const AUTOSAVE_DELAY_MS = 400

export function CreatePostModal({
  localityId,
  defaultPostType,
  defaultCommunityId,
  onCreated,
  onClose,
}: CreatePostModalProps) {
  const modal = useOverlayState({ defaultOpen: true, onOpenChange: (open) => !open && onClose() })
  const { current: locality } = useLocalityContext()
  const initialDraft = useRef(loadPostDraft())
  const [postType, setPostType] = useState(
    initialDraft.current?.postType ?? defaultPostType ?? "text",
  )
  const [content, setContent] = useState(initialDraft.current?.content ?? "")
  const [details, setDetails] = useState(initialDraft.current?.details ?? "")
  const [photoPath, setPhotoPath] = useState(initialDraft.current?.photoPath ?? "")
  const [linkUrl, setLinkUrl] = useState(initialDraft.current?.linkUrl ?? "")
  const [pollOptions, setPollOptions] = useState<string[]>(initialDraft.current?.pollOptions ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [piiWarning, setPiiWarning] = useState(false)
  const [audienceKey, setAudienceKey] = useState<AudienceKey>(
    defaultCommunityId ? `community:${defaultCommunityId}` : CITY_AUDIENCE_KEY,
  )
  const [draftRestored, setDraftRestored] = useState(hasDraftContent(initialDraft.current))
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const dialogContentRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient()

  const audience = usePostAudience(localityId)
  const currentUser = useCurrentUser()
  const city = cityDestination(locality?.cityName ?? "")
  const destinations: AudienceDestination[] = [city, ...audience.communities, ...audience.groups]
  const selected = destinations.find((d) => d.key === audienceKey) ?? city
  const selectedKind = parseAudienceKey(selected.key)

  useEffect(() => {
    if (!modal.isOpen) {
      onClose()
    }
  }, [modal.isOpen, onClose])

  useLayoutEffect(() => {
    if (!modal.isOpen) return
    if (!dialogContentRef.current) return
    const focusable = dialogContentRef.current.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable && document.activeElement !== focusable) {
      focusable.focus()
    }
  }, [modal.isOpen])

  // A audiência default só pode ser uma comunidade real da pessoa. Se a lista
  // carregou e não contém a pré-seleção, o destino volta para a cidade — o
  // aviso de audiência nunca descreve um destino que não estava disponível.
  useEffect(() => {
    if (audience.loading || audience.error) return
    if (selectedKind.kind === "community" && defaultCommunityId) {
      const stillThere = audience.communities.some(
        (d) => d.key === `community:${defaultCommunityId}`,
      )
      if (!stillThere) setAudienceKey(CITY_AUDIENCE_KEY)
    }
  }, [
    audience.loading,
    audience.error,
    audience.communities,
    defaultCommunityId,
    selectedKind.kind,
  ])

  // Autosave do rascunho — melhor esforço, nunca quebra a tela. Campos todos
  // vazios removem o rascunho (a pessoa esvaziou de propósito); publicar ou
  // descartar confirmado são os outros dois caminhos de limpeza.
  const persistDraft = useCallback((fields: PostDraftFields) => {
    if (hasDraftContent({ ...fields, savedAt: 0 })) {
      setStorageUnavailable(!savePostDraftFields(fields))
    } else {
      clearPostDraft()
      setStorageUnavailable(false)
    }
  }, [])

  const draftFields = useMemo<PostDraftFields>(
    () => ({ postType, content, details, linkUrl, pollOptions, photoPath }),
    [postType, content, details, linkUrl, pollOptions, photoPath],
  )

  useEffect(() => {
    const timer = setTimeout(() => persistDraft(draftFields), AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draftFields, persistDraft])

  // O debounce acima é cancelado quando o modal fecha antes do timer — sem
  // este flush, a última coisa digitada antes de fechar se perderia, que é
  // exatamente o caso que o rascunho existe para cobrir.
  const latestFields = useRef(draftFields)
  latestFields.current = draftFields
  useEffect(() => () => persistDraft(latestFields.current), [persistDraft])

  const resetForm = useCallback(() => {
    setPostType("text")
    setContent("")
    setDetails("")
    setPhotoPath("")
    setLinkUrl("")
    setPollOptions([])
    setError("")
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
    setError("")
    setPhotoError("")

    if (!content.trim()) {
      setError("A publicação precisa de texto.")
      return
    }
    if (postType === "photo" && !photoPath.trim()) {
      setError("Foto requer uma imagem anexada")
      return
    }
    if (postType === "link" && !linkUrl.trim()) {
      setError("Link requer uma URL")
      return
    }
    if (postType === "poll" && pollOptions.length < 2) {
      setError("Enquete requer pelo menos 2 opções")
      return
    }

    const composed = composePostContent(content, details)
    if (!piiWarning && (detectCpf(composed) || detectCep(composed))) {
      setPiiWarning(true)
      return
    }

    setSubmitting(true)

    const kind = parseAudienceKey(selected.key)
    const insertData = {
      locality_id: localityId,
      post_type: postType,
      content: composed,
      community_id: kind.kind === "community" ? kind.id : null,
      group_id: kind.kind === "group" ? kind.id : null,
    } as const

    const extras: { photo_path?: string; link_url?: string; poll_options?: string[] } = {}
    if (postType === "photo" && photoPath.trim()) {
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
      setError(view.message)
      // `preserveDraft` é sobre o conteúdo (não limpamos; o rascunho no
      // navegador também sobrevive); o botão volta a ficar clicável para a
      // pessoa corrigir e tentar de novo — manter `submitting` trancaria o
      // caminho de recuperação.
      setSubmitting(false)
      return
    }

    // Publicado: o rascunho cumpriu o papel dele e sai do navegador só agora,
    // pela ação concluída da pessoa — nunca antes, nunca sozinho.
    clearPostDraft()
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
    postType,
    photoPath,
    linkUrl,
    pollOptions,
    piiWarning,
    selected.key,
    localityId,
    locality?.cityName,
    supabase,
    resetForm,
    onCreated,
    modal,
  ])

  const discardConfirm = useOverlayState()

  const discardDraft = useCallback(() => {
    clearPostDraft()
    setContent("")
    setDetails("")
    setLinkUrl("")
    setPollOptions([])
    setPhotoPath("")
    setDraftRestored(false)
    setStorageUnavailable(false)
    discardConfirm.close()
  }, [discardConfirm])

  const placeName =
    selectedKind.kind === "city"
      ? (locality?.cityName ?? null)
      : selected.kind !== "city"
        ? selected.name
        : null

  const audienceNotice = audienceNoticeText(selectedKind.kind, locality?.cityName ?? null)

  return (
    <>
      <Modal state={modal}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Criar publicação</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                <div className="gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div ref={dialogContentRef}>
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

                    <DraftNotices
                      draftRestored={draftRestored}
                      storageUnavailable={storageUnavailable}
                      onRequestDiscard={discardConfirm.open}
                    />

                    <div className="mt-4">
                      <AudiencePicker
                        value={selected.key}
                        onChange={setAudienceKey}
                        destinations={destinations}
                        loading={audience.loading}
                        error={audience.error}
                        onRetry={audience.retry}
                      />
                      <p
                        aria-live="polite"
                        className="mt-2 text-xs text-muted"
                        data-testid="audience-notice"
                      >
                        {audienceNotice}
                      </p>
                    </div>

                    <div className="mt-4">
                      <label htmlFor="post-conteudo" className="mb-1 block text-sm font-medium">
                        Conteúdo <span aria-hidden="true">*</span>
                        <span className="sr-only"> (obrigatório)</span>
                      </label>
                      <TextArea
                        id="post-conteudo"
                        aria-label="Conteúdo"
                        required
                        aria-required="true"
                        placeholder={
                          postType === "poll"
                            ? "Pergunta da enquete..."
                            : "O que você quer compartilhar?"
                        }
                        value={content}
                        onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="post-detalhes" className="mb-1 block text-sm font-medium">
                        Detalhes (opcional)
                      </label>
                      <TextArea
                        id="post-detalhes"
                        aria-label="Detalhes"
                        placeholder="Conte mais sobre sua publicação, se quiser"
                        value={details}
                        onChange={(e) => setDetails((e.target as HTMLTextAreaElement).value)}
                      />
                    </div>

                    {postType === "photo" ? (
                      <div className="mt-4">
                        <p className="mb-1 text-sm font-medium">Adicionar foto (opcional)</p>
                        <PhotoField
                          value={photoPath}
                          onChange={setPhotoPath}
                          onError={setPhotoError}
                        />
                        {photoError ? (
                          <p
                            aria-live="polite"
                            className="mt-1 text-xs text-[var(--semantic-danger)]"
                          >
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
                        className="mt-4"
                      />
                    ) : null}

                    {postType === "poll" ? (
                      <PollEditor options={pollOptions} onOptionsChange={setPollOptions} />
                    ) : null}

                    {error ? (
                      <div className="mt-4" data-testid="publish-error">
                        <FeedbackAlert variant="danger" description={error} />
                      </div>
                    ) : null}
                    {piiWarning ? (
                      <PostPiiWarning
                        onConfirm={handleSubmit}
                        onCancel={() => setPiiWarning(false)}
                      />
                    ) : null}

                    <div className="mt-4 flex flex-col items-end gap-1">
                      <Button
                        onPress={handleSubmit}
                        isDisabled={submitting || !content.trim()}
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
                  </div>

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
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={modal.close} isDisabled={submitting}>
                  Cancelar
                </Button>
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
