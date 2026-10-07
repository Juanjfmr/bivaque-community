"use client"

import { Button, TextArea } from "@heroui/react"
import { useActionState, useId } from "react"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"

// Restauração auditada de anúncio ocultado (ADR-20261006). Existe porque
// ocultar e restaurar são decisões separadas: encerrar a denúncia não devolve o
// anúncio, e só a operação pode devolver. A justificativa é humana e obrigatória,
// e o id do anúncio chega pelo fechamento da página — nunca pelo formulário.

export interface RestoreState {
  status: "idle" | "ok" | "unchanged" | "forbidden" | "error"
  message: string
}

export type RestoreAction = (prev: RestoreState, formData: FormData) => Promise<RestoreState>

const IDLE: RestoreState = { status: "idle", message: "" }

export function ListingRestoreForm({ action }: { action: RestoreAction }) {
  const [state, formAction, isPending] = useActionState(action, IDLE)
  const justificativaId = useId()

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={justificativaId} className="text-sm font-medium">
          Justificativa da restauração <span aria-hidden="true">*</span>
          <span className="sr-only"> (obrigatória)</span>
        </label>
        <TextArea
          id={justificativaId}
          name="justificativa"
          required
          aria-required="true"
          aria-describedby={`${justificativaId}-help`}
          disabled={isPending}
          className="w-full"
        />
        <p id={`${justificativaId}-help`} role="note" className="text-xs text-muted">
          A restauração devolve o anúncio para quem tem acesso a ele. A situação e o público do
          anúncio não mudam, e a decisão fica registrada na trilha de moderação.
        </p>
      </div>

      {state.status === "ok" && (
        <FeedbackAlert variant="success" title="Anúncio restaurado" description={state.message} />
      )}
      {state.status === "unchanged" && (
        <FeedbackAlert variant="info" title="Nada a restaurar" description={state.message} />
      )}
      {state.status === "forbidden" && (
        <FeedbackAlert
          variant="danger"
          title="Ação recusada"
          description="Sua conta não tem permissão de operação sobre este anúncio. Nada foi alterado."
        />
      )}
      {state.status === "error" && (
        <FeedbackAlert
          variant="warning"
          title="Não foi possível restaurar"
          description={state.message}
        />
      )}

      <div>
        <Button type="submit" variant="primary" className="min-h-11" isDisabled={isPending}>
          {isPending ? "Restaurando…" : "Restaurar anúncio"}
        </Button>
      </div>
    </form>
  )
}
