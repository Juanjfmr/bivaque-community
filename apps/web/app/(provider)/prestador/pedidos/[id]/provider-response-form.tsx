"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState } from "react"
import { newClientKey, shouldRotateClientKey } from "../../../../../lib/service-requests/client-key"
import { FeedbackAlert } from "../../../../components/bivaque/feedback-alert"
import { respondToRequestAction } from "../../actions"

interface ProviderResponseFormProps {
  requestId: string
  conversationId: string
}

type ResponseFormState = { error: string | null }

/**
 * A chave é criada depois da hidratação e vive no estado do formulário. Um
 * duplo clique ou retry DO MESMO TEXTO usa a mesma chave; editar o texto depois
 * de uma tentativa gera chave nova (senão o servidor devolveria a mensagem
 * antiga), e uma resposta aceita também, para a próxima não ser deduplicada.
 */
export function ProviderResponseForm({ requestId, conversationId }: ProviderResponseFormProps) {
  const router = useRouter()
  const [clientKey, setClientKey] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const lastSubmittedRef = useRef<string | null>(null)
  const [state, formAction, pending] = useActionState<ResponseFormState, FormData>(
    async (_previous, formData) => {
      const submittedContent =
        typeof formData.get("content") === "string" ? String(formData.get("content")) : content
      lastSubmittedRef.current = submittedContent
      try {
        await respondToRequestAction(formData)
        setContent("")
        lastSubmittedRef.current = null
        setClientKey(newClientKey())
        return { error: null }
      } catch {
        // O reset nativo do React não pode apagar o texto que a pessoa ainda
        // precisa para tentar novamente.
        setContent(submittedContent)
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
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="clientKey" value={clientKey ?? ""} />
        <label htmlFor="content" className="block text-sm font-medium">
          Escreva uma mensagem
        </label>
        <textarea
          id="content"
          name="content"
          value={content}
          onChange={(event) => {
            const next = event.target.value
            if (shouldRotateClientKey(lastSubmittedRef.current, next)) {
              lastSubmittedRef.current = null
              setClientKey(newClientKey())
            }
            setContent(next)
          }}
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
