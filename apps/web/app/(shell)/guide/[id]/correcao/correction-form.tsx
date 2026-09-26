"use client"

import { Button } from "@heroui/react"
import { useActionState, useEffect, useId, useState } from "react"
import { FeedbackAlert } from "../../../../components/bivaque/feedback-alert"
import { type CorrectionFormState, submitGuideCorrectionAction } from "./actions"

const INITIAL_STATE: CorrectionFormState = {
  status: "idle",
  message: "",
  receivedDescription: "",
  receivedReference: null,
  protocol: null,
}

export interface CorrectionSectionOption {
  id: string
  title: string
}

export function CorrectionForm({
  articleId,
  entryId,
  sections,
}: {
  articleId: string
  entryId: string
  sections: CorrectionSectionOption[]
}) {
  const [state, formAction, isPending] = useActionState(submitGuideCorrectionAction, INITIAL_STATE)
  const [sectionId, setSectionId] = useState("")
  const [description, setDescription] = useState("")
  const [reference, setReference] = useState("")
  const descriptionId = useId()
  const referenceId = useId()
  const sectionFieldId = useId()

  useEffect(() => {
    if (state.status === "ok") {
      setDescription("")
      setReference("")
      setSectionId("")
    }
  }, [state.status])

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="articleId" value={articleId} />
      <input type="hidden" name="entryId" value={entryId} />

      {state.status === "ok" && (
        <FeedbackAlert
          variant="success"
          title="Sugestão recebida"
          description={
            <span className="flex flex-col gap-1">
              <span>{state.message}</span>
              {state.protocol ? <span>Protocolo {state.protocol}.</span> : null}
              <span className="text-xs">
                Recebemos: “{state.receivedDescription}”
                {state.receivedReference ? ` — referência: ${state.receivedReference}` : ""}
              </span>
            </span>
          }
        />
      )}
      {state.status === "error" && (
        <FeedbackAlert
          variant="warning"
          title="Não foi possível enviar"
          description={state.message}
        />
      )}

      {sections.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor={sectionFieldId} className="text-sm font-medium">
            Seção do guia (opcional)
          </label>
          <select
            id={sectionFieldId}
            name="sectionId"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            disabled={isPending}
            className="min-h-11 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
          >
            <option value="">Todo o guia</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={descriptionId} className="text-sm font-medium">
          O que precisa mudar? <span aria-hidden="true">*</span>
          <span className="sr-only"> (obrigatório)</span>
        </label>
        <textarea
          id={descriptionId}
          name="description"
          required
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isPending}
          aria-required="true"
          aria-describedby={`${descriptionId}-help`}
          className="min-h-32 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
        />
        <p id={`${descriptionId}-help`} role="note" className="text-xs text-muted">
          Conte o que está errado ou desatualizado. A equipe revisa antes de mudar o Guia.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={referenceId} className="text-sm font-medium">
          Referência (opcional)
        </label>
        <input
          id={referenceId}
          name="reference"
          type="text"
          maxLength={500}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          disabled={isPending}
          aria-describedby={`${referenceId}-help`}
          className="min-h-11 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
        />
        <p id={`${referenceId}-help`} role="note" className="text-xs text-muted">
          Um link ou documento que ajude a curadoria a conferir.
        </p>
      </div>

      <div>
        <Button
          type="submit"
          variant="primary"
          className="min-h-11"
          isDisabled={isPending || description.trim().length === 0}
        >
          {isPending ? "Enviando…" : "Enviar sugestão"}
        </Button>
      </div>
    </form>
  )
}
