"use client"

import { Button } from "@heroui/react"
import { useActionState } from "react"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { purgeDocumentsAction } from "./actions"

export function PurgeForm() {
  const [state, action, pending] = useActionState(async () => {
    const result = await purgeDocumentsAction()
    return result.ok ? "ok" : result.error === "forbidden" ? "forbidden" : "error"
  }, "")
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <p className="text-sm text-muted">
        Documentos decididos e expirados são descartados. Se houve falha, tente novamente aqui.
      </p>
      <Button type="submit" variant="secondary" className="min-h-11" isDisabled={pending}>
        {pending ? "Descartando…" : "Descartar documentos pendentes"}
      </Button>
      {state && (
        <FeedbackAlert
          variant={state === "ok" ? "success" : "warning"}
          title={state === "ok" ? "Descarte concluído" : "Descarte não concluído"}
          description={
            state === "forbidden"
              ? "Ação permitida apenas a operadores."
              : state === "error"
                ? "Há remoções pendentes. Tente novamente; a fila foi preservada."
                : "Os arquivos foram removidos; os registros das decisões foram preservados."
          }
        />
      )}
    </form>
  )
}
