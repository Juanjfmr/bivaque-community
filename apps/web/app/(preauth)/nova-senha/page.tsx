"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { submitEntryFormOnEnter } from "../../../lib/auth/entry-enter"
import { passwordProblem, SENHA_REGRA, SENHA_REGRA_ERRO } from "../../../lib/auth/password-auth"
import { createBrowserClient } from "../../../lib/supabase/client"
import { EntryError } from "../../components/entry/entry-error"
import { EntryShell } from "../../components/entry/entry-shell"
import { MaterialFilledButton } from "../../components/material/filled-button"
import { MaterialPasswordField } from "../../components/material/password-field"
import { MaterialTextButton } from "../../components/material/text-button"
import "../login/components/entry-auth.css"

/**
 * Definição da senha nova, depois do link de recuperação.
 *
 * Chega aqui com sessão: `/auth/callback` já trocou o código do link por
 * sessão antes de redirecionar. Sem sessão, esta tela não tem o que fazer — o
 * link expirou, já foi usado, ou alguém abriu a rota direto — e diz isso em vez
 * de apresentar um formulário que vai falhar no envio.
 *
 * A especificação do protótipo não tem esta tela: lá o link do e-mail cria a
 * senha. Aqui ela existe porque o provedor entrega uma sessão de recuperação e
 * a senha é salva por `updateUser`. A casca, o campo de senha com a regra como
 * apoio e a linha de erro são os da entrada, para a pessoa não mudar de mundo
 * no meio do caminho.
 */
export default function NovaSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [session, setSession] = useState<"checking" | "ready" | "missing">("checking")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    createBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active) setSession(data.session ? "ready" : "missing")
      })
      .catch(() => {
        if (active) setSession("missing")
      })
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // A regra é a mesma do cadastro (`SENHA_REGRA_ERRO`), dita aqui com o
    // apoio do campo em vez de uma frase própria.
    if (passwordProblem(password) !== null) {
      setError(SENHA_REGRA_ERRO)
      return
    }

    setError(null)
    setLoading(true)
    try {
      const { error: updateError } = await createBrowserClient().auth.updateUser({ password })
      if (updateError) {
        setError("Não foi possível salvar a senha agora. Peça outro link e tente de novo.")
        return
      }
      // R08: senha salva no provedor e devolvida ao destino autorizado. O
      // portão de /consent saiu do produto (ADR-20260907-consentimento-no-
      // cadastro); "/" é resolvido pelo proxy com a sessão da recuperação —
      // onboarding para quem ainda não concluiu, início para quem já é membro.
      router.push("/")
    } catch {
      setError("Verifique sua conexão e tente de novo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <EntryShell backHref="/login">
      {session === "ready" ? (
        <form
          className="en-form"
          noValidate
          onKeyDown={submitEntryFormOnEnter}
          onSubmit={handleSubmit}
        >
          <h1 className="en-h1">Crie uma senha nova</h1>

          <MaterialPasswordField
            autocomplete="new-password"
            error={error !== null ? true : undefined}
            id="en-pass"
            label="Senha nova"
            onChange={(value) => {
              setPassword(value)
              setError(null)
            }}
            required
            supportingText={SENHA_REGRA}
            value={password}
          />

          <EntryError id="en-err">{error}</EntryError>

          <MaterialFilledButton disabled={loading ? true : undefined} type="submit">
            {loading ? "Salvando..." : "Salvar senha"}
          </MaterialFilledButton>
        </form>
      ) : (
        <div className="en-form">
          <h1 className="en-h1">
            {session === "missing" ? "Este link não vale mais" : "Crie uma senha nova"}
          </h1>

          {session === "checking" ? <p className="en-lead">Conferindo seu link...</p> : null}

          {session === "missing" ? (
            <>
              <p className="en-lead">
                Links de recuperação valem uma vez só e expiram. Peça outro para continuar de onde
                parou. Se o link já foi usado, a senha que você criou continua valendo — basta
                entrar com ela.
              </p>
              <MaterialFilledButton href="/recuperar-senha" type="button">
                Pedir outro link
              </MaterialFilledButton>
              <MaterialTextButton href="/login" type="button">
                Voltar para entrar
              </MaterialTextButton>
            </>
          ) : null}
        </div>
      )}
    </EntryShell>
  )
}
