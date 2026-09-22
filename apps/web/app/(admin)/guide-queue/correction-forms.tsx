"use client"

import { Button } from "@heroui/react"
import { useActionState, useId } from "react"
import type { GuideCorrectionQueueItem } from "../../../lib/guide/guide-article"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import {
  applyCorrectionAction,
  type CorrectionDecisionState,
  rejectCorrectionAction,
} from "./correction-actions"

const IDLE: CorrectionDecisionState = { status: "idle", message: "" }

function DecisionAlert({ state }: { state: CorrectionDecisionState }) {
  if (state.status === "ok") {
    return (
      <FeedbackAlert variant="success" title="Decisão registrada" description={state.message} />
    )
  }
  if (state.status === "forbidden") {
    return (
      <FeedbackAlert
        variant="danger"
        title="Ação recusada"
        description="Sua conta não tem permissão de operação sobre esta sugestão. Nada foi alterado."
      />
    )
  }
  if (state.status === "error") {
    return (
      <FeedbackAlert
        variant="warning"
        title="Não foi possível registrar"
        description={state.message}
      />
    )
  }
  return null
}

export function CorrectionDecisionForms({ item }: { item: GuideCorrectionQueueItem }) {
  const [applyState, applyAction, applyPending] = useActionState(applyCorrectionAction, IDLE)
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectCorrectionAction, IDLE)
  const decisionNoteId = useId()
  const bodyId = useId()
  const titleId = useId()
  const rejectNoteId = useId()
  const boundToSection = item.request.sectionId !== null

  return (
    <article className="flex flex-col gap-4 rounded-md border border-border p-4">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted">
            {item.sectionTitle ? `Seção: ${item.sectionTitle}` : "Todo o guia"}
          </span>
          <span className="text-xs text-muted">por {item.requesterName}</span>
          <span className="text-xs text-muted">Protocolo {item.request.id.slice(0, 8)}</span>
        </div>
        <p className="text-sm font-semibold">{item.articleTitle}</p>
        <p className="text-sm text-[var(--semantic-text-primary)]">{item.request.description}</p>
        {item.request.reference ? (
          <p className="text-xs text-muted">Referência: {item.request.reference}</p>
        ) : null}
      </header>

      <form action={applyAction} className="flex flex-col gap-3">
        <input type="hidden" name="requestId" value={item.request.id} />
        <input type="hidden" name="entryId" value={item.articleEntryId} />

        {boundToSection ? (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor={titleId} className="text-xs font-medium">
                Título da seção
              </label>
              <input
                id={titleId}
                name="sectionTitle"
                defaultValue={item.sectionTitle ?? ""}
                className="min-h-11 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={bodyId} className="text-xs font-medium">
                Texto publicado
              </label>
              <textarea
                id={bodyId}
                name="sectionBody"
                required
                defaultValue={item.sectionBody ?? ""}
                className="min-h-32 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor={bodyId} className="text-xs font-medium">
              Resumo publicado
            </label>
            <textarea
              id={bodyId}
              name="summary"
              defaultValue={item.articleSummary ?? ""}
              className="min-h-24 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor={decisionNoteId} className="text-xs font-medium">
            Nota da decisão (opcional)
          </label>
          <textarea
            id={decisionNoteId}
            name="note"
            className="min-h-16 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
          />
        </div>

        <DecisionAlert state={applyState} />

        <div>
          <Button type="submit" size="sm" variant="primary" isDisabled={applyPending}>
            {applyPending ? "Aplicando…" : "Aplicar correção"}
          </Button>
        </div>
      </form>

      <form action={rejectAction} className="flex flex-col gap-3 border-t border-border pt-3">
        <input type="hidden" name="requestId" value={item.request.id} />
        <input type="hidden" name="entryId" value={item.articleEntryId} />
        <div className="flex flex-col gap-1">
          <label htmlFor={rejectNoteId} className="text-xs font-medium">
            Justificativa da rejeição <span aria-hidden="true">*</span>
            <span className="sr-only"> (obrigatória)</span>
          </label>
          <textarea
            id={rejectNoteId}
            name="note"
            required
            className="min-h-16 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
          />
        </div>

        <DecisionAlert state={rejectState} />

        <div>
          <Button type="submit" size="sm" variant="tertiary" isDisabled={rejectPending}>
            {rejectPending ? "Recusando…" : "Recusar"}
          </Button>
        </div>
      </form>
    </article>
  )
}
