import { CheckCircle2, MessageCircle } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import {
  categoryLabel,
  type IndicationRow,
  indicationHref,
  indicationStatus,
  relativeAge,
  STATUS_LABELS,
} from "../../../lib/indications/indications"

// Um pedido na memória da cidade. O que importa ler de relance é a pergunta e,
// quando existe, a resposta que resolveu — é ela que evita perguntar de novo.
// Sem resposta marcada, a busca mostra a resposta que casou com o termo.

const STATUS_STYLE = {
  resolvido: "bg-ui-brand-soft text-ui-brand",
  respondido: "bg-ui-subtle text-ui-ink",
  sem_resposta: "bg-ui-subtle text-ui-ink-2",
} as const

export function IndicationItem({
  row,
  now,
  compact = false,
}: {
  row: IndicationRow
  now: Date
  compact?: boolean
}) {
  const status = indicationStatus(row)
  const answer = row.resolved_reply_body ?? row.matched_reply_body
  const meta = [categoryLabel(row.category), relativeAge(row.created_at, now), row.group_name]
    .filter(Boolean)
    .join(" · ")

  return (
    <Link
      href={indicationHref(row.id) as Route}
      className={`block rounded-ui-lg bg-ui-surface ring-1 ring-ui-line transition-colors hover:bg-ui-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-brand ${
        compact ? "px-3 py-2.5" : "p-4 shadow-ui"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs text-ui-ink-2">{meta}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>
      <p
        className={`mt-1 font-semibold text-ui-ink ${compact ? "line-clamp-1 text-sm" : "line-clamp-2"}`}
      >
        {row.title}
      </p>
      {answer ? (
        <p className="mt-2 flex gap-2 text-sm text-ui-ink-2">
          {row.resolved_reply_body ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ui-brand" aria-hidden="true" />
          ) : (
            <MessageCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          <span className={compact ? "line-clamp-1" : "line-clamp-2"}>
            {row.resolved_reply_body ? (
              <span className="sr-only">Resposta que resolveu: </span>
            ) : null}
            {answer}
          </span>
        </p>
      ) : null}
      {compact ? null : (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ui-ink-2">
          <MessageCircle size={14} aria-hidden="true" />
          {row.reply_count === 0
            ? "Ninguém respondeu ainda"
            : `${row.reply_count} ${row.reply_count === 1 ? "resposta" : "respostas"}`}
        </p>
      )}
    </Link>
  )
}
