"use client"

import { Button } from "@heroui/react"
import { type FormEvent, useRef, useState, useTransition } from "react"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { uploadVerificationDocumentAction } from "./document-actions"

export default function DocumentUpload() {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formRef.current) return

    setError(null)
    setMessage(null)
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      try {
        await uploadVerificationDocumentAction(formData)
        setMessage("Documento enviado. Ele ficará disponível para análise por 7 dias.")
        formRef.current?.reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao enviar o documento.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <p className="text-sm font-medium">Documento de exceção</p>
      <p className="text-xs text-muted">
        Se você acredita que a consulta automática errou, envie um documento oficial de
        elegibilidade (PDF, JPEG ou PNG, até 10MB). Ele é armazenado em local privado e expira em 7
        dias.
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="file"
          name="document"
          accept="application/pdf,image/jpeg,image/png"
          required
          className="text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
        />
        <Button type="submit" variant="secondary" size="sm" isDisabled={pending}>
          {pending ? "Enviando..." : "Enviar documento"}
        </Button>
      </form>

      {error && <FeedbackAlert variant="danger" description={error} />}
      {message && <FeedbackAlert variant="success" description={message} />}
    </div>
  )
}
