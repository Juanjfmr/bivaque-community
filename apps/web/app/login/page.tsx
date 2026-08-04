"use client"

import { brandTokens } from "@bivaque/tokens"
import { Button, Form, Input } from "@heroui/react"
import { useState } from "react"
import { createBrowserClient } from "../../lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)
    const { error: signInError } = await createBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/consent`,
      },
    })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    setError(null)
    setLoading(true)
    const { error: signInError } = await createBrowserClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/consent`,
      },
    })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="grid flex-1 place-items-center px-6 py-12">
      <section className="flex w-full max-w-sm flex-col gap-6" aria-labelledby="login-heading">
        <div className="flex flex-col gap-2">
          <h1 id="login-heading" className="text-2xl font-semibold tracking-tight">
            {brandTokens.productName}
          </h1>
          <p className="text-sm text-muted">Entre para acessar sua comunidade.</p>
        </div>

        {error && (
          <div
            className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
            role="alert"
          >
            {error}
          </div>
        )}

        <Button
          variant="primary"
          className="w-full"
          onPress={handleGoogleSignIn}
          isDisabled={loading}
        >
          Entrar com Google
        </Button>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-border" />
          <span className="text-xs text-muted">ou</span>
          <hr className="flex-1 border-border" />
        </div>

        <Form
          onSubmit={(e) => {
            e.preventDefault()
            handleMagicLink()
          }}
          className="flex flex-col gap-3"
        >
          <Input
            type="email"
            aria-label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
            required
          />
          <Button type="submit" variant="secondary" className="w-full" isDisabled={loading}>
            Enviar link mágico
          </Button>
        </Form>

        {sent && (
          <p className="text-sm text-green-700">
            Link enviado! Verifique seu e-mail e clique no link para continuar.
          </p>
        )}
      </section>
    </div>
  )
}
