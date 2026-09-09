"use client"

import { Button, TextArea } from "@heroui/react"
import type { Route } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import { useActionState, useId } from "react"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"

// Estado serializável devolvido pelas Server Actions de decisão. A recusa por
// falta de operador é um estado VISÍVEL — a action não pode falar em silêncio
// (contrato RECON-010).
export interface DecisionState {
  status: "idle" | "ok" | "forbidden" | "error"
  message: string
}

export type DecisionAction = (prev: DecisionState, formData: FormData) => Promise<DecisionState>

const IDLE_STATE: DecisionState = { status: "idle", message: "" }

function ResultAlert({ state }: { state: DecisionState }) {
  if (state.status === "idle") return null
  if (state.status === "ok") {
    return (
      <FeedbackAlert variant="success" title="Registro concluído" description={state.message} />
    )
  }
  if (state.status === "forbidden") {
    return (
      <FeedbackAlert
        variant="danger"
        title="Ação recusada"
        description="Sua conta não tem permissão de operação sobre esta solicitação. Nada foi alterado."
      />
    )
  }
  return (
    <FeedbackAlert
      variant="warning"
      title="Não foi possível registrar"
      description={state.message}
    />
  )
}

function DocumentLink({ href }: { href: Route }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-[var(--semantic-surface-sunken)]"
    >
      Ver documento
    </Link>
  )
}

function ApproveForm({ action }: { action: DecisionAction }) {
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE)
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" variant="primary" className="min-h-11" isDisabled={isPending}>
        Aprovar documento
      </Button>
      <ResultAlert state={state} />
    </form>
  )
}

function ReprocessForm({ action }: { action: DecisionAction }) {
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE)
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" variant="secondary" className="min-h-11" isDisabled={isPending}>
        Reprocessar verificação
      </Button>
      <ResultAlert state={state} />
    </form>
  )
}

function RejectionForm({
  action,
  submitLabel,
  description,
}: {
  action: DecisionAction
  submitLabel: string
  description: ReactNode
}) {
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE)
  const reasonId = useId()
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label htmlFor={reasonId} className="text-sm font-medium">
        Motivo da recusa
      </label>
      <TextArea
        id={reasonId}
        name="reason"
        required
        placeholder="O que levou à recusa — a pessoa verá o resultado, não este texto"
        className="w-full"
      />
      <Button
        type="submit"
        variant="danger"
        size="sm"
        className="min-h-11 self-start px-4"
        isDisabled={isPending}
      >
        {submitLabel}
      </Button>
      <ResultAlert state={state} />
      {description}
    </form>
  )
}

export interface DecisionFormsProps {
  documentId: string | null
  documentHref: Route | null
  canReprocess: boolean
  canRejectPending: boolean
  caseClosed: boolean
  approveAction: DecisionAction
  rejectDocumentAction: DecisionAction
  reprocessAction: DecisionAction
  rejectPendingAction: DecisionAction
}

export function DecisionForms({
  documentId,
  documentHref,
  canReprocess,
  canRejectPending,
  caseClosed,
  approveAction,
  rejectDocumentAction,
  reprocessAction,
  rejectPendingAction,
}: DecisionFormsProps) {
  return (
    <>
      <section
        aria-labelledby="admission-actions-heading"
        className="rounded-xl border border-border bg-surface p-5"
      >
        <h2 id="admission-actions-heading" className="text-base font-semibold">
          Ações
        </h2>
        <div className="mt-3">
          {caseClosed ? (
            <p className="text-sm text-muted">
              Caso encerrado. Nenhuma decisão adicional pode ser registrada aqui.
            </p>
          ) : (
            <div className="flex flex-wrap items-start gap-3">
              {documentId && documentHref && <DocumentLink href={documentHref} />}
              {documentId && <ApproveForm action={approveAction} />}
              {canReprocess && <ReprocessForm action={reprocessAction} />}
            </div>
          )}
        </div>
      </section>

      {!caseClosed && (documentId || canRejectPending) && (
        <section
          aria-labelledby="admission-record-heading"
          className="rounded-xl border border-border bg-surface p-5"
        >
          <h2 id="admission-record-heading" className="text-base font-semibold">
            Registro da análise
          </h2>
          <div className="mt-3 flex flex-col gap-5">
            <p className="text-sm text-muted">
              Preencha o motivo e registre a recusa quando estiver decidido. Aprovações não exigem
              justificativa.
            </p>
            {documentId && (
              <RejectionForm
                action={rejectDocumentAction}
                submitLabel="Rejeitar documento"
                description={
                  <p className="text-xs text-muted">
                    A rejeição vale para o documento enviado; a pessoa pode enviar outro arquivo.
                  </p>
                }
              />
            )}
            {canRejectPending && (
              <RejectionForm
                action={rejectPendingAction}
                submitLabel="Rejeitar definitivamente"
                description={
                  <p className="text-xs text-muted">
                    Encerra o caso sem documento. A pessoa vê a situação na tela de status do
                    cadastro dela.
                  </p>
                }
              />
            )}
          </div>
        </section>
      )}
    </>
  )
}
