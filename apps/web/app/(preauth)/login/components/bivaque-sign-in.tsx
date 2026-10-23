"use client"

import { CONSENT_VERSION } from "@bivaque/domain"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useRef, useState } from "react"
import { submitEntryFormOnEnter } from "../../../../lib/auth/entry-enter"
import {
  type EntryFieldTarget,
  type EntryFormProblem,
  entryFieldId,
  loginProblem,
  normalizeEntryEmail,
  normalizeEntryName,
  signupProblem,
} from "../../../../lib/auth/entry-form"
import {
  classifySignIn,
  classifySignUp,
  type PasswordAuthView,
  SENHA_REGRA,
} from "../../../../lib/auth/password-auth"
import { sanitizeNext } from "../../../../lib/security/sanitize-next"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { writePendingConfirmation } from "../../../components/auth/resend-clock"
import { EntryError } from "../../../components/entry/entry-error"
import { EntryShell } from "../../../components/entry/entry-shell"
import { EntrySteps } from "../../../components/entry/entry-steps"
import { MaterialFilledButton } from "../../../components/material/filled-button"
import { MaterialOutlinedButton } from "../../../components/material/outlined-button"
import { MaterialOutlinedTextField } from "../../../components/material/outlined-text-field"
import { MaterialPasswordField } from "../../../components/material/password-field"
import { MaterialTextButton } from "../../../components/material/text-button"
import { recordConsentAction } from "../../consent/actions"
import { EntryConsent } from "./entry-consent"
import "./entry-auth.css"

interface BivaqueSignInProps {
  onGoogleSignIn?: () => Promise<void> | void
  mode?: "login" | "signup"
}

// Entrar e criar conta como no protótipo
// (prototypes/bivaque-html/src/features/entry/: `renderEntrySignup` em
// account.js e `renderEntryLogin` em login.js), na pele da casca da PORT-002.
//
// O que veio da especificação, palavra por palavra: o Google no topo com o "ou
// com e-mail" embaixo, "Passo 1 de 3 · Conta" no cadastro, a regra da senha como
// texto de apoio do campo, o aceite com os dois documentos como links e a frase
// do Google ("o aceite vem no passo seguinte"), o pé com a navegação recíproca,
// as mensagens de erro na linha fixa do `.en-err` e o campo que recebe o foco
// quando a validação recusa o passo.
//
// O que NÃO veio, e por quê:
//   - o "Modo teste: use … e qualquer senha" do rodapé do entrar: no Next o
//     provedor é real, e sugerir um endereço de teste numa tela pública é o
//     oposto de anti-enumeração (ADR-20260907-login-com-senha);
//   - o botão desligado até o aceite: a especificação deixa o botão ativo e
//     explica no envio; o portão de verdade é o servidor, que só grava o aceite
//     depois de a conta existir (ADR-20260907-consentimento-no-cadastro);
//   - o `<form>` do protótipo não submete com o Material: o `<button>` do
//     `md-filled-button` vive no shadow root e não tem form owner. O envio é o
//     `onSubmit` + o Enter tratado no `onKeyDown`, e o botão é `type="submit"`
//     porque o componente é form-associated — o clique pede o submit do form.
const entryCopy = {
  login: {
    title: "Que bom ter você de volta.",
    submit: "Entrar",
    loading: "Entrando...",
    google: "Continuar com Google",
    googleLoading: "Abrindo Google...",
    alternateLabel: "Criar conta",
    alternateHref: "/signup",
    footLead: "",
    // `entryTop('')`: o topo da tela de entrar sai da entrada e volta à
    // apresentação pública, como no protótipo.
    topLabel: "Sair",
    topHref: "/",
  },
  signup: {
    title: "Vamos começar.",
    submit: "Criar conta",
    loading: "Criando conta...",
    google: "Continuar com Google",
    googleLoading: "Abrindo Google...",
    alternateLabel: "Entrar",
    alternateHref: "/login",
    footLead: "Já tem conta?",
    // `entryTop('','entrar')`: o cadastro leva ao entrar pelo topo.
    topLabel: "Entrar",
    topHref: "/login",
  },
} as const

export function BivaqueSignIn({ onGoogleSignIn, mode = "login" }: BivaqueSignInProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [accepted, setAccepted] = useState(false)
  const [result, setResult] = useState<PasswordAuthView | null>(null)
  const [problem, setProblem] = useState<EntryFormProblem | null>(null)
  const [loading, setLoading] = useState<"form" | "google" | null>(null)
  // Dois cliques dentro do mesmo tick lêem o mesmo `loading` (estado do React
  // atualiza depois); o ref muda na hora e é o que segura a segunda request.
  const submittingRef = useRef(false)

  const copy = entryCopy[mode]

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

  // O protótipo põe o foco no campo que recusou o passo
  // (`entryError(texto, idDoCampo)`), para quem usa leitor de tela ou teclado
  // não ter de procurar onde está o problema.
  const showProblem = (found: EntryFormProblem) => {
    setProblem(found)
    setResult(null)
    const field = document.getElementById(entryFieldId(found.target, mode))
    field?.focus({ preventScroll: false })
  }

  const clearProblem = (target: EntryFieldTarget) => {
    setProblem((current) => (current?.target === target ? null : current))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Envio em andamento não duplica: teclar Enter com o request voando já
    // contou duas vezes contra o provedor em outras telas desta base.
    if (submittingRef.current) return
    submittingRef.current = true
    setResult(null)
    setProblem(null)

    // No cadastro a senha e o aceite são conferidos antes de sair daqui: mandar
    // o servidor recusar uma senha curta é uma ida e volta que a pessoa não
    // precisa esperar, e o aceite é condição de a conta existir. No entrar não
    // se valida formato de senha — a senha antiga pode ter qualquer forma, e
    // recusá-la aqui contaria que ela não é a atual.
    const found =
      mode === "signup"
        ? signupProblem({ accepted, email, name, password })
        : loginProblem({ email, password })
    if (found) {
      submittingRef.current = false
      showProblem(found)
      return
    }

    setLoading("form")
    const supabase = createBrowserClient()

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizeEntryEmail(email),
          password,
          options: {
            data: { display_name: normalizeEntryName(name) },
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
            writePendingConfirmation({ email: normalizeEntryEmail(email), lastResendAt: null })
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
          email: normalizeEntryEmail(email),
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
        // `fail()` na especificação apaga a senha digitada: credencial recusada
        // não fica no campo para quem chegar depois na mesma tela.
        setPassword("")
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
    setProblem(null)
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
    <EntryShell
      action={
        <MaterialTextButton href={copy.topHref} type="button">
          {copy.topLabel}
        </MaterialTextButton>
      }
    >
      {/* `noValidate` de propósito: os campos levam `required` (o leitor de tela
          anuncia o campo obrigatório e o gerenciador de senhas o reconhece), mas
          quem valida e explica é esta tela, na ordem da especificação. Sem
          `noValidate` o navegador abre o balão nativo dele e a mensagem da
          especificação nunca aparece. */}
      <form
        className="en-form"
        noValidate
        onKeyDown={submitEntryFormOnEnter}
        onSubmit={handleSubmit}
      >
        {mode === "signup" && <EntrySteps label="Conta" step={1} />}
        <h1 className="en-h1">{copy.title}</h1>

        <MaterialOutlinedButton
          disabled={loading !== null ? true : undefined}
          onClick={handleGoogle}
          type="button"
        >
          {loading === "google" ? copy.googleLoading : copy.google}
        </MaterialOutlinedButton>
        <p className="en-or">ou com e-mail</p>

        {mode === "signup" && (
          <MaterialOutlinedTextField
            autocomplete="name"
            error={problem?.target === "name" ? true : undefined}
            id="en-name"
            label="Nome"
            maxlength={80}
            minlength={2}
            onChange={(value) => {
              setName(value)
              clearProblem("name")
            }}
            required
            value={name}
          />
        )}

        <MaterialOutlinedTextField
          autocomplete="email"
          error={problem?.target === "email" ? true : undefined}
          id="en-email"
          inputmode="email"
          label="E-mail"
          onChange={(value) => {
            setEmail(value)
            clearProblem("email")
          }}
          required
          type="email"
          value={email}
        />

        <MaterialPasswordField
          autocomplete={mode === "signup" ? "new-password" : "current-password"}
          error={problem?.target === "password" ? true : undefined}
          id={mode === "signup" ? "en-pass" : "en-pass-login"}
          label="Senha"
          onChange={(value) => {
            setPassword(value)
            clearProblem("password")
          }}
          required
          supportingText={mode === "signup" ? SENHA_REGRA : undefined}
          value={password}
        />

        {mode === "signup" && (
          <EntryConsent
            checked={accepted}
            note="google"
            onChange={(checked) => {
              setAccepted(checked)
              clearProblem("consent")
            }}
          />
        )}

        <EntryError id="en-err">
          {problem ? (
            problem.message
          ) : result && result.outcome !== "ok" ? (
            <>
              {result.message}
              {result.suggestSignIn ? (
                <>
                  {" Use "}
                  <Link href={{ pathname: "/login" }}>Entrar</Link>
                  {" ou "}
                  <Link href={{ pathname: "/recuperar-senha" }}>recupere a senha</Link>.
                </>
              ) : null}
            </>
          ) : null}
        </EntryError>

        <MaterialFilledButton disabled={loading === "form" ? true : undefined} type="submit">
          {loading === "form" ? copy.loading : copy.submit}
        </MaterialFilledButton>

        <p className="en-foot">
          {mode === "login" ? (
            <>
              {/* `renderEntryLogin`: os dois caminhos de texto, recuperar e criar,
                  na ordem da especificação. */}
              <MaterialTextButton href="/recuperar-senha" type="button">
                Esqueci minha senha
              </MaterialTextButton>
              <MaterialTextButton href={copy.alternateHref} type="button">
                {copy.alternateLabel}
              </MaterialTextButton>
            </>
          ) : (
            <>
              {copy.footLead}{" "}
              <MaterialTextButton href={copy.alternateHref} type="button">
                {copy.alternateLabel}
              </MaterialTextButton>
            </>
          )}
        </p>
      </form>
    </EntryShell>
  )
}

export default BivaqueSignIn
