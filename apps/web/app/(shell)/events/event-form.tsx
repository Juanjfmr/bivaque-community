"use client"

// RECON-029 (R35): formulário de criar e editar evento. Persiste antes de
// divulgar; a falha preserva os campos. O escopo (cidade) é fixado na criação e
// não aparece na edição — editar não contorna acesso.

import { Button, Input, TextArea } from "@heroui/react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { cancelEventAction, createEventAction, updateEventAction } from "./event-actions"

export type EventFormValues = {
  id?: string
  title: string
  description: string
  startsAt: string
  venue: string
}

interface EventFormProps {
  mode: "create" | "edit"
  initial: EventFormValues
  cancelled?: boolean
}

export function EventForm({ mode, initial, cancelled = false }: EventFormProps) {
  const router = useRouter()
  const { current } = useLocalityContext()
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [startsAt, setStartsAt] = useState(initial.startsAt)
  const [venue, setVenue] = useState(initial.venue)
  const [failure, setFailure] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  const isEdit = mode === "edit"
  const backHref = isEdit && initial.id ? `/events/${initial.id}` : "/events"

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setFailure(null)

    const formData = new FormData()
    formData.set("title", title)
    formData.set("description", description)
    formData.set("startsAt", startsAt)
    formData.set("venue", venue)
    if (isEdit && initial.id) formData.set("eventId", initial.id)
    if (!isEdit) formData.set("localityId", current.id)

    const result = isEdit ? await updateEventAction(formData) : await createEventAction(formData)
    if (result.ok) {
      router.push(`/events/${result.eventId}` as Route)
      router.refresh()
      return
    }
    setFailure(result.message)
    setSubmitting(false)
  }

  async function handleCancelEvent() {
    if (!initial.id || submitting) return
    setSubmitting(true)
    setFailure(null)
    const formData = new FormData()
    formData.set("eventId", initial.id)
    const result = await cancelEventAction(formData)
    if (result.ok) {
      router.push(`/events/${result.eventId}` as Route)
      router.refresh()
      return
    }
    setFailure(result.message)
    setSubmitting(false)
  }

  return (
    <section className="flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isEdit ? "Editar evento" : "Novo evento"}
      </h1>

      {cancelled ? (
        <FeedbackAlert
          variant="warning"
          description="Este evento está cancelado. Editar os dados não o reabre."
        />
      ) : null}

      {failure ? <FeedbackAlert variant="danger" description={failure} /> : null}

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-title" className="text-sm font-medium">
            Título
          </label>
          <Input
            id="event-title"
            value={title}
            onChange={(event) => setTitle((event.target as HTMLInputElement).value)}
            required
            minLength={2}
            maxLength={200}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-description" className="text-sm font-medium">
            Descrição
          </label>
          <TextArea
            id="event-description"
            value={description}
            onChange={(event) => setDescription((event.target as HTMLTextAreaElement).value)}
            maxLength={2000}
            rows={4}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-starts-at" className="text-sm font-medium">
            Data e hora
          </label>
          <Input
            id="event-starts-at"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt((event.target as HTMLInputElement).value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-venue" className="text-sm font-medium">
            Local
          </label>
          <Input
            id="event-venue"
            value={venue}
            onChange={(event) => setVenue((event.target as HTMLInputElement).value)}
            maxLength={200}
          />
          <p className="text-xs text-muted">
            O local deve ser um espaço público. Endereços pessoais ou militares não são permitidos.
          </p>
        </div>

        {!isEdit ? (
          <p className="text-xs text-muted">
            O evento será publicado em {current.cityName}
            {current.stateCode ? `, ${current.stateCode}` : ""}. A cidade é fixada na criação.
          </p>
        ) : (
          <p className="text-xs text-muted">
            Alterações relevantes (título, descrição, data, local) avisam quem confirmou presença.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" className="min-h-11" isDisabled={submitting}>
            {submitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar evento"}
          </Button>
          <Link
            href={backHref as Route}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
          >
            {isEdit ? "Voltar ao evento" : "Cancelar"}
          </Link>
        </div>
      </form>

      {isEdit && !cancelled ? (
        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-border bg-[var(--semantic-surface-sunken)] p-3">
          <p className="text-sm font-medium">Cancelar evento</p>
          <p className="text-xs text-muted">
            Cancelar o evento avisa quem confirmou presença. É diferente de cancelar a própria
            presença.
          </p>
          {confirmingCancel ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="danger"
                className="min-h-11"
                isDisabled={submitting}
                onPress={() => void handleCancelEvent()}
              >
                Confirmar cancelamento
              </Button>
              <Button
                variant="tertiary"
                className="min-h-11"
                onPress={() => setConfirmingCancel(false)}
              >
                Manter evento
              </Button>
            </div>
          ) : (
            <Button
              variant="tertiary"
              className="min-h-11 w-fit"
              onPress={() => setConfirmingCancel(true)}
            >
              Cancelar evento
            </Button>
          )}
        </div>
      ) : null}
    </section>
  )
}
