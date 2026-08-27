"use client"

import { detectCep, detectCpf } from "@bivaque/domain"
import {
  Button,
  Chip,
  Dropdown,
  Input,
  ListBox,
  Modal,
  Select,
  TextArea,
  useOverlayState,
} from "@heroui/react"
import { ExternalLink, Heart, Link2, MessageCircle, MoreHorizontal, Share2 } from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "./avatar"
import { FeedbackAlert } from "./feedback-alert"
import { ReportButton } from "./report-button"

// FeedPostRow represents a single post shown in any feed. The base shape comes
// from feed_posts (no community_id, used for the now-removed city feed); when
// the post comes from feed_community, community_id is populated and the chip
// in the header is the §12 regra 2 / E4 Step 4 reach indicator.
type FeedPostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number] & {
  community_id?: string | null
}
type CommentRow = Database["public"]["Tables"]["comments"]["Row"]

const POST_TYPE_LABELS: Record<string, string> = {
  text: "Texto",
  photo: "Foto",
  link: "Link",
  poll: "Enquete",
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} d`
  return new Date(iso).toLocaleDateString("pt-BR")
}

function CommentItem({ comment }: { comment: CommentRow }) {
  return (
    <div className="flex gap-2 py-1.5">
      <MemberAvatar name="?" size="sm" className="h-5 w-5 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="text-sm break-words">{comment.content}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{formatRelativeTime(comment.created_at)}</span>
          <ReportButton targetType="comment" targetId={comment.id} label="Denunciar" />
        </div>
      </div>
    </div>
  )
}

interface LeanOverflowMenuProps {
  postId: string
  onHide?: ((postId: string) => void) | undefined
  onReport?: (() => void) | undefined
}

function LeanOverflowMenu({ postId, onHide, onReport }: LeanOverflowMenuProps) {
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/community?post=${postId}`
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Bivaque", url })
      } catch {
        try {
          await navigator.clipboard.writeText(url)
        } catch {
          /* noop */
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        /* noop */
      }
    }
  }, [postId])

  const handleAction = useCallback(
    (key: React.KeyboardEvent | React.MouseEvent | string | number) => {
      if (key === "hide") {
        onHide?.(postId)
      } else if (key === "share") {
        void handleShare()
      } else if (key === "report") {
        onReport?.()
      }
    },
    [postId, onHide, onReport, handleShare],
  )

  return (
    <Dropdown>
      <Dropdown.Trigger aria-label="Abrir menu da publicacao">
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          aria-label="Mais opcoes"
          className="rounded-full min-h-11 min-w-11"
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label="Ações da publicação" onAction={handleAction}>
          <Dropdown.Item key="hide" id="hide">
            Ocultar publicação
          </Dropdown.Item>
          <Dropdown.Item key="share" id="share">
            Compartilhar
          </Dropdown.Item>
          {/* F160: o post e o alvo central do fluxo de moderacao e era o unico
              sem acao de denuncia — o comentario tinha, o post nao. O menu e o
              lugar certo: um "Denunciar" visivel em cada card do feed convida
              ao uso e polui a leitura. */}
          <Dropdown.Item key="report" id="report">
            Denunciar publicação
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}

export interface FeedPostProps {
  post: FeedPostRow
  index?: number
  onHide?: (postId: string) => void
}

export function FeedPost({ post, index = 0, onHide }: FeedPostProps) {
  // O modal de denuncia do post vive aqui, e nao dentro do menu: o menu fecha
  // ao escolher o item, e um modal montado dentro dele fecharia junto.
  const reportModal = useOverlayState()
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [commentText, setCommentText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [reactionCount, setReactionCount] = useState(Number(post.reaction_count ?? 0))
  const [myReaction, setMyReaction] = useState(Boolean(post.my_reaction))
  const [shareFeedback, setShareFeedback] = useState("")
  const [localityName, setLocalityName] = useState<string>("")
  const supabase = createBrowserClient()

  // City-reach post (community_id IS NULL) precisa de um chip com o nome da
  // cidade — sem ele, a pessoa responde algo de vizinhança achando que fala
  // para 500 pessoas quando fala para milhares (regra 2 da §12). O nome vem
  // da locality do post, nunca de constante.
  useEffect(() => {
    if (post.community_id !== null) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from("localities")
        .select("city_name")
        .eq("id", post.locality_id)
        .maybeSingle()
      if (cancelled) return
      setLocalityName((data as { city_name: string } | null)?.city_name ?? "")
    })()
    return () => {
      cancelled = true
    }
  }, [post.locality_id, post.community_id, supabase])

  const bodyLong = (post.content ?? "").length > 280
  const clampedClass = expanded ? "" : "line-clamp-4"

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
    if (data) setComments(data as unknown as CommentRow[])
  }, [post.id, supabase])

  const handleToggleComments = useCallback(async () => {
    const next = !showComments
    setShowComments(next)
    if (next && comments.length === 0) {
      await loadComments()
    }
  }, [showComments, comments.length, loadComments])

  const handleAddComment = useCallback(async () => {
    const trimmed = commentText.trim()
    if (!trimmed) return

    setSubmitting(true)
    setCommentError("")

    const { error } = await supabase.from("comments").insert({
      post_id: post.id,
      content: trimmed,
    } as Database["public"]["Tables"]["comments"]["Insert"])

    if (error) {
      setCommentError("Não foi possível enviar o comentário")
    } else {
      setCommentText("")
      await loadComments()
    }

    setSubmitting(false)
  }, [commentText, post.id, supabase, loadComments])

  const handleReaction = useCallback(async () => {
    const prevReactionCount = reactionCount
    const prevMyReaction = myReaction

    if (myReaction) {
      setMyReaction(false)
      setReactionCount(prevReactionCount - 1)

      const { error } = await supabase.from("post_reactions").delete().eq("post_id", post.id)

      if (error) {
        setMyReaction(prevMyReaction)
        setReactionCount(prevReactionCount)
      }
    } else {
      setMyReaction(true)
      setReactionCount(prevReactionCount + 1)

      const { error } = await supabase
        .from("post_reactions")
        .insert({ post_id: post.id } as Database["public"]["Tables"]["post_reactions"]["Insert"])

      if (error) {
        setMyReaction(prevMyReaction)
        setReactionCount(prevReactionCount)
      }
    }
  }, [myReaction, reactionCount, post.id, supabase])

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/community?post=${post.id}`)
      setShareFeedback("Link copiado")
      setTimeout(() => setShareFeedback(""), 2000)
    } catch {
      setShareFeedback("Erro ao copiar")
      setTimeout(() => setShareFeedback(""), 2000)
    }
  }, [post.id])

  const previewComments = comments.slice(-2)

  const linkHostname = (() => {
    if (!post.link_url) return ""
    try {
      return new URL(post.link_url).hostname
    } catch {
      return ""
    }
  })()

  return (
    <article
      className="motion-card-enter motion-lift rounded-2xl border border-border bg-[var(--surface)] shadow-[var(--elevation-2)] overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
    >
      <div className="flex">
        {/* Left accent rail */}
        <div className="w-0.5 shrink-0 bg-[var(--accent)] opacity-75 rounded-full my-3 ml-3" />

        <div className="flex-1 min-w-0 p-4 pl-3">
          {/* Header row */}
          <div className="flex items-center gap-3">
            <MemberAvatar
              name={post.display_name}
              src={post.user_id ? `/api/avatar/${post.user_id}` : null}
              className="h-9 w-9 text-sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate">
                  {post.display_name ?? "Membro"}
                </span>
                {/* Onda E Task 4 Step 4: chip de alcance para posts city-reach. */}
                {post.community_id === null ? (
                  <Chip size="sm" variant="soft" aria-label={`Alcance: ${localityName} inteira`}>
                    {localityName ? `${localityName} inteira` : "Cidade inteira"}
                  </Chip>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span>{POST_TYPE_LABELS[post.post_type] ?? post.post_type}</span>
                <span aria-hidden="true">·</span>
                <span>{formatRelativeTime(post.created_at)}</span>
              </div>
            </div>

            {/* Overflow */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <LeanOverflowMenu postId={post.id} onHide={onHide} onReport={reportModal.open} />
              <ReportButton targetType="post" targetId={post.id} externalState={reportModal} />
            </div>
          </div>

          {/* Content */}
          <p
            className={`mt-3 text-sm break-words whitespace-pre-wrap leading-relaxed ${clampedClass}`}
          >
            {post.content}
          </p>
          {bodyLong && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={expanded ? "Recolher publicação" : "Expandir publicação"}
              className="mt-2 inline-flex min-h-11 items-center rounded-full bg-[var(--surface-subtle)] px-3 text-sm font-medium transition-colors duration-[var(--duration-instant)] text-accent hover:bg-[var(--surface-sunken)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
            >
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}

          {/* Photo placeholder */}
          {post.post_type === "photo" && post.photo_path && (
            <div className="mt-3 rounded-lg bg-[var(--surface-sunken)] p-4 text-center">
              <div className="flex flex-col items-center gap-2 text-muted">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-xs">Foto: {post.photo_path}</span>
              </div>
            </div>
          )}

          {/* Rich link preview */}
          {post.post_type === "link" && post.link_url && (
            <a
              href={post.link_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir link: ${linkHostname}`}
              className="mt-3 block min-h-11"
            >
              <div className="flex items-center gap-3 rounded-lg border border-border bg-[var(--surface-sunken)]/60 p-3 transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)]">
                <Link2 className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted">{linkHostname || post.link_url}</p>
                  <p className="truncate text-sm">{post.link_url}</p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              </div>
            </a>
          )}

          {/* Poll */}
          {post.post_type === "poll" && post.poll_options && (
            <div className="mt-3 space-y-1.5">
              {(post.poll_options as unknown as string[]).map((option, i) => (
                <div
                  key={option}
                  className="flex items-center gap-2.5 rounded-lg bg-[var(--surface-sunken)] px-3 py-2.5 text-sm"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs text-muted">
                    {i + 1}
                  </span>
                  <span>{option}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reaction row — three-zone footer with dividers */}
          <div className="mt-4 flex items-stretch divide-x divide-border border-t border-border">
            <button
              type="button"
              onClick={handleReaction}
              aria-label={myReaction ? "Descurtir publicação" : "Curtir publicação"}
              aria-pressed={myReaction}
              className={`flex flex-1 min-h-11 items-center justify-center gap-1.5 text-sm font-medium transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)] ${myReaction ? "text-[var(--accent)]" : "text-muted"}`}
            >
              <Heart
                size={18}
                fill={myReaction ? "currentColor" : "none"}
                className={myReaction ? "text-[var(--accent)]" : ""}
                aria-hidden="true"
              />
              {reactionCount > 0 && <span>{reactionCount}</span>}
              <span className={reactionCount > 0 ? "sr-only" : ""}>Curtir</span>
            </button>

            <button
              type="button"
              onClick={handleToggleComments}
              aria-label={showComments ? "Ocultar comentários" : "Ver comentários"}
              aria-expanded={showComments}
              className="flex flex-1 min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-muted transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]"
            >
              <MessageCircle size={18} aria-hidden="true" />
              {post.comment_count > 0 ? post.comment_count : "Comentar"}
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Compartilhar publicação"
              className="flex flex-1 min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-muted transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]"
            >
              <Share2 size={18} aria-hidden="true" />
              Compartilhar
            </button>
          </div>

          {shareFeedback && (
            <p aria-live="polite" className="mt-1 text-xs text-accent text-center">
              {shareFeedback}
            </p>
          )}

          {/* Comment preview */}
          {previewComments.length > 0 && !showComments && (
            <div className="mt-2 border-t border-border pt-2">
              {previewComments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}
              {comments.length > 2 && (
                <button
                  type="button"
                  onClick={handleToggleComments}
                  aria-label={`Ver todos os ${comments.length} comentários`}
                  className="min-h-11 text-xs text-muted transition-colors duration-[var(--duration-instant)] hover:underline"
                >
                  Ver todos os comentários
                </button>
              )}
            </div>
          )}

          {/* Inline comment field */}
          {(!showComments || comments.length > 0) && (
            <div className="mt-2 flex min-w-0 gap-2">
              <Input
                aria-label="Comentário"
                placeholder="Escreva um comentário..."
                value={commentText}
                onChange={(e) => setCommentText((e.target as HTMLInputElement).value)}
                className="min-w-0 flex-1"
              />
              <Button
                size="sm"
                variant="primary"
                onPress={handleAddComment}
                isDisabled={submitting || !commentText.trim()}
                aria-label="Enviar comentário"
              >
                Enviar
              </Button>
            </div>
          )}

          {commentError && (
            <div className="mt-1">
              <FeedbackAlert variant="danger" description={commentError} />
            </div>
          )}

          {/* Expanded comments */}
          {showComments && (
            <div className="mt-2 border-t border-border pt-2">
              {comments.length === 0 && (
                <p className="py-2 text-center text-xs text-muted">Nenhum comentário ainda.</p>
              )}
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

type CommunityOption = { id: string; name: string }

interface CreatePostModalProps {
  localityId: string
  defaultPostType?: string | undefined
  defaultCommunityId?: string | undefined
  onCreated: () => void
  onClose: () => void
}

export function CreatePostModal({
  localityId,
  defaultPostType,
  defaultCommunityId,
  onCreated,
  onClose,
}: CreatePostModalProps) {
  const modal = useOverlayState({ defaultOpen: true, onOpenChange: (open) => !open && onClose() })
  const { current: locality } = useLocalityContext()
  const [postType, setPostType] = useState(defaultPostType ?? "text")
  const [content, setContent] = useState("")
  const [photoPath, setPhotoPath] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [pollOption, setPollOption] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [piiWarning, setPiiWarning] = useState(false)
  const [communityId, setCommunityId] = useState<string | null>(defaultCommunityId ?? null)
  const [availableCommunities, setAvailableCommunities] = useState<CommunityOption[]>([])
  const dialogContentRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient()

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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled || !user) return

      const { data: membershipsData } = await supabase
        .from("community_memberships")
        .select("community_id")
        .eq("user_id", user.id)
        .eq("status", "approved")

      const communityIds = ((membershipsData as { community_id: string }[] | null) ?? []).map(
        (membership) => membership.community_id,
      )
      if (cancelled || communityIds.length === 0) return

      const { data: communitiesData } = await supabase
        .from("communities")
        .select("id, name")
        .in("id", communityIds)

      if (cancelled) return
      setAvailableCommunities(
        ((communitiesData as { id: string; name: string }[] | null) ?? []).map((community) => ({
          id: community.id,
          name: community.name,
        })),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const resetForm = useCallback(() => {
    setPostType("text")
    setContent("")
    setPhotoPath("")
    setLinkUrl("")
    setPollOption("")
    setPollOptions([])
    setError("")
    setPiiWarning(false)
    // PRIVACY (Step 3 da onda E): depois de publicar na vila, o seletor
    // CONTINUA na vila. Zerar para null fazia o segundo post da sessão sair
    // para a cidade inteira sem a pessoa ter escolhido — exatamente o
    // vazamento por desatenção que o plano mandou evitar.
    setCommunityId(defaultCommunityId ?? null)
  }, [defaultCommunityId])

  const handleAddPollOption = useCallback(() => {
    const trimmed = pollOption.trim()
    if (trimmed && !pollOptions.includes(trimmed) && pollOptions.length < 10) {
      setPollOptions([...pollOptions, trimmed])
      setPollOption("")
    }
  }, [pollOption, pollOptions])

  const handleSubmit = useCallback(async () => {
    setError("")

    if (postType === "photo" && !photoPath.trim()) {
      setError("Foto requer o caminho da imagem")
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

    if (!piiWarning && (detectCpf(content.trim()) || detectCep(content.trim()))) {
      setPiiWarning(true)
      return
    }

    setSubmitting(true)

    const insertData = {
      locality_id: localityId,
      post_type: postType,
      content: content.trim(),
      community_id: communityId,
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
      setError("Não foi possível criar a publicação")
      setSubmitting(false)
      return
    }

    resetForm()
    onCreated()
    modal.close()
  }, [
    postType,
    content,
    photoPath,
    linkUrl,
    pollOptions,
    communityId,
    piiWarning,
    localityId,
    supabase,
    resetForm,
    onCreated,
    modal,
  ])

  const handleCancel = useCallback(() => {
    resetForm()
    modal.close()
  }, [resetForm, modal])

  return (
    <Modal state={modal}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Criar publicação</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <div ref={dialogContentRef} className="flex gap-2 overflow-x-auto">
                {(["text", "photo", "link", "poll"] as const).map((type) => (
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

              <div className="mt-4">
                <label htmlFor="post-audience" className="mb-1 block text-sm font-medium">
                  Audiência
                </label>
                <Select
                  aria-label="Audiência da publicação"
                  id="post-audience"
                  selectedKey={communityId ?? "__city__"}
                  onSelectionChange={(key) => {
                    if (key === "__city__") {
                      setCommunityId(null)
                    } else if (typeof key === "string") {
                      setCommunityId(key)
                    }
                  }}
                  className="w-full"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {/* "Cidade inteira" — community_id IS NULL. O nome da cidade
                          vem da locality do membro (NUNCA um literal hardcoded
                          como "Manaus" — P0). */}
                      <ListBox.Item key="__city__" id="__city__">
                        {locality.cityName} inteira
                      </ListBox.Item>
                      {availableCommunities.map((community) => (
                        <ListBox.Item key={community.id} id={community.id}>
                          Só a {community.name}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                {/* Aviso de audiência — a diferença entre um campo de formulário
                    e um aviso sobre quem vai ler (regra 2 da §12). */}
                <p
                  aria-live="polite"
                  className="mt-2 text-xs text-muted"
                  data-testid="audience-notice"
                >
                  {communityId
                    ? `Só os aprovados desta vila vão ler.`
                    : `Toda ${locality.cityName} — todos os membros verificados da cidade vão ler.`}
                </p>
              </div>

              {postType === "photo" ? (
                <div className="mt-4 space-y-2">
                  {/* F9 Step 1: real photo upload with EXIF stripping via canvas.
                      The browser automatically strips EXIF when drawing to canvas
                      and exporting. */}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Selecionar foto"
                    onChange={async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (!file) return
                      // Strip EXIF by drawing to canvas and re-exporting.
                      const img = new Image()
                      img.onload = async () => {
                        const canvas = document.createElement("canvas")
                        canvas.width = img.width
                        canvas.height = img.height
                        const ctx = canvas.getContext("2d")
                        if (!ctx) return
                        ctx.drawImage(img, 0, 0)
                        canvas.toBlob(
                          async (blob) => {
                            if (!blob) return
                            const formData = new FormData()
                            formData.append("photo", blob, file.name)
                            try {
                              const { uploadPostPhotoAction } = await import(
                                "../../(shell)/events/upload-photo-action"
                              )
                              const result = await uploadPostPhotoAction(formData)
                              setPhotoPath(result.photoPath)
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Erro ao enviar foto")
                            }
                          },
                          file.type,
                          0.92,
                        )
                      }
                      img.src = URL.createObjectURL(file)
                    }}
                    className="block w-full text-sm text-muted file:mr-4 file:rounded-md file:border-0 file:bg-[var(--surface-subtle)] file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-[var(--surface)]"
                  />
                  {photoPath && <p className="text-xs text-muted">Foto carregada: {photoPath}</p>}
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

              <TextArea
                aria-label="Conteúdo"
                placeholder={
                  postType === "poll" ? "Pergunta da enquete..." : "O que você quer compartilhar?"
                }
                value={content}
                onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
                className="mt-4"
              />

              {postType === "poll" ? (
                <div className="mt-4 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      aria-label="Opção da enquete"
                      placeholder="Adicionar opção"
                      value={pollOption}
                      onChange={(e) => setPollOption((e.target as HTMLInputElement).value)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddPollOption()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button size="sm" variant="tertiary" onPress={handleAddPollOption}>
                      Adicionar
                    </Button>
                  </div>
                  {pollOptions.length > 0 ? (
                    <ul className="space-y-1">
                      {pollOptions.map((opt) => (
                        <li key={opt} className="flex items-center gap-2 text-sm">
                          <span className="flex-1">{opt}</span>
                          <Button
                            size="sm"
                            variant="tertiary"
                            onPress={() =>
                              setPollOptions(pollOptions.filter((item) => item !== opt))
                            }
                          >
                            x
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <div className="mt-4">
                  <FeedbackAlert variant="danger" description={error} />
                </div>
              ) : null}
              {piiWarning ? (
                <div className="mt-4">
                  <FeedbackAlert
                    variant="warning"
                    description="Isso parece um CPF ou CEP. Quer mesmo publicar?"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="primary" onPress={handleSubmit}>
                      Publicar mesmo
                    </Button>
                    <Button size="sm" variant="tertiary" onPress={() => setPiiWarning(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={handleCancel}>
                Cancelar
              </Button>
              <Button
                onPress={handleSubmit}
                isDisabled={submitting || !content.trim()}
                variant="primary"
              >
                Publicar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
