"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState } from "react"
import { FeedbackAlert } from "../../../../components/bivaque/feedback-alert"
import { respondToRequestAction } from "../../actions"

interface ProviderResponseFormProps {
  requestId: string
  conversationId: string
}

type ResponseFormState = { error: string | null }

function newClientKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * A chave é criada depois da hidratação e vive no estado do formulário. Um
 * duplo clique ou retry usa a mesma chave; depois de uma resposta aceita, uma
 * nova chave é gerada para que a próxima mensagem não seja deduplicada.
 */
export function ProviderResponseForm({ requestId, conversationId }: ProviderResponseFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [clientKey, setClientKey] = useState<string | null>(null)
  const [state, formAction, pending] = useActionState<ResponseFormState, FormData>(
    async (_previous, formData) => {
      try {
        await respondToRequestAction(formData)
        formRef.current?.reset()
        setClientKey(newClientKey())
        return { error: null }
      } catch {
        router.refresh()
        return { error: "Não foi possível enviar a resposta agora. Tente novamente." }
      }
    },
    { error: null },
  )

  useEffect(() => {
    setClientKey(newClientKey())
  }, [])

  return (
    <div className="space-y-3">
      {state.error ? <FeedbackAlert variant="danger" description={state.error} /> : null}
      <form ref={formRef} action={formAction} className="space-y-3">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="clientKey" value={clientKey ?? ""} />
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
          disabled={pending || !clientKey}
          className="inline-flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-5 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </div>
  )
}
