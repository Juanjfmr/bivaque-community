"use client"

import { Button } from "@heroui/react"
import { ArrowLeft, Mail } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
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
 */
export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setOffline(false)

    try {
      await createBrowserClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/nova-senha`,
      })
      setSent(true)
    } catch {
      // Só falha de transporte chega aqui; erro do provedor vem no `error` e é
      // deliberadamente ignorado, para a resposta não depender da conta existir.
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles["root"]}>
      <section className={styles["card"]} aria-labelledby="recuperar-title">
        <Link href={{ pathname: "/login" }} className={styles["back"]}>
          <ArrowLeft aria-hidden="true" />
          <span>Voltar para entrar</span>
        </Link>

        <h1 id="recuperar-title">Esqueceu sua senha?</h1>
        <p className={styles["lead"]}>
          Digite seu e-mail. Enviamos um link para você criar uma senha nova.
        </p>

        <form className={styles["form"]} onSubmit={handleSubmit}>
          <label className={styles["field"]} htmlFor="recuperar-email">
            <span>Seu e-mail</span>
            <span className={styles["inputShell"]}>
              <Mail aria-hidden="true" />
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
            isDisabled={loading}
          >
            {loading ? "Enviando..." : "Enviar link"}
          </Button>
        </form>

        {offline && (
          <FeedbackAlert
            variant="warning"
            title="Sem conexão"
            description="Verifique sua conexão e tente de novo."
          />
        )}

        {sent && (
          <FeedbackAlert
            variant="success"
            title="Confira seu e-mail"
            description={`Se ${email} puder entrar no Bivaque, o link para criar uma senha nova já está a caminho. Confira também o spam.`}
          />
        )}
      </section>
    </main>
  )
}
