"use client"

// RECON-029 (prancha 67, painéis "Pedir mais informações" e "Sua pergunta"):
// o compositor do fio. Na falha o alerta aparece e o TEXTO PERMANECE no campo,
// com "Tentar novamente" (primário) e "Voltar ao evento" (secundário). O envio
// em andamento desabilita o botão — nunca duplica.

import { Button, TextArea } from "@heroui/react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  canSendQuestion,
  QUESTION_SEND_FAILURE_COPY,
} from "../../../../../lib/events/question-thread"
import { FeedbackAlert } from "../../../../components/bivaque/feedback-alert"
import { askQuestionAction, replyQuestionAction } from "./actions"

interface QuestionComposerProps {
  mode: "ask" | "reply"
  eventId: string
  conversationId?: string
  backHref: string
  disabled?: boolean
  disabledReason?: string
}

export function QuestionComposer({
  mode,
  eventId,
  conversationId,
  backHref,
  disabled = false,
  disabledReason,
}: QuestionComposerProps) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [failure, setFailure] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isAsk = mode === "ask"
  const fieldId = isAsk ? "sua-pergunta" : "responder-pergunta"
  const label = isAsk ? "Sua pergunta" : "Responder sobre este evento"
  const submitLabel = isAsk ? (failure ? "Tentar novamente" : "Enviar pergunta") : "Enviar"

  async function handleSubmit() {
    if (submitting || !canSendQuestion(text)) return
    setSubmitting(true)
    setFailure(null)

    const formData = new FormData()
    formData.set("eventId", eventId)
    formData.set("content", text)
    if (conversationId) formData.set("conversationId", conversationId)

    const result = isAsk ? await askQuestionAction(formData) : await replyQuestionAction(formData)

    if (result.ok) {
      setText("")
      setSubmitting(false)
      router.refresh()
      return
    }

    // Mantém o texto: a copy e o próprio campo preservado são o contrato da prancha.
    setFailure(result.message || QUESTION_SEND_FAILURE_COPY)
    setSubmitting(false)
  }

  if (disabled) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          {disabledReason ?? "Não é possível enviar mensagens sobre este evento agora."}
        </p>
        <Link
          href={backHref as Route}
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
        >
          Voltar ao evento
        </Link>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
    >
      {failure ? (
        <FeedbackAlert variant="warning" description={failure} className="w-full" />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {label}
        </label>
        <TextArea
          id={fieldId}
          value={text}
          maxLength={2000}
          rows={isAsk ? 4 : 3}
          onChange={(event) => setText((event.target as HTMLTextAreaElement).value)}
          placeholder={isAsk ? "Escreva sua dúvida para quem organiza" : "Escreva sua resposta"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          className="min-h-11"
          isDisabled={submitting || !canSendQuestion(text)}
        >
          {submitting ? "Enviando…" : submitLabel}
        </Button>
        <Link
          href={backHref as Route}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
        >
          Voltar ao evento
        </Link>
      </div>
    </form>
  )
}
