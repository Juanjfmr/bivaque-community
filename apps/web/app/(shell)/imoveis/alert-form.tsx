"use client"

import { Bell, Bookmark } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { createListingAlertAction } from "../../../lib/listings/actions"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"

// "Salvar busca" e "Criar alerta" da prancha 65. O resultado real do servidor
// vira mensagem; nada de toast como única implementação. `variant="full"` traz
// os dois botões e o nome opcional; `variant="compact"` é a faixa do detalhe.
export function ListingAlertForm({
  hidden,
  variant,
}: {
  hidden: Record<string, string>
  variant: "full" | "compact"
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(intent: "saved" | "alert") {
    const form = formRef.current
    if (!form) return
    const formData = new FormData(form)
    formData.set("intent", intent)
    startTransition(async () => {
      const result = await createListingAlertAction(formData)
      setMessage(
        result.ok
          ? { ok: true, text: result.message ?? "Feito." }
          : { ok: false, text: result.message ?? "Não foi possível salvar agora." },
      )
    })
  }

  return (
    <form
      ref={formRef}
      className={
        variant === "compact"
          ? "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-[var(--semantic-surface)] p-4"
          : "flex flex-wrap items-center gap-2"
      }
    >
      {Object.entries(hidden).map(([name, value]) =>
        value === "" ? null : <input key={name} type="hidden" name={name} value={value} />,
      )}

      {variant === "compact" ? (
        <>
          <Bell size={20} aria-hidden="true" className="text-[var(--semantic-action-primary)]" />
          <div className="min-w-40 flex-1">
            <p className="text-sm font-medium">Criar alerta para imóveis parecidos</p>
            <p className="text-xs text-muted">
              Receba avisos quando novos imóveis atenderem ao que você busca.
            </p>
          </div>
        </>
      ) : (
        <>
          <label className="sr-only" htmlFor="alerta-nome">
            Nome da busca
          </label>
          <input
            id="alerta-nome"
            name="name"
            placeholder="Nome da busca (opcional)"
            className="min-h-11 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("saved")}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] disabled:opacity-60"
          >
            <Bookmark size={16} aria-hidden="true" />
            Salvar busca
          </button>
        </>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => submit("alert")}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] disabled:opacity-60"
      >
        <Bell size={16} aria-hidden="true" />
        Criar alerta
      </button>

      {message ? (
        <FeedbackAlert
          variant={message.ok ? "success" : "danger"}
          description={message.text}
          className="w-full"
        />
      ) : null}
    </form>
  )
}
