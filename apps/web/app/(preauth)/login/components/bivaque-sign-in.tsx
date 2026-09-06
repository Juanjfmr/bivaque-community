"use client"

import { Button } from "@heroui/react"
import { ArrowLeft, ArrowRight, Mail, ShieldCheck, Tent } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { classifyEntrySend, type EntrySendView } from "../../../../lib/auth/entry-send"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import styles from "./bivaque-sign-in.module.css"

interface BivaqueSignInProps {
  onMagicLinkSignIn?: (email: string) => Promise<void> | void
  onGoogleSignIn?: () => Promise<void> | void
  mode?: "login" | "signup"
}

const entryCopy = {
  login: {
    eyebrow: "Bem-vindo de volta",
    title: "Entre no Bivaque",
    description: "Receba um link no seu e-mail para continuar. Sem senha para lembrar.",
    submit: "Receber link para entrar",
    google: "Continuar com Google",
    success: "Link enviado para",
    alternateLead: "Ainda não faz parte?",
    alternateAction: "Criar conta",
    alternateHref: "/signup",
    trust:
      "O acesso é controlado. A elegibilidade é conferida de acordo com o papel de cada pessoa.",
    visualEyebrow: "A comunidade vai com você.",
    visualTitle: "Chegue sabendo a quem perguntar.",
    visualDescription:
      "Encontre referências de quem conhece o lugar e deixe sua experiência disponível para a próxima chegada.",
  },
  signup: {
    eyebrow: "Primeiro acesso",
    title: "Comece pelo seu e-mail.",
    description: "Ele será sua forma de entrar no Bivaque. Sem senha, sem formulário longo.",
    submit: "Criar conta e continuar",
    google: "Criar com Google",
    success: "Link enviado para",
    alternateLead: "Já tem uma conta?",
    alternateAction: "Entrar",
    alternateHref: "/login",
    trust: "Depois do e-mail: regras da comunidade, elegibilidade e escolha da sua localidade.",
    visualEyebrow: "Há sempre alguém chegando.",
    visualTitle: "Encontre quem já conhece o caminho.",
    visualDescription: "Com o tempo, deixe o que você aprendeu disponível para quem chegar depois.",
  },
} as const

// As duas entradas são destinos distintos, não abas de um formulário só:
// a escolha muda a rota, o `shouldCreateUser` do OTP e a mensagem de erro.
// Manter isso como navegação preserva voltar/avançar e link compartilhável.
// O limite real é do servidor (`max_frequency` do GoTrue). Este número só
// controla o que a tela mostra enquanto isso.
const RESEND_COOLDOWN_SECONDS = 60

// Neutra de propósito: não diz que a conta existe. Ver lib/auth/entry-send.ts.
const SENT_HINT = "Se não chegar em alguns minutos, confira o endereço e o spam."

const entryModes = [
  { mode: "login", label: "Entrar", href: "/login" },
  { mode: "signup", label: "Criar conta", href: "/signup" },
] as const

function GoogleIcon() {
  return (
    <svg className={styles["googleIcon"]} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z"
      />
    </svg>
  )
}

function Wordmark() {
  return (
    <span className={styles["wordmark"]}>
      <Tent aria-hidden="true" strokeWidth={1.8} />
      <span>Bivaque</span>
    </span>
  )
}

export function BivaqueSignIn({
  onMagicLinkSignIn,
  onGoogleSignIn,
  mode = "login",
}: BivaqueSignInProps) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<"email" | "google" | null>(null)
  // O resultado do envio é um estado só. Antes eram `sent` e `error`
  // independentes, e era isso que permitia a tela responder de forma diferente
  // para um endereço com conta e um sem — ver lib/auth/entry-send.ts.
  const [result, setResult] = useState<EntrySendView | null>(null)
  const [sentTo, setSentTo] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const sent = result?.outcome === "sent"
  const copy = entryCopy[mode]
  const titleId = mode === "signup" ? "signup-title" : "login-title"
  const emailId = mode === "signup" ? "bivaque-signup-email" : "bivaque-signin-email"

  // Contagem regressiva do reenvio. Roda no cliente só para dizer quanto
  // falta: quem impõe o limite é o servidor, e o botão liberado antes da hora
  // apenas recebe outro 429 — a espera visível nunca é a autorização.
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const sendMagicLink = async (address: string) => {
    setError(null)
    setLoading("email")

    let caught: unknown = null
    try {
      if (onMagicLinkSignIn) {
        await onMagicLinkSignIn(address)
      } else {
        const { error: signInError } = await createBrowserClient().auth.signInWithOtp({
          email: address,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/consent`,
            shouldCreateUser: mode === "signup",
          },
        })
        caught = signInError
      }
    } catch (thrown) {
      caught = thrown
    }

    const view = classifyEntrySend(caught)
    setResult(view)
    if (view.outcome === "sent") {
      setSentTo(address)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    }
    if (view.outcome === "rate-limited") {
      setCooldown(view.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS)
    }
    setLoading(null)
  }

  const handleMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await sendMagicLink(email)
  }

  const handleGoogle = async () => {
    setError(null)
    setLoading("google")

    try {
      if (onGoogleSignIn) {
        await onGoogleSignIn()
      } else {
        const { error: signInError } = await createBrowserClient().auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=/consent`,
          },
        })
        if (signInError) throw signInError
      }
    } catch {
      setError("Não foi possível continuar com o Google agora. Tente novamente em instantes.")
      setLoading(null)
    }
  }

  return (
    <main className={styles["root"]}>
      <section className={styles["formPanel"]} aria-labelledby={titleId}>
        <header className={styles["topbar"]}>
          <Link href="/" className={styles["brandLink"]} aria-label="Bivaque, voltar ao início">
            <Wordmark />
          </Link>
          <Link href="/" className={styles["backLink"]}>
            <ArrowLeft aria-hidden="true" />
            <span>Voltar</span>
          </Link>
        </header>

        <div className={styles["mobileImage"]} aria-hidden="true">
          <Image src="/landing/hero-bivaque-arrival.webp" alt="" fill unoptimized sizes="100vw" />
        </div>

        <div className={styles["formContent"]}>
          <nav className={styles["modeSwitch"]} aria-label="Escolha como entrar no Bivaque">
            {entryModes.map((entry) => (
              <Link
                key={entry.mode}
                href={{ pathname: entry.href }}
                className={styles["modeOption"]}
                aria-current={entry.mode === mode ? "page" : undefined}
                data-active={entry.mode === mode ? "true" : undefined}
              >
                {entry.label}
              </Link>
            ))}
          </nav>

          <div className={styles["heading"]}>
            <p className={styles["eyebrow"]}>{copy.eyebrow}</p>
            <h1 id={titleId}>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>

          <form className={styles["form"]} onSubmit={handleMagicLink}>
            <label className={styles["field"]} htmlFor={emailId}>
              <span>Seu e-mail</span>
              <span className={styles["inputShell"]}>
                <Mail aria-hidden="true" />
                <input
                  id={emailId}
                  aria-label="Seu e-mail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nome@exemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </span>
            </label>

            <Button
              type="submit"
              variant="primary"
              className={styles["primaryButton"] ?? ""}
              isDisabled={loading !== null}
            >
              {loading === "email" ? "Enviando..." : copy.submit}
              {loading !== "email" && <ArrowRight aria-hidden="true" />}
            </Button>
          </form>

          <div className={styles["divider"]}>
            <span>ou continue com</span>
          </div>

          <Button
            onPress={handleGoogle}
            variant="outline"
            className={styles["googleButton"] ?? ""}
            isDisabled={loading !== null}
          >
            <GoogleIcon />
            {loading === "google" ? "Abrindo Google..." : copy.google}
          </Button>

          {error && <FeedbackAlert variant="danger" description={error} />}

          {result?.outcome === "offline" && (
            <FeedbackAlert variant="warning" title="Sem conexão" description={result.message} />
          )}

          {result?.outcome === "failed" && (
            <FeedbackAlert variant="danger" description={result.message} />
          )}

          {result?.outcome === "rate-limited" && (
            <FeedbackAlert variant="warning" title="Muitos pedidos" description={result.message} />
          )}

          {sent && (
            <FeedbackAlert
              variant="success"
              title="Confira seu e-mail"
              description={
                <>
                  {copy.success} <strong>{sentTo}</strong>. {SENT_HINT}
                </>
              }
            />
          )}

          {(sent || result?.outcome === "rate-limited") && (
            <div className={styles["resend"]}>
              <Button
                type="button"
                variant="ghost"
                className={styles["resendButton"] ?? ""}
                isDisabled={loading !== null || cooldown > 0}
                onPress={() => void sendMagicLink(sentTo || email)}
              >
                {loading === "email" ? "Reenviando..." : "Reenviar link"}
              </Button>
              <span aria-live="polite">
                {cooldown > 0 ? `Disponível em ${cooldown}s` : "Não chegou? Peça outro."}
              </span>
            </div>
          )}

          <p className={styles["accountPrompt"]}>
            {copy.alternateLead}{" "}
            <Link href={{ pathname: copy.alternateHref }}>{copy.alternateAction}</Link>
          </p>

          <p className={styles["trustNote"]}>
            <ShieldCheck aria-hidden="true" />
            <span>{copy.trust}</span>
          </p>
        </div>
      </section>

      <section className={styles["visualPanel"]} aria-label="A comunidade Bivaque">
        <Image
          src="/landing/hero-bivaque-arrival.webp"
          alt="Pessoa chegando a um encontro comunitário enquanto uma cadeira é oferecida"
          fill
          priority
          unoptimized
          sizes="50vw"
        />
        <div className={styles["visualShade"]} aria-hidden="true" />
        <div className={styles["visualCopy"]}>
          <p>{copy.visualEyebrow}</p>
          <h2>{copy.visualTitle}</h2>
          <span>{copy.visualDescription}</span>
        </div>
      </section>
    </main>
  )
}

export default BivaqueSignIn
