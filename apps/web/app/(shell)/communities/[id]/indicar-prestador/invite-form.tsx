"use client"

import { Button, Form, Input } from "@heroui/react"
import { useState } from "react"
import { showToast } from "../../../../components/bivaque/toast"
import { createProviderInvitationAction } from "./actions"

export function ProviderInvitationForm({ communityId }: { communityId: string }) {
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    const form = event.currentTarget
    try {
      const result = await createProviderInvitationAction(communityId, new FormData(form))
      if (!result.ok) {
        showToast({ title: "Convite não enviado", description: result.message, variant: "danger" })
        return
      }
      form.reset()
      showToast({
        title: "Convite enfileirado",
        description: "O prestador receberá o link quando o canal de e-mail estiver disponível.",
        variant: "success",
      })
    } catch {
      showToast({
        title: "Convite não enviado",
        description: "A conexão falhou. Tente novamente.",
        variant: "danger",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form onSubmit={submit} className="flex flex-col gap-4">
      <label
        htmlFor="provider-display-name"
        className="flex w-full flex-col gap-1 text-sm font-medium"
      >
        Nome do prestador ou negócio
        <Input
          id="provider-display-name"
          name="displayName"
          type="text"
          aria-label="Nome do prestador ou negócio"
          minLength={2}
          maxLength={80}
          autoComplete="organization"
          required
        />
      </label>
      <label htmlFor="provider-email" className="flex w-full flex-col gap-1 text-sm font-medium">
        E-mail do prestador
        <Input
          id="provider-email"
          name="email"
          type="email"
          aria-label="E-mail do prestador"
          autoComplete="email"
          required
        />
      </label>
      <Button type="submit" variant="primary" isDisabled={submitting}>
        {submitting ? "Enviando..." : "Enviar convite"}
      </Button>
    </Form>
  )
}
