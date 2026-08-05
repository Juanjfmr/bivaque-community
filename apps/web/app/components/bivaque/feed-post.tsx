"use client"

import { Button, Input, TextArea } from "@heroui/react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../../lib/supabase/client"
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
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[10px] font-medium">
        ?
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm break-words">{comment.content}</p>
        <span className="text-xs text-muted">{formatRelativeTime(comment.created_at)}</span>
      </div>
    </div>
  )
}

interface OverflowMenuProps {
  reportTargetType: "post" | "comment"
  reportTargetId: string
}

function OverflowMenu({ reportTargetType, reportTargetId }: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [reportError, setReportError] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const handleSubmitReport = useCallback(async () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setReportError("Descreva o motivo da denuncia.")
      return
    }

    setSubmitting(true)
    setReportError("")

    const { error: insertError } = await supabase.from("reports").insert({
      target_type: reportTargetType,
      target_id: reportTargetId,
      reason: trimmed,
    } as Database["public"]["Tables"]["reports"]["Insert"])

    if (insertError) {
      if (insertError.message.includes("duplicate") || insertError.code === "23505") {
        setReportError("Voce ja denunciou este conteudo.")
      } else if (insertError.message.includes("own content")) {
        setReportError("Voce nao pode denunciar seu proprio conteudo.")
      } else {
        setReportError("Nao foi possivel enviar a denuncia.")
      }
    } else {
      setSuccess(true)
      setReason("")
    }

    setSubmitting(false)
  }, [reason, reportTargetType, reportTargetId, supabase])

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="13" cy="8" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="motion-scrim-enter absolute right-0 z-40 mt-1 min-w-[160px] rounded-lg border border-border bg-[var(--surface)] py-1 shadow-[var(--elevation-2)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setShowModal(true)
            }}
            className="flex w-full min-h-11 items-center px-3 text-sm text-left transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)]"
          >
            Denunciar
          </button>
        </div>
      )}

      {showModal && (
        <div className="motion-scrim-enter fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)] p-4">
          <div className="motion-panel-enter w-full max-w-md rounded-xl border border-border bg-[var(--surface)] p-6 shadow-[var(--elevation-3)]">
            {success ? (
              <div className="text-center">
                <p className="text-sm text-accent">Denuncia enviada</p>
                <Button
                  variant="tertiary"
                  size="sm"
                  className="mt-4"
                  onPress={() => {
                    setShowModal(false)
                    setSuccess(false)
                  }}
                >
                  Fechar
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold">Denunciar conteudo</h2>
                <p className="mt-1 text-sm text-muted">
                  Descreva por que este conteudo viola as regras da comunidade.
                </p>

                <div className="mt-4">
                  <TextArea
                    aria-label="Motivo da denuncia"
                    placeholder="Descreva o motivo..."
                    value={reason}
                    onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)}
                    className="w-full"
                  />
                </div>

                {reportError && <p className="mt-2 text-sm text-[var(--danger)]">{reportError}</p>}

                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    variant="tertiary"
                    onPress={() => {
                      setShowModal(false)
                      setReason("")
                      setReportError("")
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onPress={handleSubmitReport}
                    isDisabled={submitting || !reason.trim()}
                    variant="primary"
                  >
                    {submitting ? "Enviando..." : "Enviar denuncia"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface FeedPostProps {
  post: FeedPostRow
  index?: number
}

export function FeedPost({ post, index = 0 }: FeedPostProps) {
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
      setCommentError("Comentario contem termos nao permitidos")
      return
    }

    setSubmitting(true)
    setCommentError("")

    const { error } = await supabase.from("comments").insert({
      post_id: post.id,
      content: trimmed,
    } as Database["public"]["Tables"]["comments"]["Insert"])

    if (error) {
      setCommentError("Nao foi possivel enviar o comentario")
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

  return (
    <div
      className="motion-card-enter motion-lift rounded-xl border border-border bg-[var(--surface)] p-4"
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-sm font-medium">
          {post.display_name?.charAt(0) ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{post.display_name ?? "Membro"}</span>
                <span className="text-xs text-muted">
                  {POST_TYPE_LABELS[post.post_type] ?? post.post_type} ·{" "}
                  {formatRelativeTime(post.created_at)}
                </span>
              </div>
            </div>
            <OverflowMenu reportTargetType="post" reportTargetId={post.id} />
          </div>

          <p className={`mt-1 text-sm break-words whitespace-pre-wrap ${clampedClass}`}>
            {post.content}
          </p>
          {bodyLong && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={expanded ? "Recolher publicacao" : "Expandir publicacao"}
              className="mt-1 min-h-11 text-sm font-medium transition-colors duration-[var(--duration-instant)] text-accent hover:underline"
            >
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}

          {post.post_type === "photo" && post.photo_path && (
            <div className="mt-2 rounded-md bg-[var(--surface-sunken)] p-3 text-center text-sm text-muted">
              Foto: {post.photo_path}
            </div>
          )}

          {post.post_type === "link" && post.link_url && (
            <a
              href={post.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex min-h-11 items-center truncate text-sm underline transition-colors duration-[var(--duration-instant)] text-accent"
            >
              {post.link_url}
            </a>
          )}

          {post.post_type === "poll" && post.poll_options && (
            <div className="mt-2 space-y-1">
              {(post.poll_options as unknown as string[]).map((option) => (
                <div key={option} className="rounded-md border border-border px-3 py-1.5 text-sm">
                  {option}
                </div>
              ))}
            </div>
          )}

          {/* reaction row */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleReaction}
              aria-label={myReaction ? "Descurtir publicacao" : "Curtir publicacao"}
              aria-pressed={myReaction}
              className={`flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors duration-[var(--duration-instant)] ${
                myReaction
                  ? "bg-[var(--accent-soft)] text-accent"
                  : "text-muted hover:bg-[var(--surface-subtle)]"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill={myReaction ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M8 2.5C8 1.67 7.33 1 6.5 1S5 1.67 5 2.5c0 1.5 1 2.5 2 3.5H4c-1.1 0-2 .9-2 2s.9 2 2 2h7c.55 0 1 .45 1 1s-.45 1-1 1H9.5c-.28 0-.5.22-.5.5s.22.5.5.5H11c1.1 0 2-.9 2-2s-.9-2-2-2H8c1 0 3-1 3-3s-1.5-3-3-3z" />
              </svg>
              {reactionCount > 0 && <span>{reactionCount}</span>}
              <span className={reactionCount > 0 ? "sr-only" : ""}>Curtir</span>
            </button>

            <button
              type="button"
              onClick={handleToggleComments}
              aria-label={showComments ? "Ocultar comentarios" : "Ver comentarios"}
              aria-expanded={showComments}
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M2 2h12v8H5.5L2 14V2z" />
              </svg>
              {post.comment_count > 0 ? post.comment_count : "Comentar"}
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Compartilhar publicacao"
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M6 5h4l4 4-4 4H6M2 5l4 4-4 4" />
              </svg>
              Compartilhar
            </button>

            {shareFeedback && (
              <span aria-live="polite" className="text-xs text-accent">
                {shareFeedback}
              </span>
            )}
          </div>

          {/* comment preview + inline reply */}
          {previewComments.length > 0 && !showComments && (
            <div className="mt-2 border-t border-border pt-2">
              {previewComments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}
              {comments.length > 2 && (
                <button
                  type="button"
                  onClick={handleToggleComments}
                  aria-label={`Ver todos os ${comments.length} comentarios`}
                  className="min-h-11 text-xs text-muted hover:underline"
                >
                  Ver todos os comentarios
                </button>
              )}
            </div>
          )}

          {(!showComments || comments.length > 0) && (
            <div className="mt-2 flex min-w-0 gap-2">
              <Input
                aria-label="Comentario"
                placeholder="Escreva um comentario..."
                value={commentText}
                onChange={(e) => setCommentText((e.target as HTMLInputElement).value)}
                className="min-w-0 flex-1"
              />
              <Button
                size="sm"
                variant="primary"
                onPress={handleAddComment}
                isDisabled={submitting || !commentText.trim()}
                aria-label="Enviar comentario"
              >
                Enviar
              </Button>
            </div>
          )}

          {commentError && <p className="mt-1 text-xs text-[var(--danger)]">{commentError}</p>}

          {showComments && (
            <div className="mt-2 border-t border-border pt-2">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 py-1.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[10px] font-medium">
                    ?
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm break-words">{c.content}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{formatRelativeTime(c.created_at)}</span>
                      <ReportButton targetType="comment" targetId={c.id} label="Denunciar" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
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
  const [postType, setPostType] = useState(defaultPostType ?? "text")
  const [content, setContent] = useState("")
  const [photoPath, setPhotoPath] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [pollOption, setPollOption] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const supabase = createBrowserClient()

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
      setError("Conteudo contem termos nao permitidos")
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
      setError("Enquete requer pelo menos 2 opcoes")
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
      setError("Nao foi possivel criar a publicacao")
    } else {
      resetForm()
      onCreated()
      onClose()
    }

    setSubmitting(false)
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
    onClose,
  ])

  return (
    <div className="motion-scrim-enter fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)] p-4">
      <div className="motion-panel-enter w-full max-w-lg rounded-xl border border-border bg-[var(--surface)] p-6 shadow-[var(--elevation-3)]">
        <h2 className="text-lg font-semibold">Criar publicacao</h2>

        <div className="mt-4 space-y-4">
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

          {postType === "photo" && (
            <Input
              aria-label="Caminho da foto"
              placeholder="Caminho da foto (event-photos/...)"
              value={photoPath}
              onChange={(e) => setPhotoPath((e.target as HTMLInputElement).value)}
            />
          )}

          {postType === "link" && (
            <Input
              aria-label="URL"
              placeholder="URL (https://...)"
              value={linkUrl}
              onChange={(e) => setLinkUrl((e.target as HTMLInputElement).value)}
            />
          )}

          <TextArea
            aria-label="Conteudo"
            placeholder={
              postType === "poll" ? "Pergunta da enquete..." : "O que voce quer compartilhar?"
            }
            value={content}
            onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
          />

          {postType === "poll" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  aria-label="Opcao da enquete"
                  placeholder="Adicionar opcao"
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
              {pollOptions.length > 0 && (
                <ul className="space-y-1">
                  {pollOptions.map((opt) => (
                    <li key={opt} className="flex items-center gap-2 text-sm">
                      <span className="flex-1">{opt}</span>
                      <Button
                        size="sm"
                        variant="tertiary"
                        onPress={() => setPollOptions(pollOptions.filter((item) => item !== opt))}
                      >
                        x
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="tertiary"
            onPress={() => {
              resetForm()
              onClose()
            }}
          >
            Cancelar
          </Button>
          <Button
            onPress={handleSubmit}
            isDisabled={submitting || !content.trim()}
            variant="primary"
          >
            Publicar
          </Button>
        </div>
      </div>
    </div>
  )
}
