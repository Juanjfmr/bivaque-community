"use client"

import { Button, TextArea } from "@heroui/react"
import { Calendar, Camera, Send } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  SERVICE_REQUEST_DESCRIPTION_MAX,
  SERVICE_REQUEST_WHEN_OPTIONS,
  validateRequestPhotos,
} from "../../../../lib/service-requests/request-form"
import { Card } from "../../../components/bivaque/card"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { type ServiceRequestActionState, submitServiceRequest } from "./actions"

// Prancha 62, painel direito — descrever a necessidade. Destinatário é
// somente leitura (derive da URL), o prazo desejado é "Quando" (nunca contato
// pessoal) e o cartão Resumo espelha os campos em tempo real.
//
// Estados fechados: envio em andamento sem duplicar (botão desabilita e a
// chave de idempotência segura o reenvio), erro recuperável que preserva o
// texto, sessão expirada com caminho de volta, e sucesso.

type PhotoEntry = { name: string; size: number; type: string }

export function RequestForm({
  providerId,
  providerName,
}: {
  providerId: string
  providerName: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [description, setDescription] = useState("")
  const [when, setWhen] = useState<string>(SERVICE_REQUEST_WHEN_OPTIONS[0])
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [clientError, setClientError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<ServiceRequestActionState>({ status: "idle" })
  // Chave de idempotência gerada no cliente, depois da hidratação: o mesmo
  // rascunho reenviado devolve o MESMO pedido em vez de criar outro.
  const [idempotencyKey, setIdempotencyKey] = useState("")

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID())
  }, [])

  function handlePhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }))
    const validation = validateRequestPhotos(files)
    if (!validation.ok) {
      setClientError(validation.message)
      setPhotos([])
      return
    }
    setClientError(null)
    setPhotos(files)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || formRef.current === null) return
    setPending(true)
    setClientError(null)
    const next = await submitServiceRequest(new FormData(formRef.current))
    setResult(next)
    if (next.status === "error" || next.status === "session") {
      setPending(false)
    }
  }

  if (result.status === "success") {
    return (
      <div className="mt-6">
        <FeedbackAlert
          variant="success"
          title="Pedido enviado"
          description={`Seu pedido para ${providerName} foi enviado. Ele receberá o pedido e poderá responder.`}
        />
        <div className="mt-4">
          <Link
            href={`/prestadores/${providerId}` as Route}
            className="inline-flex min-h-11 items-center justify-center text-sm font-medium underline"
          >
            Voltar ao perfil
          </Link>
        </div>
      </div>
    )
  }

  const errorMessage = clientError ?? (result.status === "error" ? result.message : null)

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
      <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5">
        <input type="hidden" name="providerId" value={providerId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        <div className="flex flex-col gap-1">
          <label htmlFor="destinatario" className="text-sm font-medium">
            Destinatário
          </label>
          <input
            id="destinatario"
            name="destinatario"
            value={providerName}
            readOnly
            aria-readonly="true"
            className="min-h-11 w-full rounded-lg border border-border bg-[var(--semantic-surface-sunken)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium">
            Descrição do que você precisa
          </label>
          <TextArea
            id="description"
            name="description"
            aria-label="Descrição do que você precisa"
            value={description}
            onChange={(event) =>
              setDescription(
                (event.target as HTMLTextAreaElement).value.slice(
                  0,
                  SERVICE_REQUEST_DESCRIPTION_MAX,
                ),
              )
            }
            rows={5}
            className="w-full"
          />
          <p className="self-end text-xs text-muted">
            {description.length}/{SERVICE_REQUEST_DESCRIPTION_MAX}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="when" className="text-sm font-medium">
            Prazo ou horário desejado <span className="font-normal text-muted">(opcional)</span>
          </label>
          <div className="relative">
            <Calendar
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <select
              id="when"
              name="when"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-[var(--semantic-surface)] pl-9 pr-3 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)]"
            >
              {SERVICE_REQUEST_WHEN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            Fotos <span className="font-normal text-muted">(opcional)</span>
          </span>
          <label
            htmlFor="photos"
            className="relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border px-4 py-6 text-center transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-surface-sunken)] focus-within:ring-2 focus-within:ring-[var(--semantic-action-primary)]"
          >
            <Camera size={22} aria-hidden="true" className="text-muted" />
            <span className="text-sm font-medium">Adicionar fotos</span>
            <span className="text-xs text-muted">JPG, PNG até 10MB cada</span>
            <input
              id="photos"
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotos}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 transition-colors duration-[var(--semantic-motion-duration-instant)]"
            />
          </label>
          {photos.length > 0 ? (
            <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted">
              {photos.map((photo) => (
                <li key={photo.name}>{photo.name}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {result.status === "session" ? (
          <FeedbackAlert
            variant="warning"
            title="Sua sessão expirou"
            description="Entre novamente para enviar o pedido."
            actions={
              <Link
                href={"/login" as Route}
                className="inline-flex min-h-11 items-center justify-center text-sm font-medium underline"
              >
                Entrar
              </Link>
            }
          />
        ) : errorMessage ? (
          <FeedbackAlert
            variant="danger"
            title="Não foi possível enviar"
            description={errorMessage}
            actions={
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => formRef.current?.requestSubmit()}
                isDisabled={pending}
              >
                Tentar novamente
              </Button>
            }
          />
        ) : null}

        <Button type="submit" variant="primary" isDisabled={pending} className="min-h-11 w-full">
          <Send size={18} aria-hidden="true" />
          {pending ? "Enviando…" : "Enviar pedido"}
        </Button>
      </form>

      <Card className="p-5">
        <h2 className="text-base font-semibold tracking-tight">Resumo do pedido</h2>
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-muted">Destinatário</dt>
            <dd>{providerName}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-muted">Descrição</dt>
            <dd className="break-words">{description.trim() === "" ? "—" : description}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-muted">Prazo ou horário</dt>
            <dd>{when}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-muted">Fotos</dt>
            <dd>
              {photos.length === 0
                ? "Nenhuma foto adicionada"
                : `${photos.length} ${photos.length === 1 ? "foto adicionada" : "fotos adicionadas"}`}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
