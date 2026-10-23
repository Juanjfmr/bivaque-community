"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useRef, useState, useTransition } from "react"
import { EntryError } from "../../components/entry/entry-error"
import { MaterialFilledButton } from "../../components/material/filled-button"
import { MaterialIcon } from "../../components/material/material-icon"
import { uploadVerificationDocumentAction } from "./document-actions"

// PORT-004 (lote 4, frente B): o bloco de arquivo do protótipo
// (`.en-file` em account.js) com o envio que já existia.
//
// O servidor não mudou: `uploadVerificationDocumentAction` continua aceitando
// PDF, JPEG e PNG até 10 MB, com o PDF preservado byte a byte e a imagem
// limpa pelo sanitizador, e continua registrando o documento para análise
// manual. O que muda é a tela: o bloco tracejado do protótipo substitui o
// cartão do HeroUI, e o envio confirmado leva para a análise pendente — que é
// o estado real do servidor depois do registro ("Recebemos seu documento.").
//
// Diferença registrada: o protótipo envia no `change` do campo de arquivo. Aqui
// o arquivo é escolhido no mesmo bloco, mas o envio é um segundo gesto
// explícito ("Enviar para análise"), para uma escolha errada não subir sozinha.

export type DocumentUploadMode = "upload" | "replace"

export default function DocumentUpload({ mode }: Readonly<{ mode: DocumentUploadMode }>) {
  const router = useRouter()
  const isReplace = mode === "replace"
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement | null>(null)

  const submit = () => {
    if (!formRef.current || pending || fileName === null) return

    setError(null)
    const formData = new FormData(formRef.current)

    startTransition(async () => {
      const result = await uploadVerificationDocumentAction(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setFileName(null)
      formRef.current?.reset()
      router.push("/onboarding/status")
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        submit()
      }}
    >
      <label className="en-file" htmlFor="verification-document">
        <MaterialIcon name="upload" />
        <span>
          <b>{isReplace ? "Enviar outro documento" : "Enviar um documento"}</b>
          PDF, JPG ou PNG, até 10 MB.
        </span>
        <input
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          aria-label="Documento para análise"
          id="verification-document"
          name="document"
          onChange={(event) => {
            setError(null)
            setFileName(event.currentTarget.files?.[0]?.name ?? null)
          }}
          required
          type="file"
        />
      </label>

      <p className="en-file-name">{fileName ?? ""}</p>

      <EntryError>{error}</EntryError>

      <MaterialFilledButton
        disabled={pending || fileName === null}
        id="document-submit"
        onClick={submit}
      >
        {pending ? "Enviando…" : isReplace ? "Enviar novo arquivo" : "Enviar para análise"}
      </MaterialFilledButton>
    </form>
  )
}
