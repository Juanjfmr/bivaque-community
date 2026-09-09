"use client"

// Peças compartilhadas do módulo de publicação (RECON-014). Cartão, criação e
// edição consomem daqui; nada aqui conhece a UI de cada responsabilidade.

import { useEffect, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../../lib/supabase/client"

// FeedPostRow represents a single post shown in any feed. The base shape comes
// from feed_posts (no community_id, used for the now-removed city feed); when
// the post comes from feed_community, community_id is populated and the chip
// in the header is the §12 regra 2 / E4 Step 4 reach indicator.
export type FeedPostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number] & {
  community_id?: string | null
}
export type CommentRow = Database["public"]["Tables"]["comments"]["Row"]

export const POST_TYPE_LABELS: Record<string, string> = {
  text: "Texto",
  photo: "Foto",
  link: "Link",
  poll: "Enquete",
}

export const POST_TYPE_ORDER = ["text", "photo", "link", "poll"] as const

export function formatRelativeTime(iso: string): string {
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

// posts não tem coluna de título — a prancha 45 pede texto principal +
// detalhe opcional, e a única coluna de texto é `content`. O mapeamento é
// determinístico e reversível: os dois campos se juntam por uma linha em
// branco, e a edição separa na PRIMEIRA linha em branco. Conteúdo criado por
// qualquer outro caminho (sem o par em branco) sobrevive intacto; com par,
// o primeiro bloco vira o texto principal e o resto vira detalhe — regravar
// sem editar reproduz byte a byte o que estava salvo.
const CONTENT_SEPARATOR = "\n\n"

export function composePostContent(content: string, details: string): string {
  const main = content.trim()
  const extra = details.trim()
  if (!extra) return main
  if (!main) return extra
  return `${main}${CONTENT_SEPARATOR}${extra}`
}

export function splitPostContent(content: string): { content: string; details: string } {
  const index = content.indexOf(CONTENT_SEPARATOR)
  if (index === -1) return { content, details: "" }
  return {
    content: content.slice(0, index),
    details: content.slice(index + CONTENT_SEPARATOR.length),
  }
}

// Identificador estável de destino da audiência. "city" é sempre disponível;
// comunidade e grupo vêm da consulta real (feed-post-audience).
export type AudienceKey = string
export const CITY_AUDIENCE_KEY = "__city__"

export function communityAudienceKey(communityId: string): AudienceKey {
  return `community:${communityId}`
}

export function groupAudienceKey(groupId: string): AudienceKey {
  return `group:${groupId}`
}

export function parseAudienceKey(key: AudienceKey): {
  kind: "city" | "community" | "group"
  id: string | null
} {
  if (key === CITY_AUDIENCE_KEY) return { kind: "city", id: null }
  if (key.startsWith("community:")) return { kind: "community", id: key.slice(10) }
  if (key.startsWith("group:")) return { kind: "group", id: key.slice(6) }
  return { kind: "city", id: null }
}

export interface CurrentUser {
  loading: boolean
  /** null quando não autenticado OU quando a consulta falhou — em ambos os
   *  casos a UI não oferece ações de autoria (editar). */
  user: { id: string; displayName: string | null } | null
}

// Autoria vem de consulta real (auth + profiles), nunca de dado chumbado.
export function useCurrentUser(): CurrentUser {
  const [state, setState] = useState<CurrentUser>({ loading: true, user: null })

  useEffect(() => {
    let cancelled = false
    const supabase = createBrowserClient()
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setState({ loading: false, user: null })
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle()
      if (cancelled) return
      setState({
        loading: false,
        user: {
          id: user.id,
          displayName: (profile as { display_name: string | null } | null)?.display_name ?? null,
        },
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
