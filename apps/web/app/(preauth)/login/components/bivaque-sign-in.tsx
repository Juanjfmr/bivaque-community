"use client"

import { CONSENT_VERSION } from "@bivaque/domain"
import { Button } from "@heroui/react"
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useRef, useState } from "react"
import {
  classifySignIn,
  classifySignUp,
  type PasswordAuthView,
  passwordProblem,
} from "../../../../lib/auth/password-auth"
import { sanitizeNext } from "../../../../lib/security/sanitize-next"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { writePendingConfirmation } from "../../../components/auth/resend-clock"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { recordConsentAction } from "../../consent/actions"
import styles from "./bivaque-sign-in.module.css"

interface BivaqueSignInProps {
  onGoogleSignIn?: () => Promise<void> | void
  mode?: "login" | "signup"
}

// Composição da prancha 36-web-auth-entrada (guia visual de 06/09/2026): dois
// destinos distintos, cada um com seu título, e a navegação recíproca nos links
// de rodapé — não abas de um formulário só. O mecanismo é o de ADR-20260907-
// login-com-senha (instrução posterior à prancha, que precisa ser regerada):
// e-mail e senha, Google como alternativa, recuperação por link de e-mail. A
// copy da prancha que descrevia "Receber código" não entra: o provedor não
// envia código, e a guia proíbe prometer integração inexistente.
const entryCopy = {
  login: {
    title: "Que bom ter você de volta.",
    submit: "Entrar",
    loading: "Entrando...",
    google: "Continuar com Google",
    alternateLabel: "Criar conta",
    alternateHref: "/signup",
  },
  signup: {
    title: "Vamos começar.",
    submit: "Criar conta",
    loading: "Criando conta...",
    google: "Continuar com Google",
    alternateLabel: "Já tenho conta",
    alternateHref: "/login",
  },
} as const

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

// A prancha mostra a marca como wordmark tipográfico sobre a foto, sem ícone.
// No topo mobile, onde a foto não aparece, o mesmo wordmark assume o papel de
// link para o início.
function Wordmark({ onPhoto = false }: { onPhoto?: boolean }) {
  return (
    <span className={styles["wordmark"]} data-photo={onPhoto ? "true" : undefined}>
      BIVAQUE
    </span>
  )
}

export function BivaqueSignIn({ onGoogleSignIn, mode = "login" }: BivaqueSignInProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [result, setResult] = useState<PasswordAuthView | null>(null)
  const [loading, setLoading] = useState<"form" | "google" | null>(null)
  // Dois cliques dentro do mesmo tick lêem o mesmo `loading` (estado do React
  // atualiza depois); o ref muda na hora e é o que segura a segunda request.
  const submittingRef = useRef(false)

  const copy = entryCopy[mode]
  const titleId = mode === "signup" ? "signup-title" : "login-title"
  const prefix = mode === "signup" ? "bivaque-signup" : "bivaque-signin"

  // Destino pós-entrada: o proxy anota ?redirect= quando devolve alguém para cá.
  // Aceita só rota interna — sanitize-next rejeita absoluta, //host e
  // javascript: — e na ausência cai no funil de onboarding, que é o caminho
  // atual. Sem isso, o destino seria sempre /onboarding mesmo quando a pessoa
  // foi expulsa de uma rota específica para a tela de entrar.
  const destination = (): string | null => {
    const raw = searchParams.get("redirect")
    if (raw === null || raw === "") return null
    const clean = sanitizeNext(raw)
    return clean === "/" ? null : clean
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Envio em andamento não duplica: teclar Enter com o request voando já
    // contou duas vezes contra o provedor em outras telas desta base.
    if (submittingRef.current) return
    submittingRef.current = true
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
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() },
            // Quando o provedor exige confirmação, o link nasce daqui e volta
            // pelo callback com o marcador do aceite. O endereço viaja dentro
            // do link assinado pelo servidor, nunca em query da nossa tela.
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/confirmar-email&consent=${encodeURIComponent(String(CONSENT_VERSION))}`,
          },
        })
        const view = classifySignUp(error)
        if (view.outcome === "ok") {
          if (!data.session) {
            // R03 → R04: conta criada mas o provedor quer o e-mail confirmado
            // antes de existir sessão. Sem sessão não há como gravar o aceite
            // agora — ele é registrado pelo callback, no link acima. A flag
            // local só ecoa o endereço para a tela de confirmação; não é
            // prova nem promessa de envio: quem manda o e-mail é o servidor.
            writePendingConfirmation({ email: email.trim(), lastResendAt: null })
            router.push("/auth/confirmar-email")
            return
          }
          // O aceite e' condicao de existir a conta, entao e' gravado antes de
          // a pessoa seguir. Se a gravacao falhar, ela fica na tela sabendo —
          // seguir sem registro deixaria um aceite que ninguem pode provar.
          try {
            await recordConsentAction()
          } catch {
            setResult({
              outcome: "failed",
              message: "Conta criada, mas não foi possível registrar o aceite. Tente entrar.",
              diagnostic: "consent",
            })
            return
          }
          const destinoCadastro = destination()
          if (destinoCadastro !== null) {
            // Navegação completa, não push client-side: o destino pode ser uma
            // rota protegida, e o cookie de sessão que o client escreve só é
            // garantido no próximo request do documento.
            window.location.assign(destinoCadastro)
            return
          }
          router.push("/onboarding")
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
          const destinoLogin = destination()
          if (destinoLogin !== null) {
            window.location.assign(destinoLogin)
            return
          }
          router.push("/onboarding")
          return
        }
        setResult(view)
      }
    } catch (thrown) {
      setResult(mode === "signup" ? classifySignUp(thrown) : classifySignIn(thrown))
    } finally {
      submittingRef.current = false
      setLoading(null)
    }
  }

  const handleGoogle = async () => {
    if (loading !== null) return
    setResult(null)
    setLoading("google")

    try {
      if (onGoogleSignIn) {
        await onGoogleSignIn()
      } else {
        const { error } = await createBrowserClient().auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination() ?? "/onboarding")}`,
          },
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
          <div className={styles["heading"]}>
            <h1 id={titleId}>{copy.title}</h1>
          </div>

          <form className={styles["form"]} onSubmit={handleSubmit}>
            {mode === "signup" && (
              // A nota da prancha 36 é explícita: nome de apresentação, não
              // nome civil completo. O rótulo simples diz isso sem prometer o
              // que o campo não exige.
              <label className={styles["field"]} htmlFor={`${prefix}-name`}>
                <span>Nome</span>
                <span className={styles["inputShell"]}>
                  <User aria-hidden="true" />
                  <input
                    id={`${prefix}-name`}
                    type="text"
                    autoComplete="name"
                    placeholder="Como você quer ser chamado"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </span>
              </label>
            )}

            <label className={styles["field"]} htmlFor={`${prefix}-email`}>
              <span>E-mail</span>
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
              <span>Senha</span>
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

            {mode === "signup" && (
              // O texto vem da versão aprovada (ADR-20260907-consentimento-no-
              // cadastro), não da prancha: "Termos de uso" e "Código de
              // convivência" não têm rota nem texto aprovado, e a guia proíbe
              // tirar copy legal de imagem.
              <label className={styles["consentRow"]} htmlFor={`${prefix}-consent`}>
                <input
                  id={`${prefix}-consent`}
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  required
                />
                <span>
                  Li e aceito a{" "}
                  <Link href={{ pathname: "/privacidade" }} target="_blank" rel="noreferrer">
                    Política de privacidade
                  </Link>{" "}
                  e o{" "}
                  <Link href={{ pathname: "/codigo-de-conduta" }} target="_blank" rel="noreferrer">
                    Código de conduta
                  </Link>
                  .
                </span>
              </label>
            )}

            <Button
              type="submit"
              variant="primary"
              className={styles["primaryButton"] ?? ""}
              isDisabled={loading !== null || (mode === "signup" && !accepted)}
            >
              {loading === "form" ? copy.loading : copy.submit}
            </Button>
          </form>

          <div className={styles["divider"]}>
            <span>ou</span>
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

          <p className={styles["entryLinks"]} data-mode={mode}>
            <Link href={{ pathname: copy.alternateHref }}>{copy.alternateLabel}</Link>
            {mode === "login" && (
              <Link href={{ pathname: "/recuperar-senha" }}>Esqueci minha senha</Link>
            )}
          </p>
        </div>
      </section>

      {/* Sem aria-hidden: no desktop este é o único link de marca (a topbar é
          ocultada em CSS), e esconder um elemento focável da tecnologia
          assistiva é o erro que a regra de acessibilidade proíbe. */}
      <section className={styles["visualPanel"]}>
        <Image
          src="/landing/hero-bivaque-arrival.webp"
          alt=""
          fill
          priority
          unoptimized
          sizes="50vw"
        />
        <div className={styles["visualShade"]} aria-hidden="true" />
        <Link href="/" className={styles["photoBrand"]} aria-label="Bivaque, voltar ao início">
          <Wordmark onPhoto />
        </Link>
      </section>
    </main>
  )
}

export default BivaqueSignIn
