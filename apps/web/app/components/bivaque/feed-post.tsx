"use client"

import { brandTokens } from "@bivaque/tokens"
import { Button, Input, TextArea } from "@heroui/react"
import { useCallback, useState } from "react"
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
    <div className="flex gap-2 py-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--foreground)_12%,transparent)] text-xs font-medium">
        ?
      </div>
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

export function FeedPost({ post }: { post: FeedPostRow }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [commentText, setCommentText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState("")
  const supabase = createBrowserClient()

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
      setCommentError(error.message)
    } else {
      setCommentText("")
      await loadComments()
    }

    setSubmitting(false)
  }, [commentText, post.id, supabase, loadComments])

  return (
    <div className="rounded-xl border border-[color-mix(in_oklch,var(--foreground)_8%,transparent)] bg-[var(--surface)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--foreground)_12%,transparent)] text-sm font-medium">
          {post.display_name?.charAt(0) ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">{post.display_name ?? "Membro"}</span>
            <span className="text-xs text-muted">
              {POST_TYPE_LABELS[post.post_type] ?? post.post_type} ·{" "}
              {formatRelativeTime(post.created_at)}
            </span>
          </div>

          <p className="mt-1 text-sm break-words whitespace-pre-wrap">{post.content}</p>

          {post.post_type === "photo" && post.photo_path && (
            <div className="mt-2 rounded-md bg-[color-mix(in_oklch,var(--foreground)_4%,transparent)] p-3 text-center text-sm text-muted">
              Foto: {post.photo_path}
            </div>
          )}

          {post.post_type === "link" && post.link_url && (
            <a
              href={post.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block truncate text-sm underline"
              style={{ color: brandTokens.color.accent }}
            >
              {post.link_url}
            </a>
          )}

          {post.post_type === "poll" && post.poll_options && (
            <div className="mt-2 space-y-1">
              {(post.poll_options as unknown as string[]).map((option) => (
                <div
                  key={option}
                  className="rounded-md border border-[color-mix(in_oklch,var(--foreground)_12%,transparent)] px-3 py-1.5 text-sm"
                >
                  {option}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-3">
            <Button variant="tertiary" size="sm" onPress={handleToggleComments}>
              {post.comment_count > 0 ? `${post.comment_count} comentarios` : "Comentar"}
            </Button>
            <ReportButton targetType="post" targetId={post.id} label="Denunciar" />
          </div>

          {showComments && (
            <div className="mt-2 border-t border-[color-mix(in_oklch,var(--foreground)_8%,transparent)] pt-2">
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}

              <div className="mt-2 flex gap-2">
                <Input
                  aria-label="Comentario"
                  placeholder="Escreva um comentario..."
                  value={commentText}
                  onChange={(e) => setCommentText((e.target as HTMLInputElement).value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onPress={handleAddComment}
                  isDisabled={submitting || !commentText.trim()}
                  style={{
                    backgroundColor: brandTokens.color.accent,
                    color: brandTokens.color.accentForeground,
                  }}
                >
                  Enviar
                </Button>
              </div>
              {commentError && <p className="mt-1 text-xs text-red-500">{commentError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface CreatePostModalProps {
  localityId: string
  onCreated: () => void
  onClose: () => void
}

export function CreatePostModal({ localityId, onCreated, onClose }: CreatePostModalProps) {
  const [postType, setPostType] = useState("text")
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

    const extras: Record<string, unknown> = {}
    if (postType === "photo" && photoPath.trim()) {
      extras["photo_path"] = photoPath.trim()
    }
    if (postType === "link" && linkUrl.trim()) {
      extras["link_url"] = linkUrl.trim()
    }
    if (postType === "poll" && pollOptions.length >= 2) {
      extras["poll_options"] = pollOptions
    }

    const { error: insertError } = await supabase
      .from("posts")
      .insert({ ...insertData, ...extras } as Database["public"]["Tables"]["posts"]["Insert"])

    if (insertError) {
      setError(insertError.message)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[color-mix(in_oklch,var(--foreground)_12%,transparent)] bg-[var(--surface)] p-6 shadow-lg">
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

          {error && <p className="text-sm text-red-500">{error}</p>}
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
            style={{
              backgroundColor: brandTokens.color.accent,
              color: brandTokens.color.accentForeground,
            }}
          >
            Publicar
          </Button>
        </div>
      </div>
    </div>
  )
}
