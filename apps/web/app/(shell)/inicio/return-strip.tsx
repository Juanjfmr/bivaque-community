"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
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

// Até três retornos não lidos, do mais recente para o mais antigo. Cada um é
// montado pelo mesmo classificador da central de notificações.
const MAX_STRIPS = 3

async function buildOne(
  supabase: ReturnType<typeof createBrowserClient>,
  row: NotificationRow,
): Promise<Strip> {
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

async function buildStrips(supabase: ReturnType<typeof createBrowserClient>): Promise<Strip[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(MAX_STRIPS)

  if (error) return []
  const rows = (data as unknown as NotificationRow[] | null) ?? []
  return Promise.all(rows.map((row) => buildOne(supabase, row)))
}

// "Para você agora": os retornos empilhados e recolhidos (referência: as
// notificações agrupadas do iOS). Recolhida, a pilha mostra o primeiro retorno
// e a borda dos outros por baixo; "Ver mais N" abre a lista. Sem retorno
// legível, nada é desenhado — a Home não ganha bloco vazio.
export function ReturnStrip() {
  const [strips, setStrips] = useState<Strip[]>([])
  const [expanded, setExpanded] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await buildStrips(supabase)
      if (!cancelled) setStrips(result)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const strip = strips[0] ?? null
  if (strip === null) return null
  const rest = strips.slice(1)

  return (
    <section aria-label="Para você agora" className="space-y-2">
      <div className="relative isolate">
        <StripCard strip={strip} />
        {!expanded && rest.length > 0 ? (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-x-3 -bottom-1.5 -z-10 h-4 rounded-b-ui-lg bg-ui-brand-soft/70"
            />
            {rest.length > 1 ? (
              <div
                aria-hidden="true"
                className="absolute inset-x-6 -bottom-3 -z-20 h-4 rounded-b-ui-lg bg-ui-brand-soft/40"
              />
            ) : null}
          </>
        ) : null}
      </div>
      {expanded ? rest.map((item) => <StripCard key={item.id} strip={item} />) : null}
      {rest.length > 0 ? (
        <div className={`flex justify-center ${expanded ? "" : "pt-2"}`}>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
          >
            {expanded ? "Mostrar menos" : `Ver mais ${rest.length}`}
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      ) : null}
    </section>
  )
}

function StripCard({ strip }: { strip: Strip }) {
  const actorAvatarSrc = useAvatarSrc(strip.actorId ?? null)

  return (
    <div
      data-testid="return-strip"
      className="motion-card-enter flex items-center gap-3 rounded-ui-lg bg-ui-brand-soft py-3 pr-2 pl-3 sm:pl-4"
    >
      {strip.actorId ? (
        <MemberAvatar
          name={strip.actorName}
          src={actorAvatarSrc}
          className="h-10 w-10 shrink-0 text-sm"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-semibold text-ui-ink">
          {strip.actorName ? `${strip.actorName} ${strip.label}` : strip.label}
        </p>
        {strip.subject && <p className="mt-0.5 truncate text-sm text-ui-ink-2">{strip.subject}</p>}
      </div>
      {/* No telefone só o chevron aparece; o rótulo continua no DOM (sr-only
          abaixo de `sm`), então o nome acessível não muda em nenhuma largura, e
          `min-w-11` mantém o alvo em 44 px. Com o rótulo visível a 375 a coluna
          de texto caía para 126 px e o título quebrava em quatro linhas. */}
      <Link
        href={strip.href as Route}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-ui px-3 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
      >
        <span className="sr-only sm:not-sr-only">{strip.cta}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </div>
  )
}
