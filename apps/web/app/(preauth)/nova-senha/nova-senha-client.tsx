"use client"

import { Button } from "@heroui/react"
import { Eye, EyeOff, Info, Lock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { passwordProblem } from "../../../lib/auth/password-auth"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import styles from "../recuperar-senha/recuperar-senha.module.css"
import { updatePasswordFromRecoveryAction } from "./actions"

interface NovaSenhaClientProps {
  recoveryReady: boolean
}

/**
 * Definição da senha nova depois de um link de recuperação.
 *
 * O wrapper server-side só entrega `recoveryReady` quando o callback do
 * Supabase criou o intent HttpOnly. A sessão, sozinha, não abre esse formulário:
 * uma sessão comum não deve parecer que uma pessoa pode trocar a senha porque
 * abriu a rota diretamente.
 */
export default function NovaSenhaClient({ recoveryReady }: NovaSenhaClientProps) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [session, setSession] = useState<"ready" | "missing">(recoveryReady ? "ready" : "missing")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading || !recoveryReady) return

    const problem = passwordProblem(password)
    if (problem) {
      setError(problem)
      return
    }

    setError(null)
    setLoading(true)
    try {
      const result = await updatePasswordFromRecoveryAction(password)
      if (!result.ok) {
        if (result.reason === "expired") {
          setSession("missing")
          setError(null)
          return
        }
        setError(
          result.reason === "invalid"
            ? "Use ao menos 8 caracteres, misturando letras e números."
            : "Não foi possível salvar a senha agora. Peça outro link e tente de novo.",
        )
        return
      }
      // R08: senha salva no provedor e devolvida ao destino autorizado. O
      // portão de /consent saiu do produto (ADR-20260907-consentimento-no-
      // cadastro); "/" é resolvido pelo proxy com a sessão da recuperação.
      router.push("/")
    } catch {
      setError("Verifique sua conexão e tente de novo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles["root"]}>
      <div className={styles["panel"]} aria-hidden="true">
        <span className={styles["panelWordmark"]}>BIVAQUE</span>
      </div>
      <div className={styles["formPane"]}>
        <section className={styles["card"]} aria-labelledby="nova-senha-title">
          <h1 id="nova-senha-title">
            {session === "missing" ? "Este link não vale mais" : "Crie uma senha nova"}
          </h1>

          {session === "missing" && (
            <>
              <Info aria-hidden="true" className={styles["stateIcon"]} />
              <p className={styles["lead"]}>
                Links de recuperação valem uma vez só e expiram. Peça outro para continuar de onde
                parou. Se o link já foi usado, a senha que você criou continua valendo — basta
                entrar com ela.
              </p>
              <div className={styles["actions"]}>
                <Link href={{ pathname: "/recuperar-senha" }} className={styles["primaryLink"]}>
                  Pedir outro link
                </Link>
                <Link href={{ pathname: "/login" }} className={styles["outlineLink"]}>
                  Voltar para entrar
                </Link>
              </div>
            </>
          )}

          {session === "ready" && recoveryReady && (
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
      </div>
    </main>
  )
}
