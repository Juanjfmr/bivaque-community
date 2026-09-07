"use client"

import { Button } from "@heroui/react"
import { Eye, EyeOff, Lock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { passwordProblem } from "../../../lib/auth/password-auth"
import { createBrowserClient } from "../../../lib/supabase/client"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import styles from "../recuperar-senha/recuperar-senha.module.css"

/**
 * Definição da senha nova, depois do link de recuperação.
 *
 * Chega aqui com sessão: `/auth/callback` já trocou o código do link por
 * sessão antes de redirecionar. Sem sessão, esta tela não tem o que fazer — o
 * link expirou, já foi usado, ou alguém abriu a rota direto — e diz isso em vez
 * de apresentar um formulário que vai falhar no envio.
 */
export default function NovaSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    const problem = passwordProblem(password)
    if (problem) {
      setError(problem)
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
      router.push("/consent")
    } catch {
      setError("Verifique sua conexão e tente de novo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles["root"]}>
      <section className={styles["card"]} aria-labelledby="nova-senha-title">
        <h1 id="nova-senha-title">Crie uma senha nova</h1>

        {session === "checking" && <p className={styles["lead"]}>Conferindo seu link...</p>}

        {session === "missing" && (
          <>
            <FeedbackAlert
              variant="danger"
              title="Este link não vale mais"
              description="Links de recuperação valem uma vez só e expiram. Peça outro para continuar."
            />
            <Link href={{ pathname: "/recuperar-senha" }} className={styles["back"]}>
              <span>Pedir outro link</span>
            </Link>
          </>
        )}

        {session === "ready" && (
          <>
            <p className={styles["lead"]}>
              Use ao menos 8 caracteres, misturando letras e números. Uma frase que só você lembra
              funciona melhor do que uma palavra curta e complicada.
            </p>

            <form className={styles["form"]} onSubmit={handleSubmit}>
              <label className={styles["field"]} htmlFor="nova-senha">
                <span>Senha nova</span>
                <span className={styles["inputShell"]}>
                  <Lock aria-hidden="true" />
                  <input
                    id="nova-senha"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Ao menos 8 caracteres"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
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

              <Button
                type="submit"
                variant="primary"
                className={styles["primaryButton"] ?? ""}
                isDisabled={loading}
              >
                {loading ? "Salvando..." : "Salvar senha"}
              </Button>
            </form>

            {error && <FeedbackAlert variant="danger" description={error} />}
          </>
        )}
      </section>
    </main>
  )
}
