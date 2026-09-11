"use client"

import { CONSENT_VERSION } from "@bivaque/domain"
import { Button } from "@heroui/react"
import { Mail } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import {
  classifyResend,
  computeResendCooldown,
  formatCountdown,
  readPendingConfirmation,
  writePendingConfirmation,
} from "../../components/auth/resend-clock"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import styles from "./confirmar-email.module.css"

/**
 * Confirmação de e-mail — prancha 37-web-auth-confirmacao, com os dois
 * conflitos resolvidos pela autoridade posterior (R04 da especificação de
 * 08/09 e ADR-20260907-login-com-senha):
 *
 *   - As seis caixas de dígito NÃO são implementadas: o mecanismo real é link
 *     de confirmação tratado em /auth/callback, e a tela "não recebe código
 *     fictício". No lugar das caixas entra a orientação de abrir o link.
 *   - O botão do painel expirado é "Enviar novo link", não "Enviar novo
 *     código": prometer código seria anunciar integração que o provedor não
 *     faz nesta tela.
 *
 * O que a prancha manda preservar está aqui: envelope em círculo verde-claro,
 * título "Confira seu e-mail", as duas linhas com o endereço em negrito,
 * "Alterar e-mail", o contador regressivo de reenvio e o alerta âmbar de
 * expiração. O contador ecoa o limite do servidor (429 do GoTrue tem
 * precedência; sem número do servidor vale a janela padrão do provedor) — ver
 * components/auth/resend-clock.ts.
 */

type Phase = "resolving" | "pending" | "expired" | "none"

interface Notice {
  variant: "success" | "warning" | "danger"
  message: string
}

function resolvePhase(expired: boolean, email: string | null): Phase {
  if (expired) return email ? "expired" : "none"
  return email ? "pending" : "none"
}

export function ConfirmarEmailClient() {
  const searchParams = useSearchParams()
  const expiredRequested = searchParams.get("estado") === "expirado"

  const [phase, setPhase] = useState<Phase>("resolving")
  const [email, setEmail] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const lastResendAtRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true
    const stored = readPendingConfirmation()
    const apply = (resolvedEmail: string | null, lastResendAt: number | null) => {
      if (!active) return
      setEmail(resolvedEmail)
      lastResendAtRef.current = lastResendAt
      setCooldown(computeResendCooldown({ lastResendAt, now: Date.now() }))
      setPhase(resolvePhase(expiredRequested, resolvedEmail))
    }

    if (stored?.email) {
      apply(stored.email, stored.lastResendAt)
      return () => {
        active = false
      }
    }

    // Sem flag de cadastro pendente nesta janela: ainda pode haver sessão com
    // e-mail não confirmado (confirmação exigida pelo provedor). A sessão é a
    // fonte do endereço — nunca a query string. A consulta é limitada no
    // tempo: uma sessão que não resolve não pode deixar a tela presa no
    // "conferindo" (o estado de carregamento tem fim, como o contrato exige).
    const lookup = createBrowserClient()
      .auth.getSession()
      .then(({ data }) => data.session?.user ?? null)
      .catch(() => null)
    const bounded = Promise.race([
      lookup,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ])
    bounded.then((user) => {
      if (!active) return
      // `=== null` e não falsy: um objeto de usuário parcial (cookie/fixture
      // sem a chave) não pode ser lido como "e-mail não confirmado".
      if (user?.email && user.email_confirmed_at === null) {
        apply(user.email, null)
      } else {
        apply(null, null)
      }
    })

    return () => {
      active = false
    }
  }, [expiredRequested])

  const counting = cooldown > 0
  useEffect(() => {
    if (!counting) return
    timerRef.current = setInterval(() => {
      setCooldown((seconds) => {
        if (seconds <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [counting])

  const handleResend = useCallback(async () => {
    if (sending || cooldown > 0 || !email) return
    setSending(true)
    setNotice(null)
    try {
      const { error } = await createBrowserClient().auth.resend({
        type: "signup",
        email,
        options: {
          // O link volta pelo callback, que troca o code por sessão e registra
          // o aceite pendente do cadastro (marcador `consent` na URL do próprio
          // link — gerado pelo servidor, não por cookie forjável).
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/confirmar-email&consent=${encodeURIComponent(String(CONSENT_VERSION))}`,
        },
      })
      const view = classifyResend(error)
      if (view.outcome === "sent") {
        // Só conta reenvio aceito: antes da confirmação do servidor o
        // contador não anda nem a tela anuncia envio.
        lastResendAtRef.current = Date.now()
        writePendingConfirmation({ email, lastResendAt: lastResendAtRef.current })
        setCooldown(
          computeResendCooldown({ lastResendAt: lastResendAtRef.current, now: Date.now() }),
        )
        setNotice({ variant: "success", message: view.message })
      } else if (view.outcome === "rate-limited") {
        // O número veio do servidor (mensagem 429 ou Retry-After): ele manda.
        setCooldown(
          computeResendCooldown({
            lastResendAt: null,
            serverSeconds: view.retryAfterSeconds ?? null,
            now: Date.now(),
          }),
        )
        setNotice({ variant: "warning", message: view.message })
      } else if (view.outcome === "offline") {
        setNotice({ variant: "warning", message: view.message })
      } else {
        setNotice({ variant: "danger", message: view.message })
      }
    } finally {
      setSending(false)
    }
  }, [cooldown, email, sending])

  if (phase === "resolving") {
    return (
      <main className={styles["root"]}>
        <div className={styles["rail"]} aria-hidden="true">
          <span className={styles["wordmark"]}>BIVAQUE</span>
        </div>
        <section className={styles["stage"]} aria-busy="true">
          <div className={styles["card"]}>
            <h1 className={styles["title"]}>Confira seu e-mail</h1>
            <p className={styles["support"]}>Conferindo se há uma confirmação pendente...</p>
          </div>
        </section>
      </main>
    )
  }

  if (phase === "none") {
    // Nada pendente nesta janela (membro já confirmado, ou cadastro feito em
    // outra janela). Não inventar painel de sucesso nem eco de endereço.
    return (
      <main className={styles["root"]}>
        <div className={styles["rail"]} aria-hidden="true">
          <span className={styles["wordmark"]}>BIVAQUE</span>
          <p className={styles["railTagline"]}>
            Conecte-se com
            <br />
            sua comunidade.
          </p>
        </div>
        <section className={styles["stage"]}>
          <section className={styles["card"]} aria-labelledby="confirmar-none-title">
            <h1 id="confirmar-none-title" className={styles["title"]}>
              Nada para confirmar
            </h1>
            <p className={styles["support"]}>
              Não há confirmação de e-mail pendente nesta janela do navegador — ela já foi
              concluída, ou o cadastro foi feito em outra janela.
            </p>
            <Link href="/login" className={styles["actionLink"]}>
              Entrar
            </Link>
            <div className={styles["divider"]} aria-hidden="true" />
            <Link href="/signup" className={styles["ghostLink"]}>
              Criar conta
            </Link>
          </section>
        </section>
      </main>
    )
  }

  const isExpired = phase === "expired"
  const resendLabel = isExpired ? "Enviar novo link" : "Reenviar link de confirmação"

  return (
    <main className={styles["root"]}>
      <div className={styles["rail"]} aria-hidden="true">
        <span className={styles["wordmark"]}>BIVAQUE</span>
        <p className={styles["railTagline"]}>
          Conecte-se com
          <br />
          sua comunidade.
        </p>
      </div>

      <section className={styles["stage"]}>
        <section className={styles["card"]} aria-labelledby="confirmar-title">
          <span className={styles["iconCircle"]} aria-hidden="true">
            <Mail />
          </span>

          <h1 id="confirmar-title" className={styles["title"]}>
            Confira seu e-mail
          </h1>

          <p className={styles["support"]}>
            Abrimos um link de confirmação para
            <br />
            {/* O endereço vem da sessão ou do registro local do cadastro —
                nunca da URL. */}
            <strong className={styles["emailEcho"]}>{email}</strong>
          </p>

          {isExpired ? (
            <>
              {/* Painel expirado da prancha: alerta âmbar no lugar da orientação
                  e envio NOVO — sem reenviar material vencido. */}
              <FeedbackAlert
                variant="warning"
                className={styles["expiredAlert"] ?? ""}
                description="Este link expirou ou já foi usado. Peça um novo para continuar."
              />
              <Button
                variant="primary"
                className={styles["primaryButton"] ?? ""}
                onPress={handleResend}
                isDisabled={sending || cooldown > 0}
              >
                {sending
                  ? "Enviando..."
                  : cooldown > 0
                    ? `Aguarde ${formatCountdown(cooldown)}`
                    : resendLabel}
              </Button>
              <div className={styles["divider"]} aria-hidden="true" />
              <Link href="/recuperar-senha" className={styles["ghostLink"]}>
                Preciso de ajuda
              </Link>
            </>
          ) : (
            <>
              <p className={styles["hint"]}>
                Abra o link na sua caixa de entrada — ele vale uma vez só. Depois de confirmar, a
                entrada é com a sua senha.
              </p>

              <Link href="/signup" className={styles["actionLink"]}>
                Alterar e-mail
              </Link>

              {/* O rodapé da prancha ("Reenviar em 00:28") mora aqui: um único
                  controle, com o número ecoando o limite do servidor. */}
              <Button
                variant="primary"
                className={styles["primaryButton"] ?? ""}
                onPress={handleResend}
                isDisabled={sending || cooldown > 0}
              >
                {sending
                  ? "Enviando..."
                  : cooldown > 0
                    ? `Reenviar em ${formatCountdown(cooldown)}`
                    : resendLabel}
              </Button>
            </>
          )}

          {notice ? <FeedbackAlert variant={notice.variant} description={notice.message} /> : null}
        </section>
      </section>
    </main>
  )
}
