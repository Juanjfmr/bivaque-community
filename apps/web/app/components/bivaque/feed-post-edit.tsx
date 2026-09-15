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
import { DestinationIcon, usePostDestinationLabel } from "./feed-post-audience"
import { PhotoField } from "./feed-post-photo"
import { composePostContent, type FeedPostRow, splitPostContent } from "./feed-post-shared"
import { FeedbackAlert } from "./feedback-alert"
import { showToast } from "./toast"

interface EditPostModalProps {
  post: FeedPostRow
  onClose: () => void
  /** chamado só depois do UPDATE aceito pelo servidor */
  onSaved: (content: string, photoPath: string | null) => void
}

export function EditPostModal({ post, onClose, onSaved }: EditPostModalProps) {
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

    const update: { content: string; photo_path?: string | null } = { content: composed }
    if (post.post_type === "photo") {
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
    onSaved(composed, post.post_type === "photo" ? photoPath.trim() || null : null)
    onClose()
  }, [content, composed, photoPath, post.id, post.post_type, supabase, onSaved, onClose])

  return (
    <>
      <Modal isOpen onOpenChange={handleOpenChange}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Editar publicação</Modal.Heading>
                <Modal.CloseTrigger className="min-h-11 min-w-11" />
              </Modal.Header>
              <Modal.Body>
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
                    value={details}
                    onChange={(e) => setDetails((e.target as HTMLTextAreaElement).value)}
                  />
                </div>

                {post.post_type === "photo" ? (
                  <div className="mt-4">
                    <p className="mb-1 text-sm font-medium">Foto</p>
                    <PhotoField
                      value={photoPath}
                      onChange={setPhotoPath}
                      onError={setPhotoError}
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
                    <FeedbackAlert
                      variant="danger"
                      title="Falha ao salvar"
                      description={saveError}
                    />
                  </div>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
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

      {exitConfirmOpen ? (
        <Modal isOpen onOpenChange={(next) => setExitConfirmOpen(next)}>
          <Modal.Backdrop>
            <Modal.Container size="sm">
              <Modal.Dialog>
                <Modal.Header>
                  <Modal.Heading>Sair sem salvar?</Modal.Heading>
                  <Modal.CloseTrigger className="min-h-11 min-w-11" />
                </Modal.Header>
                <Modal.Body>
                  <p className="text-sm">Se sair agora, as alterações feitas não serão salvas.</p>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="primary" onPress={() => setExitConfirmOpen(false)}>
                    Continuar editando
                  </Button>
                  <Button
                    variant="danger"
                    onPress={() => {
                      setExitConfirmOpen(false)
                      onClose()
                    }}
                  >
                    Descartar alterações
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}
    </>
  )
}
