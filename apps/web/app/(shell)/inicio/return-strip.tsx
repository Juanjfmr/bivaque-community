"use client"

import { ChevronRight } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../../components/bivaque/avatar"
import {
  formatNotificationLabel,
  type NotificationRow,
  rendersWithActor,
  resolveNotificationHref,
} from "../notifications/deep-links"
import { useAvatarSrc } from "./use-avatar-src"

// RECON-002 (prancha 01): a tira de retorno abaixo do composer. Só existe com
// notificação não-lida real — sem linha legível, sem card. Consulta que falha
// é tratada como "nada a mostrar" (a caixa completa vive em /notifications;
// um teaser quebrado não tem versão honesta para mostrar).
//
// Rótulo e destino vêm do MESMO classificador da central de retorno
// (notifications/deep-links.ts), não de cópia inventada aqui: a tira e a
// caixa dizem a mesma frase sobre a mesma notificação.

type Strip = {
  id: string
  actorName: string | null
  actorId: string | null
  label: string
  subject: string | null
  href: string
  cta: string
}

function firstName(displayName: string | null): string | null {
  if (!displayName) return null
  const trimmed = displayName.trim()
  if (!trimmed) return null
  return trimmed.split(/\s+/)[0] ?? null
}

function excerpt(text: string | null, max = 72): string | null {
  if (!text) return null
  const oneLine = text.replace(/\s+/g, " ").trim()
  if (!oneLine) return null
  return oneLine.length > max ? `${oneLine.slice(0, max - 1).trimEnd()}…` : oneLine
}

// Assunto = o alvo real da notificação, lido pela RLS do próprio membro.
// Tabela sem linha correspondente (conteúdo removido, alvo de tipo sem
// assunto) → null; nenhum texto entra no lugar.
async function loadSubject(
  supabase: ReturnType<typeof createBrowserClient>,
  notification: NotificationRow,
): Promise<string | null> {
  switch (notification.type) {
    case "comment": {
      const { data } = await supabase
        .from("posts")
        .select("content")
        .eq("id", notification.target_id)
        .maybeSingle()
      return excerpt((data as { content: string } | null)?.content ?? null)
    }
    case "group_admission": {
      const { data } = await supabase
        .from("groups")
        .select("name")
        .eq("id", notification.target_id)
        .maybeSingle()
      return (data as { name: string } | null)?.name ?? null
    }
    case "event_rsvp":
    case "event_change":
    case "event_reminder": {
      const { data } = await supabase
        .from("events")
        .select("title")
        .eq("id", notification.target_id)
        .maybeSingle()
      return (data as { title: string } | null)?.title ?? null
    }
    case "recommendation_reply": {
      const { data } = await supabase
        .from("recommendation_requests")
        .select("title")
        .eq("id", notification.target_id)
        .maybeSingle()
      return (data as { title: string } | null)?.title ?? null
    }
    default:
      return null
  }
}

async function buildStrip(supabase: ReturnType<typeof createBrowserClient>): Promise<Strip | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) return null
  const row = ((data as unknown as NotificationRow[] | null) ?? [])[0]
  if (!row) return null

  let actorName: string | null = null
  if (rendersWithActor(row) && row.actor_user_id) {
    const { data: actor } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", row.actor_user_id)
      .maybeSingle()
    actorName = firstName((actor as { display_name: string } | null)?.display_name ?? null)
  }

  const subject = await loadSubject(supabase, row)
  const href = resolveNotificationHref(row, null) ?? "/notifications"
  const cta =
    row.type === "comment" || row.type === "recommendation_reply"
      ? "Ver resposta"
      : "Ver notificação"

  return {
    id: row.id,
    actorName,
    actorId: rendersWithActor(row) ? row.actor_user_id : null,
    label: formatNotificationLabel(row),
    subject,
    href,
    cta,
  }
}

export function ReturnStrip() {
  const [strip, setStrip] = useState<Strip | null>(null)
  const actorAvatarSrc = useAvatarSrc(strip?.actorId ?? null)
  const supabase = createBrowserClient()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await buildStrip(supabase)
      if (!cancelled) setStrip(result)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  if (strip === null) return null

  return (
    <div
      data-testid="return-strip"
      className="flex items-center gap-3 rounded-xl border border-border bg-[var(--accent-soft)] p-3"
    >
      {strip.actorId ? (
        <MemberAvatar
          name={strip.actorName}
          src={actorAvatarSrc}
          className="h-10 w-10 shrink-0 text-sm"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">
          {strip.actorName ? `${strip.actorName} ${strip.label}` : strip.label}
        </p>
        {strip.subject && <p className="mt-0.5 truncate text-sm text-muted">{strip.subject}</p>}
      </div>
      {/* A 375 a faixa tem de continuar sendo UMA linha de título mais UMA de
          apoio — é isso que a prancha 00 painel 2 desenha, e é o que 768 e 1440
          medem (h=70). O rótulo do CTA ocupava 127 px das 343 px da faixa e
          espremia a coluna de texto para 126 px: o título "Ana respondeu ao seu
          pedido" caía em QUATRO linhas e a faixa ia a h=125. A prancha resolve
          o mesmo aperto desenhando só o chevron no telefone — o texto do CTA
          não aparece lá. O rótulo continua no DOM (sr-only abaixo de `sm`),
          então o nome acessível não muda em nenhuma largura; `min-w-11` mantém
          o alvo em 44 px, que a régua do produto exige. */}
      <Link
        href={strip.href as Route}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg px-3 text-sm font-medium text-accent transition-colors duration-[var(--semantic-motion-duration-instant)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
      >
        <span className="sr-only sm:not-sr-only">{strip.cta}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </div>
  )
}
