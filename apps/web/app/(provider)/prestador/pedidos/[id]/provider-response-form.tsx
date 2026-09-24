"use client"

import { useActionState, useState } from "react"
import { FeedbackAlert } from "../../../../components/bivaque/feedback-alert"
import { respondToRequestAction } from "../../actions"

interface ProviderResponseFormProps {
  requestId: string
  conversationId: string
}

type ResponseFormState = { error: string | null }

/**
 * A chave fica no estado do formulário, não em um hidden gerado a cada render
 * do Server Component. Assim, um duplo clique ou retry enquanto o formulário
 * continua montado usa o mesmo p_client_key; o RPC devolve a mensagem existente.
 */
export function ProviderResponseForm({ requestId, conversationId }: ProviderResponseFormProps) {
  const [clientKey] = useState(
    () =>
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )
  const [state, formAction, pending] = useActionState<ResponseFormState, FormData>(
    async (_previous, formData) => {
      try {
        await respondToRequestAction(formData)
        return { error: null }
      } catch {
        return { error: "Não foi possível enviar a resposta agora. Tente novamente." }
      }
    },
    { error: null },
  )

  return (
    <div className="space-y-3">
      {state.error ? <FeedbackAlert variant="danger" description={state.error} /> : null}
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="clientKey" value={clientKey} />
        <label htmlFor="content" className="block text-sm font-medium">
          Escreva uma mensagem
        </label>
        <textarea
          id="content"
          name="content"
          required
          maxLength={2000}
          rows={3}
          className="w-full rounded-lg border border-border bg-[var(--semantic-surface)] p-3 text-sm"
          placeholder="Responda ao pedido"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-5 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </div>
  )
}
