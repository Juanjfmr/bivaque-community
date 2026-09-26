import { createServerClient as createSsrServerClient } from "@supabase/ssr"
import { UserRound } from "lucide-react"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { readDocumentStatus } from "../../../../lib/onboarding/document-status"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { SUPPORT_EMAIL } from "../../../../lib/support"
import { AdmissionShell } from "../components/admission-shell"
import styles from "../onboarding.module.css"
import { StatusActions } from "./status-actions"

export const dynamic = "force-dynamic"

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

  if (membershipResult.data !== null) {
    redirect("/community")
  }

  const row = (outcomeResult.data as OutcomeRpcRow[] | null)?.[0] ?? null
  const status = row?.status ?? null

  if (status === "verified") {
    redirect("/onboarding/locality")
  }

  if (status === null || !VALID_STATES.includes(status as (typeof VALID_STATES)[number])) {
    redirect("/onboarding")
  }

  const document = await readDocumentStatus(serviceClient, user.id)

  if (document.situation === "needs_replacement") {
    redirect("/onboarding/documento")
  }

  const isIdentityReview = document.situation === "in_review"
  const isTemporaryError = status === "temporary_error"

  if (isIdentityReview) {
    return (
      <AdmissionShell
        stage="access"
        titleId="status-heading"
        title="Estamos analisando sua identidade"
        description="A conferência do documento pode levar um pouco mais. Volte aqui para acompanhar."
      >
        <div className={styles["stack"]}>
          <div className={styles["replacementCard"]}>
            <span className={styles["uploadIcon"]} aria-hidden="true">
              <UserRound />
            </span>
            <p className={styles["replacementTitle"]}>Identidade em análise</p>
          </div>
          <StatusActions refresh />
        </div>
      </AdmissionShell>
    )
  }

  const title =
    status === "pending"
      ? "Estamos analisando sua identidade"
      : isTemporaryError
        ? "Não conseguimos concluir agora."
        : "Não conseguimos confirmar sua elegibilidade."

  const description =
    status === "pending"
      ? "Você não precisa repetir seus dados. Assim que a análise terminar, sua entrada continua do ponto em que parou."
      : isTemporaryError
        ? "Não conseguimos confirmar agora. Seus dados estão salvos; tente de novo em instantes."
        : "Não encontramos seu vínculo pelo CPF."

  return (
    <AdmissionShell stage="access" titleId="status-heading" title={title} description={description}>
      <div className={styles["stack"]}>
        {status === "pending" ? (
          <p className={styles["statusLead"]}>
            Em caso de dúvida, escreva para <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        ) : (
          <p className={styles["statusLead"]}>
            Confira seus dados e tente de novo. Se estiver tudo certo, envie sua identidade e a
            equipe analisa.
          </p>
        )}

        {status !== "pending" && (
          <Link href="/onboarding" className={styles["textAction"]}>
            Tentar novamente
          </Link>
        )}

        {status !== "pending" && (
          <Link href="/onboarding/documento" className={styles["textAction"]}>
            Enviar identidade
          </Link>
        )}

        <StatusActions refresh={status === "pending"} />
      </div>
    </AdmissionShell>
  )
}
