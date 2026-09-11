import { createServerClient as createSsrServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { readDocumentStatus } from "../../../../lib/onboarding/document-status"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { AdmissionShell } from "../components/admission-shell"
import DocumentUpload from "../document-upload"
import styles from "../onboarding.module.css"

export const dynamic = "force-dynamic"

interface OutcomeRpcRow {
  status: string
}

export default async function OnboardingDocumentPage() {
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
    redirect("/login?return=/onboarding/documento")
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
    throw new Error("Falha ao consultar o estado da entrada. Tente novamente.")
  }

  if (membershipResult.data !== null) {
    redirect("/community")
  }

  const status = (outcomeResult.data as OutcomeRpcRow[] | null)?.[0]?.status ?? null

  if (status === "verified") {
    redirect("/onboarding/locality")
  }
  if (status === "pending") {
    redirect("/onboarding/status")
  }
  if (status === null) {
    redirect("/onboarding")
  }

  const document = await readDocumentStatus(serviceClient, user.id)

  if (document.situation === "in_review" || document.situation === "approved") {
    redirect("/onboarding/status")
  }

  const isReplace = document.situation === "needs_replacement"

  return (
    <AdmissionShell
      stage="access"
      titleId="document-heading"
      title={isReplace ? "Precisamos de outro arquivo" : "Enviar identidade"}
      {...(isReplace
        ? {}
        : {
            description: "Não conseguimos confirmar pelo CPF. Envie sua identidade para continuar.",
          })}
    >
      <div className={styles["stack"]}>
        {!isReplace && (
          <p className={styles["statusLead"]}>
            A conferência do documento pode levar um pouco mais. Você acompanha por aqui.
          </p>
        )}

        <DocumentUpload mode={isReplace ? "replace" : "upload"} />

        <Link href="/onboarding" className={styles["backLink"]}>
          {isReplace ? "Voltar" : "Voltar à verificação"}
        </Link>

        {isReplace && (
          <p className={styles["documentFooterNote"]}>
            Após o reenvio, acompanhe a análise por aqui.
          </p>
        )}
      </div>
    </AdmissionShell>
  )
}
