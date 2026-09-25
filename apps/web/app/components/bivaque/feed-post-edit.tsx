"use client"

// Edição de publicação (prancha 45, painel direito). O destino da publicação
// NÃO muda — a prancha trava o seletor com cadeado e diz isso com todas as
// letras. O que a pessoa corrige é o texto e a foto; a RLS posts_update_own
// só aceita a gravação do autor, e o servidor continua sendo a palavra final.
//
// Estados fechados: sucesso fecha e atualiza o cartão; falha mostra
// "Não foi possível salvar. Seu texto continua aqui." e mantém o formulário
// aberto para nova tentativa; sair com alteração não salva exige confirmação
// explícita — descartar nunca é silencioso.

import { Button, Modal, Spinner, TextArea } from "@heroui/react"
import { Lock } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import type { Database } from "supabase/database.generated"
import { classifyPublishError } from "../../../lib/composer/publish-error"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "./avatar"
import { ModalCloseTrigger } from "./close-button"
import { DestinationIcon, usePostDestinationLabel } from "./feed-post-audience"
import { PhotoField } from "./feed-post-photo"
import { composePostContent, splitPostContent } from "./feed-post-shared"
import { FeedbackAlert } from "./feedback-alert"
import { showToast } from "./toast"

type EditPostRow = Pick<
  Database["public"]["Tables"]["posts"]["Row"],
  "id" | "locality_id" | "content" | "photo_path" | "group_id" | "post_type" | "user_id"
> & {
  community_id?: string | null
}

interface EditPostModalProps {
  post: EditPostRow
  onClose: () => void
  /** chamado só depois do UPDATE aceito pelo servidor */
  onSaved: (content: string, photoPath: string | null) => void
  pageMode?: boolean
  authorName?: string | null
}

export function EditPostModal({
  post,
  onClose,
  onSaved,
  pageMode = false,
  authorName = null,
}: EditPostModalProps) {
  const supabase = createBrowserClient()
  const initial = useMemo(() => splitPostContent(post.content ?? ""), [post.content])

  const [content, setContent] = useState(initial.content)
  const [details, setDetails] = useState(initial.details)
  const [photoPath, setPhotoPath] = useState(post.photo_path ?? "")
  const [photoError, setPhotoError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [baseline, setBaseline] = useState({
    content: post.content ?? "",
    photoPath: post.photo_path ?? "",
  })
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)

  const destination = usePostDestinationLabel(
    post.locality_id,
    post.community_id ?? null,
    post.group_id ?? null,
  )

  const composed = composePostContent(content, details)
  const isDirty = composed !== baseline.content || photoPath !== baseline.photoPath

  // O overlay é controlado e o estado `open` nunca vira false daqui sem a
  // pessoa decidir: X, backdrop e Escape pedem fechamento, e com alteração não
  // salva o que abre é o diálogo da prancha — nunca a saída.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) return
      if (isDirty) {
        setExitConfirmOpen(true)
      } else {
        onClose()
      }
    },
    [isDirty, onClose],
  )

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      setSaveError("A publicação precisa de texto.")
      return
    }
    setSaveError("")
    setPhotoError("")
    setSaving(true)

    const effectivePostType = pageMode && photoPath.trim() ? "photo" : post.post_type
    const update: {
      content: string
      post_type?: Database["public"]["Enums"]["post_type"]
      photo_path?: string | null
    } = { content: composed, post_type: effectivePostType }
    if (effectivePostType === "photo") {
      update.photo_path = photoPath.trim() || null
    }

    const { error } = await supabase
      .from("posts")
      .update(update as Database["public"]["Tables"]["posts"]["Update"])
      .eq("id", post.id)

    if (error) {
      const view = classifyPublishError(error)
      // Copy da prancha: o texto continua na tela e o botão volta a ficar
      // clicável. Falha de gravação nunca aparece como sucesso.
      setSaveError(
        view.kind === "network"
          ? "Não foi possível salvar. Seu texto continua aqui. Verifique sua conexão e tente de novo."
          : "Não foi possível salvar. Seu texto continua aqui.",
      )
      setSaving(false)
      return
    }

    setBaseline({ content: composed, photoPath })
    setSaving(false)
    showToast({
      title: "Alterações salvas",
      description: "A publicação foi atualizada para quem já podia vê-la.",
      variant: "success",
    })
    onSaved(
      composed,
      post.post_type === "photo" || (pageMode && photoPath.trim())
        ? photoPath.trim() || null
        : null,
    )
    onClose()
  }, [content, composed, pageMode, photoPath, post.id, post.post_type, supabase, onSaved, onClose])

  if (pageMode) {
    return (
      <>
        <EditPostPageSurface
          post={post}
          content={content}
          onContentChange={setContent}
          details={details}
          onDetailsChange={setDetails}
          photoPath={photoPath}
          onPhotoPathChange={setPhotoPath}
          photoError={photoError}
          onPhotoError={setPhotoError}
          saving={saving}
          saveError={saveError}
          isDirty={isDirty}
          composed={composed}
          destination={destination}
          authorName={authorName}
          onBack={() => handleOpenChange(false)}
          onSave={handleSave}
        />
        <ExitConfirmDialog
          open={exitConfirmOpen}
          onContinue={() => setExitConfirmOpen(false)}
          onDiscard={() => {
            setExitConfirmOpen(false)
            onClose()
          }}
        />
      </>
    )
  }

  return (
    <>
      <Modal isOpen onOpenChange={handleOpenChange}>
        <Modal.Backdrop
          {...(pageMode
            ? {
                variant: "transparent" as const,
                isDismissable: false,
                className: "!fixed !inset-0 !h-screen !w-screen !bg-transparent !p-0",
              }
            : {})}
        >
          <Modal.Container
            {...(pageMode
              ? { size: "cover" as const, className: "!fixed !inset-0 !h-screen !w-screen !p-0" }
              : { size: "lg" as const })}
          >
            <Modal.Dialog
              className={
                pageMode
                  ? "!relative !m-0 !h-screen !w-full !max-w-none !rounded-none !border-0 !bg-transparent !pt-14 !shadow-none"
                  : "max-w-4xl"
              }
            >
              <Modal.Header
                className={
                  pageMode
                    ? "mx-auto flex w-full max-w-5xl items-center gap-3 border-b border-border bg-[var(--semantic-surface)] px-6 py-4"
                    : ""
                }
              >
                {pageMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenChange(false)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-[var(--semantic-link)] transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                    >
                      <span aria-hidden="true">←</span> Voltar
                    </button>
                    <Modal.Heading className="sr-only">Editar publicação</Modal.Heading>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      Editar publicação
                    </h1>
                    {authorName ? (
                      <div className="ml-1 flex items-center gap-2 border-l border-border pl-4">
                        <MemberAvatar name={authorName} size="sm" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{authorName}</span>
                          <span className="text-xs text-muted">Agora mesmo</span>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <Modal.Heading>Editar publicação</Modal.Heading>
                )}
                <ModalCloseTrigger className={pageMode ? "hidden" : "min-h-11 min-w-11"} />
              </Modal.Header>
              <Modal.Body
                className={
                  pageMode
                    ? "!mx-auto !grid !w-full !max-w-6xl !flex-1 !overflow-visible !bg-transparent !p-0 lg:grid-cols-[minmax(0,38rem)_20rem] lg:gap-8"
                    : ""
                }
              >
                <div
                  data-composer-form={pageMode ? "edit" : undefined}
                  className={pageMode ? "w-full px-6 py-8" : ""}
                >
                  {/* Destino travado — a prancha mostra o seletor com cadeado e
                    a frase que diz que não se altera. O nome vem de consulta
                    por id, nunca de constante. */}
                  <div>
                    <p className="mb-1 text-sm font-medium">Destino da publicação</p>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-[var(--semantic-surface-sunken)] px-3 py-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <Lock size={16} aria-hidden="true" className="shrink-0 text-muted" />
                        {destination.loading ? (
                          <span className="text-sm text-muted">Carregando destino…</span>
                        ) : destination.name ? (
                          <span className="flex min-w-0 items-center gap-2">
                            <DestinationIcon
                              kind={
                                post.community_id ? "community" : post.group_id ? "group" : "city"
                              }
                            />
                            <span className="truncate text-sm">{destination.name}</span>
                          </span>
                        ) : (
                          <span className="text-sm text-muted">
                            Não foi possível carregar o destino.
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Você não pode alterar o destino desta publicação.
                    </p>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="edit-conteudo" className="mb-1 block text-sm font-medium">
                      Conteúdo <span aria-hidden="true">*</span>
                      <span className="sr-only"> (obrigatório)</span>
                    </label>
                    <TextArea
                      id="edit-conteudo"
                      aria-label="Conteúdo"
                      className="w-full"
                      required
                      aria-required="true"
                      value={content}
                      onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
                    />
                  </div>

                  <div className="mt-4">
                    <label htmlFor="edit-detalhes" className="mb-1 block text-sm font-medium">
                      Detalhes (opcional)
                    </label>
                    <TextArea
                      id="edit-detalhes"
                      aria-label="Detalhes"
                      className="w-full"
                      value={details}
                      onChange={(e) => setDetails((e.target as HTMLTextAreaElement).value)}
                    />
                  </div>

                  {post.post_type === "photo" || pageMode ? (
                    <div className="mt-4">
                      <p className="mb-1 text-sm font-medium">Foto</p>
                      <PhotoField
                        value={photoPath}
                        onChange={setPhotoPath}
                        onError={setPhotoError}
                        selectLabel="Selecionar nova foto"
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

                  {saveError ? (
                    <div className="mt-4" data-testid="edit-save-error">
                      <FeedbackAlert
                        variant="danger"
                        title="Falha ao salvar"
                        description={saveError}
                      />
                    </div>
                  ) : null}
                </div>
                {pageMode ? (
                  <aside
                    aria-label="Como sua publicação será vista"
                    className="m-6 mt-0 rounded-2xl border border-border bg-[var(--semantic-surface)] p-4 lg:mt-8"
                  >
                    <p className="text-sm font-semibold">Como sua publicação será vista</p>
                    <div className="mt-3 flex items-center gap-2 border-b border-border pb-3">
                      <DestinationIcon
                        kind={post.community_id ? "community" : post.group_id ? "group" : "city"}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {destination.name ?? "Destino indisponível"}
                        </p>
                        <p className="text-xs text-muted">Destino travado para esta edição</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <MemberAvatar name={authorName ?? "Você"} className="h-8 w-8 text-xs" />
                      <div>
                        <p className="text-sm font-medium">{authorName ?? "Você"}</p>
                        <p className="text-xs text-muted">Agora mesmo</p>
                      </div>
                    </div>
                    <div className="mt-3 min-h-16 rounded-lg bg-[var(--semantic-surface-sunken)] p-3">
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {composed || "O que você escrever aparece aqui."}
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-[var(--semantic-action-primary)]">
                      O destino não pode ser alterado nesta publicação.
                    </p>
                  </aside>
                ) : null}
              </Modal.Body>
              <Modal.Footer
                className={
                  pageMode
                    ? "mx-auto flex w-full max-w-6xl items-center justify-end gap-3 border-t border-border bg-[var(--semantic-surface)] px-6 pb-20 pt-4"
                    : ""
                }
              >
                <Button
                  variant="tertiary"
                  onPress={() => handleOpenChange(false)}
                  isDisabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  onPress={handleSave}
                  variant="primary"
                  isDisabled={saving || !isDirty}
                  aria-busy={saving}
                  data-testid="edit-save-submit"
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" aria-label="Salvando alterações" />
                      Salvando…
                    </>
                  ) : (
                    "Salvar alterações"
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ExitConfirmDialog
        open={exitConfirmOpen}
        onContinue={() => setExitConfirmOpen(false)}
        onDiscard={() => {
          setExitConfirmOpen(false)
          onClose()
        }}
      />
    </>
  )
}

export function EditPostPage(props: Omit<EditPostModalProps, "pageMode">) {
  return <EditPostModal {...props} pageMode />
}

interface EditPostPageSurfaceProps {
  post: EditPostRow
  content: string
  onContentChange: (value: string) => void
  details: string
  onDetailsChange: (value: string) => void
  photoPath: string
  onPhotoPathChange: (value: string) => void
  photoError: string
  onPhotoError: (message: string) => void
  saving: boolean
  saveError: string
  isDirty: boolean
  composed: string
  destination: { loading: boolean; name: string | null }
  authorName: string | null
  onBack: () => void
  onSave: () => void
}

function EditPostPageSurface({
  post,
  content,
  onContentChange,
  details,
  onDetailsChange,
  photoPath,
  onPhotoPathChange,
  photoError,
  onPhotoError,
  saving,
  saveError,
  isDirty,
  composed,
  destination,
  authorName,
  onBack,
  onSave,
}: EditPostPageSurfaceProps) {
  const destinationKind = post.community_id ? "community" : post.group_id ? "group" : "city"

  return (
    <div className="flex min-h-full flex-col bg-[var(--semantic-surface)]">
      <header className="border-b border-border bg-[var(--semantic-surface)]">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-[var(--semantic-link)] transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
          >
            <span aria-hidden="true">←</span> Voltar
          </button>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Editar publicação</h1>
          {authorName ? (
            <div className="ml-1 flex items-center gap-2 border-l border-border pl-4">
              <MemberAvatar name={authorName} size="sm" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{authorName}</span>
                <span className="text-xs text-muted">Agora mesmo</span>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-6 py-8 lg:grid-cols-[minmax(0,38rem)_20rem]">
        <section data-composer-form="edit" data-post-type={post.post_type} className="w-full">
          <div>
            <p className="mb-1 text-sm font-medium">Destino da publicação</p>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-[var(--semantic-surface-sunken)] px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2">
                <Lock size={16} aria-hidden="true" className="shrink-0 text-muted" />
                {destination.loading ? (
                  <span className="text-sm text-muted">Carregando destino…</span>
                ) : destination.name ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <DestinationIcon kind={destinationKind} />
                    <span className="truncate text-sm">{destination.name}</span>
                  </span>
                ) : (
                  <span className="text-sm text-muted">Não foi possível carregar o destino.</span>
                )}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Você não pode alterar o destino desta publicação.
            </p>
          </div>

          <div className="mt-4">
            <label htmlFor="page-edit-conteudo" className="mb-1 block text-sm font-medium">
              Conteúdo <span aria-hidden="true">*</span>
              <span className="sr-only"> (obrigatório)</span>
            </label>
            <TextArea
              id="page-edit-conteudo"
              aria-label="Conteúdo"
              className="w-full"
              required
              aria-required="true"
              value={content}
              onChange={(event) => onContentChange((event.target as HTMLTextAreaElement).value)}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="page-edit-detalhes" className="mb-1 block text-sm font-medium">
              Detalhes (opcional)
            </label>
            <TextArea
              id="page-edit-detalhes"
              aria-label="Detalhes"
              className="w-full"
              value={details}
              onChange={(event) => onDetailsChange((event.target as HTMLTextAreaElement).value)}
            />
          </div>

          {post.post_type === "photo" || post.post_type === "text" ? (
            <div className="mt-4">
              <p className="mb-1 text-sm font-medium">Foto</p>
              <PhotoField
                value={photoPath}
                onChange={onPhotoPathChange}
                onError={onPhotoError}
                selectLabel="Selecionar nova foto"
              />
              {photoError ? (
                <p aria-live="polite" className="mt-1 text-xs text-[var(--semantic-danger)]">
                  {photoError}
                </p>
              ) : null}
            </div>
          ) : null}

          {saveError ? (
            <div className="mt-4" data-testid="edit-save-error">
              <FeedbackAlert variant="danger" title="Falha ao salvar" description={saveError} />
            </div>
          ) : null}
        </section>

        <aside
          aria-label="Como sua publicação será vista"
          className="h-fit rounded-2xl border border-border bg-[var(--semantic-surface)] p-4 lg:mt-8"
        >
          <p className="text-sm font-semibold">Como sua publicação será vista</p>
          <div className="mt-3 flex items-center gap-2 border-b border-border pb-3">
            <DestinationIcon kind={destinationKind} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {destination.name ?? "Destino indisponível"}
              </p>
              <p className="text-xs text-muted">Destino travado para esta edição</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <MemberAvatar name={authorName ?? "Você"} className="h-8 w-8 text-xs" />
            <div>
              <p className="text-sm font-medium">{authorName ?? "Você"}</p>
              <p className="text-xs text-muted">Agora mesmo</p>
            </div>
          </div>
          <div className="mt-3 min-h-16 rounded-lg bg-[var(--semantic-surface-sunken)] p-3">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {composed || "O que você escrever aparece aqui."}
            </p>
          </div>
          <p className="mt-3 text-xs text-[var(--semantic-action-primary)]">
            O destino não pode ser alterado nesta publicação.
          </p>
        </aside>
      </main>

      <footer className="border-t border-border bg-[var(--semantic-surface)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-3 px-6 pb-20 pt-4">
          <Button variant="tertiary" onPress={onBack} isDisabled={saving}>
            Cancelar
          </Button>
          <Button
            onPress={onSave}
            variant="primary"
            isDisabled={saving || !isDirty}
            aria-busy={saving}
            data-testid="edit-save-submit"
          >
            {saving ? (
              <>
                <Spinner size="sm" aria-label="Salvando alterações" />
                Salvando…
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </div>
      </footer>
    </div>
  )
}

function ExitConfirmDialog({
  open,
  onContinue,
  onDiscard,
}: {
  open: boolean
  onContinue: () => void
  onDiscard: () => void
}) {
  if (!open) return null

  return (
    <Modal isOpen onOpenChange={(next) => !next && onContinue()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Sair sem salvar?</Modal.Heading>
              <ModalCloseTrigger className="min-h-11 min-w-11" />
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm">Se sair agora, as alterações feitas não serão salvas.</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="primary" onPress={onContinue}>
                Continuar editando
              </Button>
              <Button variant="danger" onPress={onDiscard}>
                Descartar alterações
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
