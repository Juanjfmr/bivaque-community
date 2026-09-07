"use client"

import { Button } from "@heroui/react"
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Tent,
  User,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  classifySignIn,
  classifySignUp,
  type PasswordAuthView,
  passwordProblem,
} from "../../../../lib/auth/password-auth"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import styles from "./bivaque-sign-in.module.css"

interface BivaqueSignInProps {
  onGoogleSignIn?: () => Promise<void> | void
  mode?: "login" | "signup"
}

const entryCopy = {
  login: {
    eyebrow: "Bem-vindo de volta",
    title: "Entre no Bivaque",
    description: "Use seu e-mail e sua senha para continuar.",
    submit: "Entrar",
    google: "Continuar com Google",
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
    title: "Crie sua conta",
    description: "Escolha uma senha para entrar sempre que quiser, sem depender do e-mail.",
    submit: "Criar conta",
    google: "Criar com Google",
    alternateLead: "Já tem uma conta?",
    alternateAction: "Entrar",
    alternateHref: "/login",
    trust: "Depois da conta: regras da comunidade, elegibilidade e escolha da sua localidade.",
    visualEyebrow: "Há sempre alguém chegando.",
    visualTitle: "Encontre quem já conhece o caminho.",
    visualDescription: "Com o tempo, deixe o que você aprendeu disponível para quem chegar depois.",
  },
} as const

// As duas entradas são destinos distintos, não abas de um formulário só:
// a escolha muda a rota, os campos e a operação no provedor. Manter isso como
// navegação preserva voltar/avançar e link compartilhável.
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

export function BivaqueSignIn({ onGoogleSignIn, mode = "login" }: BivaqueSignInProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [result, setResult] = useState<PasswordAuthView | null>(null)
  const [loading, setLoading] = useState<"form" | "google" | null>(null)

  const copy = entryCopy[mode]
  const titleId = mode === "signup" ? "signup-title" : "login-title"
  const prefix = mode === "signup" ? "bivaque-signup" : "bivaque-signin"

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResult(null)

    // No cadastro a senha é conferida antes de sair daqui: mandar o servidor
    // recusar uma senha curta é uma ida e volta que a pessoa não precisa
    // esperar. No login não se valida formato — a senha antiga pode ter
    // qualquer forma, e recusá-la aqui contaria que ela não é a atual.
    if (mode === "signup") {
      const problem = passwordProblem(password)
      if (problem) {
        setResult({ outcome: "weak-password", message: problem, diagnostic: "local" })
        return
      }
    }

    setLoading("form")
    const supabase = createBrowserClient()

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        })
        const view = classifySignUp(error)
        if (view.outcome === "ok") {
          router.push("/consent")
          return
        }
        setResult(view)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        const view = classifySignIn(error)
        if (view.outcome === "ok") {
          router.push("/consent")
          return
        }
        setResult(view)
      }
    } catch (thrown) {
      setResult(mode === "signup" ? classifySignUp(thrown) : classifySignIn(thrown))
    } finally {
      setLoading(null)
    }
  }

  const handleGoogle = async () => {
    setResult(null)
    setLoading("google")

    try {
      if (onGoogleSignIn) {
        await onGoogleSignIn()
      } else {
        const { error } = await createBrowserClient().auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback?next=/consent` },
        })
        if (error) throw error
      }
    } catch (thrown) {
      setResult(classifySignIn(thrown))
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

          <form className={styles["form"]} onSubmit={handleSubmit}>
            {mode === "signup" && (
              <label className={styles["field"]} htmlFor={`${prefix}-name`}>
                <span>Como podemos chamar você?</span>
                <span className={styles["inputShell"]}>
                  <User aria-hidden="true" />
                  <input
                    id={`${prefix}-name`}
                    type="text"
                    autoComplete="name"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </span>
              </label>
            )}

            <label className={styles["field"]} htmlFor={`${prefix}-email`}>
              <span>Seu e-mail</span>
              <span className={styles["inputShell"]}>
                <Mail aria-hidden="true" />
                <input
                  id={`${prefix}-email`}
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

            <label className={styles["field"]} htmlFor={`${prefix}-password`}>
              <span>Sua senha</span>
              <span className={styles["inputShell"]}>
                <Lock aria-hidden="true" />
                <input
                  id={`${prefix}-password`}
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder={mode === "signup" ? "Ao menos 8 caracteres" : "Sua senha"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                {/* Ver a senha digitada é acessibilidade antes de ser conveniência:
                    quem tem dificuldade motora ou visual erra mais em campo mascarado. */}
                <button
                  type="button"
                  className={styles["revealButton"]}
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </label>

            {mode === "login" && (
              <p className={styles["forgotRow"]}>
                <Link href={{ pathname: "/recuperar-senha" }}>Esqueci minha senha</Link>
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              className={styles["primaryButton"] ?? ""}
              isDisabled={loading !== null}
            >
              {loading === "form" ? "Entrando..." : copy.submit}
              {loading !== "form" && <ArrowRight aria-hidden="true" />}
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

          {result && result.outcome !== "ok" && (
            <FeedbackAlert
              variant={result.outcome === "offline" ? "warning" : "danger"}
              description={
                result.suggestSignIn ? (
                  <>
                    {result.message} <Link href={{ pathname: "/login" }}>Entrar</Link>
                  </>
                ) : (
                  result.message
                )
              }
            />
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
