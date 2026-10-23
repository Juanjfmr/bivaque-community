"use client"

import { useEffect, useState } from "react"
import { submitEntryFormOnEnter } from "../../../lib/auth/entry-enter"
import { isEntryEmailOk, normalizeEntryEmail } from "../../../lib/auth/entry-form"
import { classifyEntrySend } from "../../../lib/auth/entry-send"
import { createBrowserClient } from "../../../lib/supabase/client"
import { computeResendCooldown, formatCountdown } from "../../components/auth/resend-clock"
import { EntryError } from "../../components/entry/entry-error"
import { EntryShell } from "../../components/entry/entry-shell"
import { MaterialFilledButton } from "../../components/material/filled-button"
import { MaterialIcon } from "../../components/material/material-icon"
import { MaterialOutlinedTextField } from "../../components/material/outlined-text-field"
import { MaterialTextButton } from "../../components/material/text-button"
import "../login/components/entry-auth.css"

/**
 * Pedido de recuperação de senha, como `renderEntryForgot` em
 * `prototypes/bivaque-html/src/features/entry/login.js`: "Recuperar a senha.",
 * o envio, e o painel neutro depois do envio com "Voltar para entrar" e "Usar
 * outro e-mail".
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
 * servidor em precedência sobre a janela padrão. O protótipo não tem esses dois
 * estados; eles ficam porque são comportamento do provedor, não enfeite.
 */
export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [limite, setLimite] = useState<string | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  // Só o erro do próprio campo pinta o campo de vermelho. Limite de reenvio e
  // falha de rede são do provedor e do transporte: marcar o e-mail como errado
  // por causa deles culparia quem digitou certo.
  const [fieldError, setFieldError] = useState(false)

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
    if (loading || cooldown > 0) return
    setLoading(true)
    setOffline(false)
    setLimite(null)
    setFalha(null)
    setFieldError(false)

    // `entry-forgot-submit`: endereço torto não sai para o provedor.
    if (!isEntryEmailOk(normalizeEntryEmail(email))) {
      setFalha("Confira o e-mail.")
      setFieldError(true)
      setLoading(false)
      return
    }

    try {
      const { error } = await createBrowserClient().auth.resetPasswordForEmail(
        normalizeEntryEmail(email),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/nova-senha`,
        },
      )
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
      setLoading(false)
    }
  }

  const problem = offline ? "Verifique sua conexão e tente de novo." : (limite ?? falha ?? null)

  // `entry-go senha` no protótipo volta para a mesma tela limpa: é o que "Usar
  // outro e-mail" faz.
  const startOver = () => {
    setSent(false)
    setEmail("")
    setOffline(false)
    setLimite(null)
    setFalha(null)
    setFieldError(false)
  }

  return (
    <EntryShell backHref="/login">
      {sent ? (
        <div className="en-form">
          <h1 className="en-h1">Recuperar a senha.</h1>
          <p className="en-ok" role="status">
            <MaterialIcon name="check_circle" />
            {`Se ${email} puder entrar no Bivaque, o link para criar uma nova senha já está a caminho. Confira também o spam.`}
          </p>
          <MaterialFilledButton href="/login" type="button">
            Voltar para entrar
          </MaterialFilledButton>
          <MaterialTextButton onClick={startOver} type="button">
            Usar outro e-mail
          </MaterialTextButton>
        </div>
      ) : (
        // `noValidate`: a validação e a mensagem são desta tela, na frase do
        // protótipo; o balão nativo do navegador não tem tradução nem ordem.
        <form
          className="en-form"
          noValidate
          onKeyDown={submitEntryFormOnEnter}
          onSubmit={handleSubmit}
        >
          <h1 className="en-h1">Recuperar a senha.</h1>
          <p className="en-lead">Mandamos um link para criar uma senha nova.</p>

          <MaterialOutlinedTextField
            autocomplete="email"
            // `false` não vai: num elemento customizado o React escreve
            // `error="false"`, e o Material lê qualquer valor presente como
            // verdadeiro. `undefined` some do HTML e mantém o campo neutro.
            error={fieldError ? true : undefined}
            id="en-email"
            inputmode="email"
            label="E-mail"
            onChange={(value) => {
              setEmail(value)
              setFieldError(false)
              setFalha(null)
            }}
            required
            type="email"
            value={email}
          />

          <EntryError id="en-err">{problem}</EntryError>

          <MaterialFilledButton disabled={loading || cooldown > 0 ? true : undefined} type="submit">
            {loading
              ? "Enviando..."
              : cooldown > 0
                ? `Aguarde ${formatCountdown(cooldown)}`
                : "Enviar link"}
          </MaterialFilledButton>
        </form>
      )}
    </EntryShell>
  )
}
