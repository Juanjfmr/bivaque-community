"use client"

// Cartão de publicação (prancha 45, coluna direita "como será vista" é o
// estado publicado deste cartão). Comentários, reação e compartilhamento
// vivem aqui; o menu transbordante tem arquivo próprio, criação e edição
// idem. Este componente não emite h1 — a tela consumidora tem o dela.

import { Button, Chip, Input, useOverlayState } from "@heroui/react"
import { Bookmark, ExternalLink, Heart, Link2, MessageCircle, Share2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "./avatar"
import { EditPostModal } from "./feed-post-edit"
import { LeanOverflowMenu } from "./feed-post-menu"
import {
  type CommentRow,
  cityNameOnce,
  currentUserIdOnce,
  type FeedPostRow,
  formatRelativeTime,
} from "./feed-post-shared"
import { FeedbackAlert } from "./feedback-alert"
import { ReportButton } from "./report-button"

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

export interface FeedPostProps {
  post: FeedPostRow
  /** aceito para compatibilidade com as consumidoras atuais; o cartão não
   *  aplica atraso de entrada por índice — style inline é proibido */
  index?: number
  onHide?: (postId: string) => void
}

export function FeedPost({ post, onHide }: FeedPostProps) {
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
  // "Acompanhar" (prancha 01): o estado vem do próprio feed (my_follow,
  // revalidado no servidor) e alterna direto na tabela post_follows — mesma
  // mecânica da reação; erro reverte o estado otimista.
  const [following, setFollowing] = useState(Boolean(post.my_follow))
  const [shareFeedback, setShareFeedback] = useState("")
  const [localityName, setLocalityName] = useState<string>("")
  const [groupName, setGroupName] = useState<string>("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  // Depois de um UPDATE aceito, o cartão mostra o texto gravado sem esperar
  // o feed recarregar; nada aqui reescreve o post no servidor por trás da UI.
  const [edited, setEdited] = useState<{ content: string; photoPath: string | null } | null>(null)
  const supabase = createBrowserClient()

  const shown: FeedPostRow = edited
    ? { ...post, content: edited.content, photo_path: edited.photoPath ?? "" }
    : post

  // Uma requisição para todos os cartões: ver currentUserIdOnce.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const id = await currentUserIdOnce()
      if (!cancelled) setCurrentUserId(id)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // City-reach post (community_id IS NULL) precisa de um chip com o nome da
  // cidade — sem ele, a pessoa responde algo de vizinhança achando que fala
  // para 500 pessoas quando fala para milhares (regra 2 da §12). O nome vem
  // da locality do post, nunca de constante. Um post de grupo tem alcance
  // ainda menor e também precisa de chip próprio.
  // Uma consulta por cidade para o feed inteiro: ver cityNameOnce.
  useEffect(() => {
    if (post.community_id !== null || post.group_id) return
    let cancelled = false
    ;(async () => {
      const name = await cityNameOnce(post.locality_id)
      if (!cancelled) setLocalityName(name)
    })()
    return () => {
      cancelled = true
    }
  }, [post.locality_id, post.community_id, post.group_id])

  useEffect(() => {
    if (!post.group_id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from("groups")
        .select("name")
        .eq("id", post.group_id)
        .maybeSingle()
      if (cancelled) return
      setGroupName((data as { name: string } | null)?.name ?? "")
    })()
    return () => {
      cancelled = true
    }
  }, [post.group_id, supabase])

  const bodyLong = (shown.content ?? "").length > 280
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

  const handleFollow = useCallback(async () => {
    const next = !following
    setFollowing(next)
    const { error } = next
      ? await supabase.from("post_follows").insert({
          post_id: post.id,
        } as Database["public"]["Tables"]["post_follows"]["Insert"])
      : await supabase.from("post_follows").delete().eq("post_id", post.id)
    if (error) setFollowing(!next)
  }, [following, post.id, supabase])

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
    if (!shown.link_url) return ""
    try {
      return new URL(shown.link_url).hostname
    } catch {
      return ""
    }
  })()

  const isOwnPost = Boolean(currentUserId && post.user_id === currentUserId)

  return (
    <article className="motion-card-enter motion-lift rounded-2xl border border-border bg-[var(--semantic-surface)] shadow-[var(--semantic-elevation-raised)] overflow-hidden">
      <div className="flex">
        {/* Left accent rail */}
        <div className="w-0.5 shrink-0 bg-[var(--semantic-action-primary)] opacity-75 rounded-full my-3 ml-3" />

        <div className="flex-1 min-w-0 p-4 pl-3">
          {/* Header row */}
          <div className="flex items-center gap-3">
            <MemberAvatar
              name={shown.display_name}
              src={shown.user_id ? `/api/avatar/${shown.user_id}` : null}
              className="h-9 w-9 text-sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate">
                  {shown.display_name ?? "Membro"}
                </span>
                {/* Onda E Task 4 Step 4: chip de alcance. Post de cidade e post
                    de grupo têm públicos de tamanhos muito diferentes — dizer
                    "cidade inteira" num post de grupo é a mentira de alcance
                    que a regra 2 da §12 proíbe. */}
                {shown.community_id === null && shown.group_id ? (
                  <Chip size="sm" variant="soft" aria-label="Alcance: só o grupo">
                    {groupName || "Grupo"}
                  </Chip>
                ) : shown.community_id === null ? (
                  <Chip
                    size="sm"
                    variant="soft"
                    aria-label={`Alcance: ${localityName || "cidade"} inteira`}
                  >
                    {localityName ? `${localityName} inteira` : "Cidade inteira"}
                  </Chip>
                ) : null}
              </div>
              {/* As publicações são perguntas e indicações (prancha 44, painel
                  1): o formato não é metadado do cartão. "Texto"/"Foto"/"Link"
                  descrevem como o registro foi montado, não o que a pessoa
                  quis fazer — e "Enquete" não existe no produto. Fica só o
                  tempo relativo. */}
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span>{formatRelativeTime(shown.created_at)}</span>
              </div>
            </div>

            {/* Overflow */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <LeanOverflowMenu
                postId={post.id}
                onHide={onHide}
                onReport={reportModal.open}
                onEdit={isOwnPost ? () => setEditOpen(true) : undefined}
              />
              <ReportButton targetType="post" targetId={post.id} externalState={reportModal} />
            </div>
          </div>

          {/* Content */}
          <p
            className={`mt-3 text-sm break-words whitespace-pre-wrap leading-relaxed ${clampedClass}`}
          >
            {shown.content}
          </p>
          {bodyLong && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={expanded ? "Recolher publicação" : "Expandir publicação"}
              className="mt-2 inline-flex min-h-11 items-center rounded-full bg-[var(--semantic-selected)] px-3 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] text-accent hover:bg-[var(--semantic-surface-sunken)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
            >
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}

          {/* Photo */}
          {shown.post_type === "photo" && shown.photo_path && (
            <div className="mt-3 rounded-lg bg-[var(--semantic-surface-sunken)] p-4 text-center">
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
                <span className="text-xs">Foto: {shown.photo_path}</span>
              </div>
            </div>
          )}

          {/* Rich link preview */}
          {shown.post_type === "link" && shown.link_url && (
            <a
              href={shown.link_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir link: ${linkHostname}`}
              className="mt-3 block min-h-11"
            >
              <div className="flex items-center gap-3 rounded-lg border border-border bg-[var(--semantic-surface-sunken)]/60 p-3 transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)]">
                <Link2 className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted">{linkHostname || shown.link_url}</p>
                  <p className="truncate text-sm">{shown.link_url}</p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              </div>
            </a>
          )}

          {/* Sem bloco de enquete: o produto não tem enquete (prancha 44,
              painel 1), nenhum caminho grava `poll_options` e `public.posts`
              tem zero linhas com `post_type='poll'` — não há dado legado a
              preservar. Foto e link continuam renderizando abaixo, porque são
              anexos reais de uma pergunta. */}

          {/* Rodapé de conversa da prancha 01: a contagem de respostas à
              esquerda e "Acompanhar" à direita, acima da barra de engajamento
              (mantida por adjudicação). O estado do follow vem do feed
              (my_follow) e reverte em erro. */}
          <div className="mt-3 flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={handleToggleComments}
              aria-label={showComments ? "Ocultar respostas" : "Ver respostas"}
              aria-expanded={showComments}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-medium text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
            >
              <MessageCircle size={16} aria-hidden="true" />
              {Number(shown.comment_count ?? 0) > 0
                ? `${shown.comment_count} ${Number(shown.comment_count) === 1 ? "resposta" : "respostas"}`
                : "Sem respostas"}
            </button>
            <button
              type="button"
              onClick={handleFollow}
              aria-pressed={following}
              aria-label={following ? "Deixar de acompanhar publicação" : "Acompanhar publicação"}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] ${following ? "text-[var(--semantic-action-primary)]" : "text-muted"}`}
            >
              <Bookmark size={16} fill={following ? "currentColor" : "none"} aria-hidden="true" />
              {following ? "Acompanhando" : "Acompanhar"}
            </button>
          </div>

          {/* Reaction row — three-zone footer with dividers */}
          <div className="mt-4 flex items-stretch divide-x divide-border border-t border-border">
            <button
              type="button"
              onClick={handleReaction}
              aria-label={myReaction ? "Descurtir publicação" : "Curtir publicação"}
              aria-pressed={myReaction}
              className={`flex flex-1 min-h-11 items-center justify-center gap-1.5 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--semantic-focus)] ${myReaction ? "text-[var(--semantic-action-primary)]" : "text-muted"}`}
            >
              <Heart
                size={18}
                fill={myReaction ? "currentColor" : "none"}
                className={myReaction ? "text-[var(--semantic-action-primary)]" : ""}
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
              className="flex flex-1 min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--semantic-focus)]"
            >
              <MessageCircle size={18} aria-hidden="true" />
              {shown.comment_count > 0 ? shown.comment_count : "Comentar"}
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Compartilhar publicação"
              className="flex flex-1 min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--semantic-focus)]"
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
                  className="min-h-11 text-xs text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:underline"
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

      {editOpen ? (
        <EditPostModal
          post={post}
          onClose={() => setEditOpen(false)}
          onSaved={(content, photoPath) => setEdited({ content, photoPath })}
        />
      ) : null}
    </article>
  )
}
