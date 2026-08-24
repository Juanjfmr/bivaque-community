import { createServerClient as createSsrServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { SUPPORT_EMAIL, SUPPORT_SLA_HOURS } from "../../../../lib/support"
import { OnboardingShell } from "../components/onboarding-shell"
import DocumentUpload from "../document-upload"
import styles from "../onboarding.module.css"

const VALID_STATES = ["pending", "rejected", "temporary_error"] as const

interface OutcomeRpcRow {
  status: string
}

export default async function OnboardingStatusPage() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createSsrServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    redirect("/login?return=/onboarding")
  }

  const serviceClient = createServiceClient()
  const [outcomeResult, membershipResult] = await Promise.all([
    serviceClient.rpc("read_verification_status", { p_user_id: user.id }),
    serviceClient
      .from("locality_memberships")
      .select("locality_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
  ])

  if (outcomeResult.error || membershipResult.error) {
    throw new Error("Falha ao consultar o estado da verificação. Tente novamente.")
  }

  const row = (outcomeResult.data as OutcomeRpcRow[] | null)?.[0] ?? null
  const status = row?.status ?? null

  // P0 Task 4: with the two-phase admission, "verified without membership"
  // is a real state — the person passed eligibility but has not chosen a
  // locality yet. That goes to the post-eligibility step, not the feed.
  if (membershipResult.data !== null) {
    redirect("/community")
  }

  if (status === "verified") {
    redirect("/onboarding/locality")
  }

  if (status === null || !VALID_STATES.includes(status as (typeof VALID_STATES)[number])) {
    redirect("/onboarding")
  }

  const isPending = status === "pending"
  const isTemporaryError = status === "temporary_error"
  const title = isPending
    ? "Sua elegibilidade está em análise."
    : isTemporaryError
      ? "Não conseguimos concluir agora."
      : "Não conseguimos confirmar sua elegibilidade."

  return (
    <OnboardingShell
      stage="eligibility"
      titleId="status-heading"
      eyebrow={
        isPending
          ? "Consulta recebida"
          : isTemporaryError
            ? "Tente novamente"
            : "Resultado da consulta"
      }
      title={title}
      description={
        isPending
          ? "Você não precisa repetir seus dados. Assim que a análise terminar, sua entrada continua do ponto em que parou."
          : isTemporaryError
            ? "A fonte oficial não respondeu como esperado. Sua tentativa não foi perdida."
            : "A consulta automática não encontrou confirmação para um dos papéis aceitos pelo Bivaque."
      }
      asideEyebrow="Cada estado pede uma resposta"
      asideTitle={isPending ? "Agora é com a análise." : "Há um caminho para continuar."}
      asideDescription={
        isPending
          ? "Quando houver uma decisão, você retorna ao passo certo sem refazer a jornada."
          : "Tente outra vez quando a consulta estiver disponível ou envie um documento para análise."
      }
    >
      <div className={styles["stack"]}>
        {isPending ? (
          <p className={styles["statusLead"]}>
            Sua verificação está em análise. Respondemos em até {SUPPORT_SLA_HOURS} horas úteis. Se
            passar disso, escreva para <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        ) : isTemporaryError ? (
          <>
            <p className={styles["statusLead"]}>Tente novamente em alguns minutos.</p>
            <p className={styles["statusLead"]}>
              Se o problema persistir, escreva para{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
            <Link href="/onboarding" className={styles["textAction"]}>
              Tentar novamente
            </Link>
          </>
        ) : (
          <>
            <p className={styles["statusLead"]}>
              Você pode refazer a consulta se houver algum dado a conferir. Se acredita que a fonte
              oficial não refletiu sua situação, envie um documento para análise.
            </p>
            <div>
              <Link href="/onboarding" className={styles["textAction"]}>
                Tentar novamente
              </Link>
            </div>
          </>
        )}

        {!isPending && <DocumentUpload />}
      </div>
    </OnboardingShell>
  )
}
