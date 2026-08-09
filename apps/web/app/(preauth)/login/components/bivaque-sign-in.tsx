"use client"

import { brandTokens } from "@bivaque/tokens"
import { Button, Checkbox, Input, Separator } from "@heroui/react"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"

export interface BivaqueTestimonial {
  initials: string
  name: string
  context: string
  text: string
}

interface BivaqueSignInProps {
  title?: React.ReactNode
  description?: React.ReactNode
  heroPanel?: React.ReactNode
  testimonials?: BivaqueTestimonial[]
  onMagicLinkSignIn?: (email: string) => Promise<void> | void
  onGoogleSignIn?: () => Promise<void> | void
  onResetPassword?: () => void
  onCreateAccount?: () => void
}

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
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

function GlassInputWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-[var(--surface)]/60 backdrop-blur-sm transition-colors duration-[var(--duration-base)] ease-[var(--ease-out)] focus-within:border-[var(--accent)] focus-within:bg-[var(--accent-soft)]">
      {children}
    </div>
  )
}

function DefaultHeroPanel() {
  return (
    <div className="absolute inset-4 rounded-3xl bg-[var(--accent)] bg-gradient-to-br from-[var(--accent)] via-[color-mix(in oklch, var(--accent) 85%, var(--background))] to-[color-mix(in oklch, var(--accent) 45%, var(--background))] motion-panel-enter">
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center text-white">
        <div
          aria-hidden="true"
          className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <title>Escudo militar estilizado</title>
            <path d="M12 2 L20 6 V14 L12 22 L4 14 V6 Z" />
            <path d="M4 6 L12 12 L20 6" />
            <path d="M12 12 V22" />
          </svg>
        </div>
        <div className="max-w-sm space-y-2">
          <p className="text-3xl font-semibold leading-tight">{brandTokens.productName}</p>
          <p className="text-sm text-white/80">
            Comunidade privada e verificada para militares federais, veteranos e pensionistas.
            Convite restrito, presença confirmada.
          </p>
        </div>
      </div>
    </div>
  )
}

function TestimonialCard({
  testimonial,
  delay,
}: {
  testimonial: BivaqueTestimonial
  delay: string
}) {
  return (
    <div
      className={`motion-card-enter ${delay} flex items-start gap-3 rounded-3xl border border-border bg-[var(--surface-raised)]/90 backdrop-blur-xl p-5 w-64`}
    >
      <div
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-subtle)] text-sm font-medium"
      >
        {testimonial.initials}
      </div>
      <div className="text-sm leading-snug">
        <p className="font-medium">{testimonial.name}</p>
        <p className="text-[var(--muted)]">{testimonial.context}</p>
        <p className="mt-1 text-[var(--muted)]">{testimonial.text}</p>
      </div>
    </div>
  )
}

const DEFAULT_TESTIMONIALS: BivaqueTestimonial[] = [
  {
    initials: "CA",
    name: "Cabo Almeida",
    context: "Manaus · AM",
    text: "Pude reencontrar colegas de farda em um ambiente seguro e verificado.",
  },
  {
    initials: "TS",
    name: "Tenente Santos",
    context: "Belém · PA",
    text: "As recomendações da minha redondeza me economizaram horas de pesquisa.",
  },
  {
    initials: "SF",
    name: "Sgt. Ferreira",
    context: "São Luís · MA",
    text: "O convite restrito passou a sensação de pertencer a algo real.",
  },
]

export const BivaqueSignIn: React.FC<BivaqueSignInProps> = ({
  title = (
    <span className="font-light text-[var(--foreground)] tracking-tighter">
      {brandTokens.productName}
    </span>
  ),
  description = "Entre para acessar sua comunidade verificada.",
  heroPanel,
  testimonials,
  onMagicLinkSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const useInternalMagicLink = !onMagicLinkSignIn

  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (onMagicLinkSignIn) {
      setError(null)
      try {
        await onMagicLinkSignIn(email)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao enviar link mágico.")
      }
      return
    }
    setError(null)
    setLoading(true)
    setSent(false)
    const { error: signInError } = await createBrowserClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/consent`,
      },
    })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  const handleGoogle = async () => {
    if (onGoogleSignIn) {
      await onGoogleSignIn()
      return
    }
    setError(null)
    setLoading(true)
    const { error: signInError } = await createBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/consent`,
      },
    })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    }
  }

  const useHero = heroPanel !== null
  const heroContent = heroPanel ?? (useHero ? <DefaultHeroPanel /> : null)
  const useTestimonials = (testimonials?.length ?? 0) > 0
  const shownTestimonials = testimonials ?? DEFAULT_TESTIMONIALS

  return (
    <div className="flex h-[100dvh] w-[100dvw] flex-col font-geist md:flex-row">
      <section className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="motion-card-enter text-4xl font-semibold leading-tight md:text-5xl">
              {title}
            </h1>
            <p className="motion-card-enter text-sm text-[var(--muted)] [animation-delay:80ms]">
              {description}
            </p>

            <form className="space-y-5" onSubmit={handleMagicLink}>
              <div className="motion-card-enter [animation-delay:160ms]">
                <label
                  htmlFor="bivaque-signin-email"
                  className="block text-sm font-medium text-[var(--muted)]"
                >
                  E-mail
                </label>
                <GlassInputWrapper>
                  <Input
                    id="bivaque-signin-email"
                    type="email"
                    aria-label="E-mail"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-transparent shadow-none"
                  />
                </GlassInputWrapper>
              </div>

              {showPassword !== undefined && (
                <div className="motion-card-enter [animation-delay:200ms]">
                  <label
                    htmlFor="bivaque-signin-password"
                    className="block text-sm font-medium text-[var(--muted)]"
                  >
                    Senha
                  </label>
                  <GlassInputWrapper>
                    <div className="relative">
                      <Input
                        id="bivaque-signin-password"
                        type={showPassword ? "text" : "password"}
                        aria-label="Senha"
                        placeholder="Sua senha"
                        className="bg-transparent shadow-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center pr-3 text-[var(--muted)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 rounded-r-2xl"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>
              )}

              <div className="motion-card-enter [animation-delay:240ms] flex items-center justify-between text-sm">
                <Checkbox name="rememberMe">Manter conectado</Checkbox>
                <button
                  type="button"
                  onClick={onResetPassword}
                  className="min-h-11 text-[var(--accent)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="motion-card-enter w-full min-h-11 [animation-delay:280ms]"
                isDisabled={loading}
              >
                {loading ? "Enviando…" : "Enviar link mágico"}
              </Button>
            </form>

            <div className="motion-card-enter [animation-delay:320ms] relative flex items-center justify-center">
              <Separator className="w-full" />
              <span className="absolute bg-[var(--background)] px-4 text-xs text-[var(--muted)]">
                ou
              </span>
            </div>

            <Button
              onPress={handleGoogle}
              variant="outline"
              className="motion-card-enter flex w-full min-h-11 items-center justify-center gap-3 [animation-delay:360ms]"
              isDisabled={loading}
            >
              <GoogleIcon />
              Continuar com Google
            </Button>

            {error && (
              <FeedbackAlert variant="danger" description={error} className="motion-card-enter" />
            )}

            {sent && useInternalMagicLink && (
              <FeedbackAlert
                variant="success"
                description="Link enviado! Verifique seu e-mail e clique no link para continuar."
                className="motion-card-enter"
              />
            )}

            <p className="motion-card-enter [animation-delay:400ms] text-center text-sm text-[var(--muted)]">
              Ainda não faz parte?{" "}
              <button
                type="button"
                onClick={onCreateAccount}
                className="min-h-11 text-[var(--accent)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:underline"
              >
                Solicitar convite
              </button>
            </p>
          </div>
        </div>
      </section>

      {heroContent && (
        <section className="relative hidden flex-1 p-4 md:block">
          {heroContent}
          {useTestimonials && (
            <div className="absolute bottom-8 left-1/2 flex w-full -translate-x-1/2 justify-center gap-4 px-8">
              {shownTestimonials[0] && (
                <TestimonialCard
                  testimonial={shownTestimonials[0]}
                  delay="[animation-delay:480ms]"
                />
              )}
              {shownTestimonials[1] && (
                <div className="hidden xl:block">
                  <TestimonialCard
                    testimonial={shownTestimonials[1]}
                    delay="[animation-delay:560ms]"
                  />
                </div>
              )}
              {shownTestimonials[2] && (
                <div className="hidden 2xl:block">
                  <TestimonialCard
                    testimonial={shownTestimonials[2]}
                    delay="[animation-delay:640ms]"
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default BivaqueSignIn
