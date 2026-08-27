"use client"

import { Button, Form, Input } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { acceptProviderInvitationAction } from "./actions"

export function ProviderInvitationAcceptance({
  token,
  authenticatedEmail,
}: {
  token: string
  authenticatedEmail: string | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function requestAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const emailValue = new FormData(event.currentTarget).get("email")
    const email = typeof emailValue === "string" ? emailValue.trim() : ""
    try {
      const { error: authError } = await createBrowserClient().auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/prestador-convite/${token}`,
        },
      })
      if (authError) throw authError
      setSentTo(email)
    } catch {
      setError("Não foi possível enviar o link de confirmação. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  async function accept() {
    setPending(true)
    setError(null)
    try {
      const result = await acceptProviderInvitationAction(token)
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.replace("/prestador")
      router.refresh()
    } catch {
      setError("A conexão falhou. Tente aceitar novamente.")
    } finally {
      setPending(false)
    }
  }

  if (!authenticatedEmail) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Digite exatamente o e-mail que recebeu o convite. Enviaremos um link para confirmar que o
          endereço pertence a você antes de criar a conta de prestador.
        </p>
        <Form onSubmit={requestAccess} className="flex flex-col gap-4">
          <label
            htmlFor="provider-invite-email"
            className="flex w-full flex-col gap-1 text-sm font-medium"
          >
            E-mail convidado
            <Input
              id="provider-invite-email"
              name="email"
              type="email"
              aria-label="E-mail convidado"
              autoComplete="email"
              required
            />
          </label>
          <Button type="submit" variant="primary" isDisabled={pending}>
            {pending ? "Enviando..." : "Confirmar meu e-mail"}
          </Button>
        </Form>
        {sentTo ? (
          <FeedbackAlert
            variant="success"
            title="Confira seu e-mail"
            description={`Enviamos um link de confirmação para ${sentTo}.`}
          />
        ) : null}
        {error ? <FeedbackAlert variant="danger" description={error} /> : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <FeedbackAlert
        variant="info"
        title="E-mail confirmado"
        description={`Você está entrando como ${authenticatedEmail}. O convite só será aceito se este for o endereço indicado.`}
      />
      <Button type="button" variant="primary" onPress={accept} isDisabled={pending}>
        {pending ? "Aceitando..." : "Aceitar convite"}
      </Button>
      {error ? <FeedbackAlert variant="danger" description={error} /> : null}
    </div>
  )
}
