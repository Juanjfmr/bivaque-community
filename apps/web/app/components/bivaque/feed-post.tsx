"use client"

import { Button, Dropdown, Input, Modal, TextArea, useOverlayState } from "@heroui/react"
import {
  BadgeCheck,
  Bookmark,
  ExternalLink,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Share2,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "./avatar"
import { FeedbackAlert } from "./feedback-alert"
import { ReportButton } from "./report-button"

type FeedPostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number]
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
  isBookmarked?: boolean
  onBookmarkToggle?: ((postId: string) => void) | undefined
}

function LeanOverflowMenu({
  postId,
  onHide,
  isBookmarked = false,
  onBookmarkToggle,
}: LeanOverflowMenuProps) {
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
      } else if (key === "bookmark") {
        onBookmarkToggle?.(postId)
      } else if (key === "share") {
        void handleShare()
      }
    },
    [postId, onHide, onBookmarkToggle, handleShare],
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
          <Dropdown.Item key="bookmark" id="bookmark">
            {isBookmarked ? "Remover dos salvos" : "Salvar"}
          </Dropdown.Item>
          <Dropdown.Item key="share" id="share">
            Compartilhar
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
  isBookmarked?: boolean
  onBookmarkToggle?: (postId: string) => void
}

export function FeedPost({
  post,
  index = 0,
  onHide,
  isBookmarked = false,
  onBookmarkToggle,
}: FeedPostProps) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [commentText, setCommentText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [reactionCount, setReactionCount] = useState(Number(post.reaction_count ?? 0))
  const [myReaction, setMyReaction] = useState(Boolean(post.my_reaction))
  const [shareFeedback, setShareFeedback] = useState("")
  const supabase = createBrowserClient()

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

    const prohibitedPattern =
      /(an[ôo]nimo|v[íi]deo|marketplace|comercial|venda|compr[oa]|IA gerad[oa]|gerad[oa] por IA|intelig[êe]ncia artificial|verificado publicamente|selo de verifica[çc][ãa]o|organiza[çc][ãa]o militar|\bOM\b|patente|posto militar|gradua[çc][ãa]o militar|endere[çc]o residencial|\bCEP\b|\bCPF\b)/i

    if (prohibitedPattern.test(trimmed)) {
      setCommentError("Comentário contém termos não permitidos")
      return
    }

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
                <BadgeCheck
                  size={16}
                  className="shrink-0 text-[var(--accent)]"
                  aria-label="Membro verificado"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span>{POST_TYPE_LABELS[post.post_type] ?? post.post_type}</span>
                <span aria-hidden="true">·</span>
                <span>{formatRelativeTime(post.created_at)}</span>
              </div>
            </div>

            {/* Bookmark + overflow */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <button
                type="button"
                aria-label={isBookmarked ? "Remover dos salvos" : "Salvar publicação"}
                onClick={() => onBookmarkToggle?.(post.id)}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 ${isBookmarked ? "text-[var(--accent)]" : "text-muted"}`}
              >
                <Bookmark
                  size={18}
                  fill={isBookmarked ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
              <LeanOverflowMenu
                postId={post.id}
                onHide={onHide}
                isBookmarked={isBookmarked}
                onBookmarkToggle={onBookmarkToggle}
              />
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

interface CreatePostModalProps {
  localityId: string
  defaultPostType?: string | undefined
  onCreated: () => void
  onClose: () => void
}

export function CreatePostModal({
  localityId,
  defaultPostType,
  onCreated,
  onClose,
}: CreatePostModalProps) {
  const modal = useOverlayState({ defaultOpen: true, onOpenChange: (open) => !open && onClose() })
  const [postType, setPostType] = useState(defaultPostType ?? "text")
  const [content, setContent] = useState("")
  const [photoPath, setPhotoPath] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [pollOption, setPollOption] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const supabase = createBrowserClient()

  useEffect(() => {
    if (!modal.isOpen) {
      onClose()
    }
  }, [modal.isOpen, onClose])

  const resetForm = useCallback(() => {
    setPostType("text")
    setContent("")
    setPhotoPath("")
    setLinkUrl("")
    setPollOption("")
    setPollOptions([])
    setError("")
  }, [])

  const handleAddPollOption = useCallback(() => {
    const trimmed = pollOption.trim()
    if (trimmed && !pollOptions.includes(trimmed) && pollOptions.length < 10) {
      setPollOptions([...pollOptions, trimmed])
      setPollOption("")
    }
  }, [pollOption, pollOptions])

  const handleSubmit = useCallback(async () => {
    setError("")

    const prohibitedPattern =
      /(an[ôo]nimo|v[íi]deo|marketplace|comercial|venda|compr[oa]|IA gerad[oa]|gerad[oa] por IA|intelig[êe]ncia artificial|verificado publicamente|selo de verifica[çc][ãa]o|organiza[çc][ãa]o militar|\bOM\b|patente|posto militar|gradua[çc][ãa]o militar|endere[çc]o residencial|\bCEP\b|\bCPF\b)/i

    if (prohibitedPattern.test(content.trim())) {
      setError("Conteúdo contém termos não permitidos")
      return
    }

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

    setSubmitting(true)

    const insertData = {
      locality_id: localityId,
      post_type: postType,
      content: content.trim(),
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
              <div className="flex gap-2 overflow-x-auto">
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

              {postType === "photo" ? (
                <Input
                  aria-label="Caminho da foto"
                  placeholder="Caminho da foto (event-photos/...)"
                  value={photoPath}
                  onChange={(e) => setPhotoPath((e.target as HTMLInputElement).value)}
                  className="mt-4"
                />
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
