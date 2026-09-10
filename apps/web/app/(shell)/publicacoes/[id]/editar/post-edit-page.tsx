"use client"

// "Editar publicação" — painel direito da prancha 45. O público fica travado
// com o cadeado e o aviso da prancha; a pessoa corrige texto e foto. Sair com
// alteração não salva abre o diálogo com "Continuar editando" como ação
// principal — descartar nunca é silencioso. A RLS posts_update_own é a palavra
// final sobre quem pode gravar.

import { Button, Input, Modal, Spinner, TextArea, useOverlayState } from "@heroui/react"
import { Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { Database } from "supabase/database.generated"
import { classifyPublishError } from "../../../../../lib/composer/publish-error"
import { createBrowserClient } from "../../../../../lib/supabase/client"
import { AccessUnavailableState } from "../../../../components/bivaque/empty-state"
import { ConnectionLostState } from "../../../../components/bivaque/error-state"
import {
  DestinationIcon,
  usePostDestinationLabel,
} from "../../../../components/bivaque/feed-post-audience"
import { PhotoField } from "../../../../components/bivaque/feed-post-photo"
import { PostPreview } from "../../../../components/bivaque/feed-post-preview"
import {
  CITY_AUDIENCE_KEY,
  composePostContent,
  splitPostContent,
  useCurrentUser,
} from "../../../../components/bivaque/feed-post-shared"
import { FeedbackAlert } from "../../../../components/bivaque/feedback-alert"
import { Skeleton } from "../../../../components/bivaque/skeleton"
import { showToast } from "../../../../components/bivaque/toast"

// A página lê a linha de `posts` direto — o autor pode reler a própria
// publicação pela RLS de leitura; não é a linha achatada do RPC feed_posts.
interface PostRow {
  id: string
  user_id: string
  locality_id: string
  community_id: string | null
  group_id: string | null
  post_type: string
  content: string
  photo_path: string | null
}

const QUESTION_MAX = 120
const BODY_MAX = 1000

type LoadState =
  | { status: "loading" }
  | { status: "network-error" }
  | { status: "not-found" }
  | { status: "ready"; post: PostRow }

export function PostEditPage({ postId }: { postId: string }) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const currentUser = useCurrentUser()
  const [load, setLoad] = useState<LoadState>({ status: "loading" })
  const [reloadToken, setReloadToken] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadToken` é o gatilho da nova tentativa do "Tentar novamente" — o corpo não o lê de propósito
  useEffect(() => {
    let cancelled = false
    setLoad({ status: "loading" })
    ;(async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setLoad({ status: "network-error" })
        return
      }
      if (!data) {
        setLoad({ status: "not-found" })
        return
      }
      setLoad({ status: "ready", post: data as PostRow })
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, postId, reloadToken])

  if (load.status === "loading") {
    return (
      <div className="flex flex-col gap-4 px-4 py-8" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (load.status === "network-error") {
    return (
      <div className="px-4 py-8">
        <ConnectionLostState
          description="Não foi possível abrir esta publicação por falta de conexão. Verifique a internet e tente de novo."
          onRetry={() => setReloadToken((t) => t + 1)}
        />
      </div>
    )
  }
  if (load.status === "not-found") {
    return (
      <div className="px-4 py-8">
        <AccessUnavailableState
          title="Esta publicação não está disponível para você."
          description="Ela pode ter sido removida, ou o alcance não inclui a sua conta. Verifique o link e tente novamente."
          secondaryAction={
            <Button variant="secondary" onPress={() => router.push("/inicio")}>
              Voltar
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <PostEditForm
      post={load.post}
      currentUserId={currentUser.user?.id ?? null}
      authorName={currentUser.user?.displayName ?? null}
      onSaved={() => {
        showToast({
          title: "Alterações salvas",
          description: "A publicação foi atualizada para quem já podia vê-la.",
          variant: "success",
        })
        router.push("/inicio")
        router.refresh()
      }}
    />
  )
}

function PostEditForm({
  post,
  currentUserId,
  authorName,
  onSaved,
}: {
  post: PostRow
  currentUserId: string | null
  authorName: string | null
  onSaved: () => void
}) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const initial = useMemo(() => splitPostContent(post.content ?? ""), [post.content])
  const [question, setQuestion] = useState(initial.content)
  const [details, setDetails] = useState(initial.details)
  const [photoPath, setPhotoPath] = useState(post.photo_path ?? "")
  const [photoError, setPhotoError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [baseline, setBaseline] = useState({
    content: post.content ?? "",
    photoPath: post.photo_path ?? "",
  })
  const exitDialog = useOverlayState()

  const destination = usePostDestinationLabel(
    post.locality_id,
    post.community_id ?? null,
    post.group_id ?? null,
  )
  const composed = composePostContent(question, details)
  const isDirty = composed !== baseline.content || photoPath !== baseline.photoPath
  const isAuthor = currentUserId !== null && post.user_id === currentUserId

  const requestExit = useCallback(() => {
    if (isDirty) {
      exitDialog.open()
    } else {
      router.back()
    }
  }, [isDirty, exitDialog, router])

  const handleSave = useCallback(async () => {
    if (!question.trim()) {
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
    onSaved()
  }, [question, composed, photoPath, post.id, post.post_type, supabase, onSaved])

  if (currentUserId === null) {
    return (
      <div className="px-4 py-8">
        <ConnectionLostState
          description="Sua sessão ainda está carregando. Recarregue quando ela voltar."
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }
  if (!isAuthor) {
    return (
      <div className="px-4 py-8">
        <AccessUnavailableState
          title="Só quem publicou pode editar esta publicação."
          description="O conteúdo continua visível para quem tem acesso — mas a edição é do autor."
          secondaryAction={
            <Button variant="secondary" onPress={() => router.push("/inicio")}>
              Voltar
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={requestExit}
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
        <h1 className="text-2xl font-semibold tracking-tight">Editar publicação</h1>
      </div>

      {saveError ? (
        <div data-testid="edit-save-error">
          <FeedbackAlert variant="warning" description={saveError} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-1 text-sm font-medium">
              {post.community_id ? "Para qual comunidade você está perguntando?" : "Quem pode ver?"}
            </p>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-[var(--semantic-surface-sunken)] px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2">
                {destination.loading ? (
                  <span className="text-sm text-muted">Carregando destino…</span>
                ) : destination.name ? (
                  <>
                    <DestinationIcon
                      kind={post.community_id ? "community" : post.group_id ? "group" : "city"}
                    />
                    <span className="truncate text-sm">{destination.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted">Não foi possível carregar o destino.</span>
                )}
              </span>
              <Lock size={16} aria-hidden="true" className="shrink-0 text-muted" />
            </div>
            <p className="mt-1 text-xs text-muted">
              {post.community_id
                ? "Você não pode alterar a comunidade desta publicação."
                : "Você não pode alterar o destino desta publicação."}
            </p>
          </div>

          <div>
            <label htmlFor="edit-pergunta" className="mb-1 block text-sm font-medium">
              Qual é a sua pergunta? <span aria-hidden="true">*</span>
              <span className="sr-only"> (obrigatório)</span>
            </label>
            <Input
              id="edit-pergunta"
              required
              aria-required="true"
              maxLength={QUESTION_MAX}
              value={question}
              onChange={(e) => {
                setQuestion((e.target as HTMLInputElement).value)
                setSaveError("")
              }}
            />
            <p className="mt-1 text-right text-xs text-muted" aria-live="polite">
              {question.length}/{QUESTION_MAX}
            </p>
          </div>

          <div>
            <label htmlFor="edit-duvida" className="mb-1 block text-sm font-medium">
              Conte mais sobre sua dúvida (opcional)
            </label>
            <TextArea
              id="edit-duvida"
              maxLength={BODY_MAX}
              rows={4}
              value={details}
              onChange={(e) => setDetails((e.target as HTMLTextAreaElement).value)}
            />
            <p className="mt-1 text-right text-xs text-muted" aria-live="polite">
              {details.length}/{BODY_MAX}
            </p>
          </div>

          {post.post_type === "photo" ? (
            <div>
              <p className="mb-1 text-sm font-medium">Adicionar foto (opcional)</p>
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

          <div className="flex justify-end">
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
          </div>
        </div>
        <div className="hidden lg:block">
          <PostPreview
            destination={{
              key: post.community_id
                ? `community:${post.community_id}`
                : post.group_id
                  ? `group:${post.group_id}`
                  : CITY_AUDIENCE_KEY,
              kind: post.community_id ? "community" : post.group_id ? "group" : "city",
              name: destination.name ?? "Destino da publicação",
              description: post.community_id
                ? "Membros do Bivaque nesta comunidade"
                : post.group_id
                  ? "Membros do Bivaque neste grupo"
                  : "Membros do Bivaque nesta cidade",
            }}
            destinationLoading={destination.loading}
            authorName={authorName}
            authorLoading={false}
            content={composed}
            placeName={
              destination.name?.startsWith("Toda a cidade · ")
                ? destination.name.slice("Toda a cidade · ".length)
                : (destination.name ?? null)
            }
          />
        </div>
      </div>

      <Modal isOpen={exitDialog.isOpen} onOpenChange={(next) => !next && exitDialog.close()}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Sair sem salvar?</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm">Se sair agora, as alterações feitas não serão salvas.</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="primary" onPress={exitDialog.close}>
                  Continuar editando
                </Button>
                <Button
                  variant="danger"
                  onPress={() => {
                    exitDialog.close()
                    router.back()
                  }}
                >
                  Descartar alterações
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}
