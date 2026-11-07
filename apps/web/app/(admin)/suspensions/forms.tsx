"use client"

import { Button, TextArea } from "@heroui/react"
import { useActionState, useId } from "react"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { endSuspensionAction, suspendAccountAction } from "./actions"

const MESSAGES: Record<string, string> = {
  forbidden: "Sua conta não tem permissão para esta ação.",
  "invalid-input": "Informe a conta, o motivo e um prazo inteiro entre 1 e 365 dias.",
  conflict: "A conta já está suspensa. Confira a lista antes de agir.",
  "not-found": "A conta ou a suspensão não foi encontrada. Atualize a lista.",
  unavailable: "Não foi possível registrar. Tente novamente.",
}

export function SuspensionForm({
  userId = "",
  ending = false,
}: {
  userId?: string
  ending?: boolean
}) {
  const id = useId()
  const [state, action, pending] = useActionState(async (_previous: string, data: FormData) => {
    const member = String(data.get("userId") ?? "")
    const reason = String(data.get("reason") ?? "")
    const result = ending
      ? await endSuspensionAction(member, reason)
      : await suspendAccountAction(member, reason, Number(data.get("days")))
    return result.ok ? "ok" : (result.error ?? "unavailable")
  }, "")
  return (
    <form action={action} className="flex flex-col gap-3">
      {ending ? (
        <input type="hidden" name="userId" value={userId} />
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-user`}>ID da conta</label>
          <input
            id={`${id}-user`}
            name="userId"
            defaultValue={userId}
            required
            pattern="[0-9a-fA-F-]{36}"
            disabled={pending}
            className="min-h-11 w-full rounded-lg border border-border bg-surface px-3"
          />
          <p className="text-xs text-muted">
            Abra pelo conteúdo denunciado ou informe o UUID da conta.
          </p>
        </div>
      )}
      <label htmlFor={`${id}-reason`}>
        {ending ? "Motivo do encerramento" : "Motivo da suspensão"}
      </label>
      <TextArea id={`${id}-reason`} name="reason" required maxLength={1000} disabled={pending} />
      {!ending && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-days`}>Prazo em dias</label>
          <input
            id={`${id}-days`}
            type="number"
            name="days"
            min={1}
            max={365}
            step={1}
            defaultValue={7}
            required
            disabled={pending}
            className="min-h-11 w-28 rounded-lg border border-border bg-surface px-3"
          />
          <p className="text-xs text-muted">
            Ao vencer o prazo, a escrita é liberada automaticamente.
          </p>
        </div>
      )}
      <Button
        type="submit"
        variant={ending ? "secondary" : "danger"}
        className="min-h-11 self-start"
        isDisabled={pending}
      >
        {pending ? "Registrando…" : ending ? "Encerrar suspensão" : "Aplicar suspensão"}
      </Button>
      {state && (
        <FeedbackAlert
          variant={state === "ok" ? "success" : "warning"}
          title={state === "ok" ? "Ação registrada" : "Não foi possível registrar"}
          description={
            state === "ok"
              ? "O estado da conta foi atualizado e a pessoa recebeu um aviso."
              : (MESSAGES[state] ?? MESSAGES["unavailable"])
          }
        />
      )}
    </form>
  )
}
