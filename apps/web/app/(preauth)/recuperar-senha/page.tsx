"use client"

import { Button } from "@heroui/react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { classifyEntrySend } from "../../../lib/auth/entry-send"
import { createBrowserClient } from "../../../lib/supabase/client"
import { computeResendCooldown, formatCountdown } from "../../components/auth/resend-clock"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import styles from "./recuperar-senha.module.css"

/**
 * Pedido de recuperação de senha.
 *
 * A resposta é sempre a mesma, tenha o endereço conta ou não. Aqui, ao
 * contrário do login, o provedor NÃO neutraliza por conta própria — quem pede
 * recuperação de um e-mail sem conta receberia um erro distinto, e isso
 * entregaria a lista de membros a quem digitasse endereços. Ver
 * ADR-20260907-login-com-senha.
 *
 * O que NÃO pode virar "enviado": limite de reenvio e falha de rede. São
 * distinguíveis da resposta neutra (R07) porque não falam sobre a conta — o
 * classificador compartilhado de entry-send decide, com o cooldown real do
 * servidor em precedência sobre a janela padrão.
 */
export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(false)
  const submittingRef = useRef(false)
  const [cooldown, setCooldown] = useState(0)
  const [limite, setLimite] = useState<string | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  const [linkExpired, setLinkExpired] = useState(false)

  useEffect(() => {
    setLinkExpired(new URLSearchParams(window.location.search).get("origem") === "link")
  }, [])

  const counting = cooldown > 0
  useEffect(() => {
    if (!counting) return
    const timer = setInterval(() => {
      setCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1))
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [counting])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current || loading || cooldown > 0) return
    submittingRef.current = true
    setLoading(true)
    setOffline(false)
    setLimite(null)
    setFalha(null)

    try {
      const { error } = await createBrowserClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/nova-senha`,
      })
      const view = classifyEntrySend(error)
      if (view.outcome === "sent") {
        // Neutro: "sent" cobre conta existente, inexistente e erro que fala da
        // conta sem distinguir. O cooldown ecoa a janela do provedor.
        setSent(true)
        setCooldown(computeResendCooldown({ lastResendAt: Date.now(), now: Date.now() }))
      } else if (view.outcome === "rate-limited") {
        // O número veio do servidor (429/Retry-After) quando havia; senão, a
        // janela padrão. Nos dois casos é o limite do provedor, não contagem
        // de enfeite.
        setLimite(view.message)
        setCooldown(
          computeResendCooldown({
            lastResendAt: null,
            serverSeconds: view.retryAfterSeconds ?? null,
            now: Date.now(),
          }),
        )
      } else if (view.outcome === "offline") {
        setOffline(true)
      } else {
        setFalha(view.message)
      }
    } catch {
      // Só falha de transporte chega aqui; erro do provedor vem no `error` e é
      // deliberadamente neutralizado pelo classificador, para a resposta não
      // depender da conta existir.
      setOffline(true)
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <main className={styles["root"]}>
      <div className={styles["panel"]} aria-hidden="true">
        <span className={styles["panelWordmark"]}>BIVAQUE</span>
      </div>
      <div className={styles["formPane"]}>
        <section className={styles["card"]} aria-labelledby="recuperar-title">
          <h1 id="recuperar-title">Esqueceu sua senha?</h1>
          <p className={styles["lead"]}>
            Digite seu e-mail. Enviamos um link para você criar uma senha nova.
          </p>

          {linkExpired && (
            <FeedbackAlert
              variant="warning"
              title="O link expirou"
              description="Peça um novo link para continuar. O endereço não precisa ser confirmado novamente."
            />
          )}

          <form className={styles["form"]} onSubmit={handleSubmit}>
            <label className={styles["field"]} htmlFor="recuperar-email">
              <span>Seu e-mail</span>
              <span className={styles["inputShell"]}>
                <input
                  id="recuperar-email"
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
              isDisabled={loading || cooldown > 0}
            >
              {loading
                ? "Enviando..."
                : cooldown > 0
                  ? `Aguarde ${formatCountdown(cooldown)}`
                  : "Enviar link"}
            </Button>
          </form>

          <Link href={{ pathname: "/login" }} className={styles["back"]}>
            <ArrowLeft aria-hidden="true" />
            <span>Voltar para entrar</span>
          </Link>

          {offline && (
            <FeedbackAlert
              variant="warning"
              title="Sem conexão"
              description="Verifique sua conexão e tente de novo."
            />
          )}

          {limite && <FeedbackAlert variant="warning" description={limite} />}

          {falha && <FeedbackAlert variant="danger" description={falha} />}

          {sent && (
            <FeedbackAlert
              variant="success"
              title="Confira seu e-mail"
              description={`Se ${email} puder entrar no Bivaque, o link para criar uma senha nova já está a caminho. Confira também o spam.`}
            />
          )}
        </section>
      </div>
    </main>
  )
}
