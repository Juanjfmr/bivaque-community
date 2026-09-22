"use client"

import { Button } from "@heroui/react"
import { FileText, Info, Upload } from "lucide-react"
import { type FormEvent, useRef, useState, useTransition } from "react"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { uploadVerificationDocumentAction } from "./document-actions"
import styles from "./onboarding.module.css"

export type DocumentUploadMode = "upload" | "replace"

export default function DocumentUpload({ mode }: { mode: DocumentUploadMode }) {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const isReplace = mode === "replace"

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formRef.current) return

    setError(null)
    setMessage(null)
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      const result = await uploadVerificationDocumentAction(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage(
        isReplace
          ? "Novo arquivo enviado. Acompanhe a análise por aqui."
          : "Documento enviado. Acompanhe a análise por aqui.",
      )
      setFileName(null)
      formRef.current?.reset()
    })
  }

  return (
    <div className={styles["stack"]}>
      {isReplace && (
        <FeedbackAlert variant="warning" description="Não foi possível ler o documento enviado." />
      )}

      <form ref={formRef} onSubmit={handleSubmit} className={styles["form"]}>
        {isReplace ? (
          <div className={styles["replacementCard"]}>
            <span className={styles["uploadIcon"]} aria-hidden="true">
              <FileText />
            </span>
            <div>
              <p className={styles["replacementTitle"]}>Identidade militar digital</p>
              <p className={styles["notLegible"]}>Arquivo não legível</p>
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
                Substituir arquivo
              </label>
              <span className={styles["fileName"]}>{fileName ?? ""}</span>
            </div>
          </div>
        ) : (
          <div className={styles["uploadArea"]}>
            <span className={styles["uploadIcon"]} aria-hidden="true">
              <FileText />
            </span>
            <p className={styles["uploadTitle"]}>Identidade militar digital</p>
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
              Escolher arquivo
            </label>
            <span className={styles["fileName"]}>{fileName ?? ""}</span>
          </div>
        )}

        <p className={styles["documentInfo"]}>
          <Info aria-hidden="true" />
          <span>
            {isReplace
              ? "Selecione novamente o arquivo completo."
              : "Envie o documento completo em um único arquivo."}
          </span>
        </p>

        <Button
          type="submit"
          variant="primary"
          className={`${styles["primaryButton"]} ${styles["submitButton"]}`}
          isDisabled={pending || fileName === null}
        >
          {pending ? "Enviando..." : isReplace ? "Reenviar para análise" : "Enviar para análise"}
        </Button>
      </form>

      {error && <FeedbackAlert variant="danger" description={error} />}
      {message && <FeedbackAlert variant="success" description={message} />}
    </div>
  )
}
