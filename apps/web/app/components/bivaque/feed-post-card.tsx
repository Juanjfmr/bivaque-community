"use client"

// Cartão de publicação (prancha 45, coluna direita "como será vista" é o
// estado publicado deste cartão). Comentários, reação e compartilhamento
// vivem aqui; o menu transbordante tem arquivo próprio, criação e edição
// idem. Este componente não emite h1 — a tela consumidora tem o dela.

import { Button, Chip, Input, useOverlayState } from "@heroui/react"
import {
  Bookmark,
  ExternalLink,
  Heart,
  ImageIcon,
  Link2,
  MessageCircle,
  Share2,
} from "lucide-react"
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

// Ações do rodapé: discretas, uma altura, o ícone carrega o sentido.
const FOOTER_ACTION =
  "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-ui px-2 text-sm font-medium text-ui-ink-2 transition-colors hover:bg-ui-subtle hover:text-ui-ink"

function CommentItem({ comment }: { comment: CommentRow }) {
  return (
    <div className="flex gap-2 py-1.5">
      <MemberAvatar name="?" size="sm" className="h-6 w-6 shrink-0 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="text-sm break-words text-ui-ink">{comment.content}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ui-ink-2">{formatRelativeTime(comment.created_at)}</span>
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

  const replyCount = Number(shown.comment_count ?? 0)

  return (
    <article className="motion-card-enter rounded-ui-lg border border-ui-line bg-ui-surface shadow-ui transition-shadow duration-200 hover:shadow-ui-hover">
      <div className="p-4 sm:p-5">
        <header className="flex items-start gap-3">
          <MemberAvatar
            name={shown.display_name}
            src={shown.user_id ? `/api/avatar/${shown.user_id}` : null}
            className="h-10 w-10 shrink-0 text-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ui-ink">
              {shown.display_name ?? "Membro"}
            </p>
            {/* Tempo relativo e, quando o alcance não é a comunidade, o chip que
                diz o tamanho do público (regra 2 da §12): post de cidade e post
                de grupo falam para públicos muito diferentes. */}
            <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-ui-ink-2">
              <span>{formatRelativeTime(shown.created_at)}</span>
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
          </div>
          <div className="-mt-1 -mr-2 flex shrink-0 items-center">
            <LeanOverflowMenu
              postId={post.id}
              onHide={onHide}
              onReport={reportModal.open}
              onEdit={isOwnPost ? () => setEditOpen(true) : undefined}
            />
            <ReportButton targetType="post" targetId={post.id} externalState={reportModal} />
          </div>
        </header>

        <p
          className={`mt-3 text-base leading-relaxed break-words whitespace-pre-wrap text-ui-ink ${clampedClass}`}
        >
          {shown.content}
        </p>
        {bodyLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? "Recolher publicação" : "Expandir publicação"}
            className="-ml-2 inline-flex min-h-11 items-center rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
          >
            {expanded ? "Ver menos" : "Ver mais"}
          </button>
        )}

        {shown.post_type === "photo" && shown.photo_path && (
          <div className="mt-3 flex items-center gap-2 rounded-ui bg-ui-subtle px-3 py-3 text-sm text-ui-ink-2">
            <ImageIcon size={18} className="shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Foto: {shown.photo_path}</span>
          </div>
        )}

        {shown.post_type === "link" && shown.link_url && (
          <a
            href={shown.link_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir link: ${linkHostname}`}
            className="mt-3 flex min-h-11 items-center gap-3 rounded-ui border border-ui-line px-3 py-2 transition-colors hover:bg-ui-subtle"
          >
            <Link2 className="h-5 w-5 shrink-0 text-ui-brand" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-ui-ink-2">
                {linkHostname || shown.link_url}
              </span>
              <span className="block truncate text-sm text-ui-ink">{shown.link_url}</span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-ui-ink-2" aria-hidden="true" />
          </a>
        )}

        {/* Sem bloco de enquete: o produto não tem enquete (prancha 44). */}
      </div>

      {/* Rodapé único (prancha 01): responder e curtir à esquerda, compartilhar
          e acompanhar à direita. O campo de resposta abre por "Responder" em vez
          de ocupar todo cartão o tempo todo. */}
      <footer className="flex items-center gap-1 border-t border-ui-line px-2 py-1 sm:px-3">
        <button
          type="button"
          onClick={handleToggleComments}
          aria-expanded={showComments}
          className={FOOTER_ACTION}
        >
          <MessageCircle size={18} aria-hidden="true" />
          {replyCount > 0
            ? `${replyCount} ${replyCount === 1 ? "resposta" : "respostas"}`
            : "Responder"}
        </button>
        <button
          type="button"
          onClick={handleReaction}
          aria-label={myReaction ? "Descurtir publicação" : "Curtir publicação"}
          aria-pressed={myReaction}
          className={`${FOOTER_ACTION} ${myReaction ? "text-ui-brand" : ""}`}
        >
          <Heart size={18} fill={myReaction ? "currentColor" : "none"} aria-hidden="true" />
          {reactionCount > 0 ? <span>{reactionCount}</span> : null}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleShare}
          aria-label="Compartilhar publicação"
          className={FOOTER_ACTION}
        >
          <Share2 size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleFollow}
          aria-pressed={following}
          aria-label={following ? "Deixar de acompanhar publicação" : "Acompanhar publicação"}
          className={`${FOOTER_ACTION} ${following ? "text-ui-brand" : ""}`}
        >
          <Bookmark size={18} fill={following ? "currentColor" : "none"} aria-hidden="true" />
          <span className="hidden sm:inline">{following ? "Acompanhando" : "Acompanhar"}</span>
        </button>
      </footer>

      {shareFeedback && (
        <p aria-live="polite" className="px-4 pb-2 text-xs text-ui-brand">
          {shareFeedback}
        </p>
      )}

      {previewComments.length > 0 && !showComments && (
        <div className="border-t border-ui-line px-4 py-2">
          {previewComments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </div>
      )}

      {showComments && (
        <div className="space-y-2 rounded-b-ui-lg border-t border-ui-line bg-ui-bg px-4 py-3 sm:px-5">
          {comments.length === 0 && (
            <p className="text-sm text-ui-ink-2">Nenhuma resposta ainda.</p>
          )}
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
          <div className="flex min-w-0 gap-2">
            <Input
              aria-label="Comentário"
              placeholder="Escreva uma resposta…"
              value={commentText}
              onChange={(e) => setCommentText((e.target as HTMLInputElement).value)}
              className="min-w-0 flex-1"
            />
            <Button
              variant="primary"
              onPress={handleAddComment}
              isDisabled={submitting || !commentText.trim()}
              aria-label="Enviar comentário"
            >
              Enviar
            </Button>
          </div>
          {commentError && <FeedbackAlert variant="danger" description={commentError} />}
        </div>
      )}

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
