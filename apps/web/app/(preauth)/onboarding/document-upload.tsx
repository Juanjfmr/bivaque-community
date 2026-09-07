"use client"

import { Button } from "@heroui/react"
import { Upload } from "lucide-react"
import { type FormEvent, useRef, useState, useTransition } from "react"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { uploadVerificationDocumentAction } from "./document-actions"
import styles from "./onboarding.module.css"

export default function DocumentUpload() {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
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
        setFileName(null)
        formRef.current?.reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao enviar o documento.")
      }
    })
  }

  return (
    <div className={styles["documentPanel"]}>
      <label htmlFor="verification-document" className={styles["fieldLabel"]}>
        Enviar para análise
      </label>
      <p className={styles["statusLead"]}>
        Use um documento oficial em PDF, JPEG ou PNG, com até 10 MB. O arquivo fica privado e expira
        em sete dias.
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className={styles["form"]}>
        <div className={styles["fileControl"]}>
          <input
            id="verification-document"
            type="file"
            name="document"
            aria-label="Documento para análise"
            accept="application/pdf,image/jpeg,image/png"
            required
            className={styles["visuallyHidden"]}
            onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? null)}
          />
          <label htmlFor="verification-document" className={styles["filePicker"]}>
            <Upload aria-hidden="true" />
            Selecionar arquivo
          </label>
          <span className={styles["fileName"]}>{fileName ?? "Nenhum arquivo selecionado"}</span>
        </div>
        <Button
          type="submit"
          variant="secondary"
          className={styles["secondaryButton"] ?? ""}
          isDisabled={pending}
        >
          <Upload aria-hidden="true" />
          {pending ? "Enviando..." : "Enviar documento"}
        </Button>
      </form>

      {error && <FeedbackAlert variant="danger" description={error} />}
      {message && <FeedbackAlert variant="success" description={message} />}
    </div>
  )
}
