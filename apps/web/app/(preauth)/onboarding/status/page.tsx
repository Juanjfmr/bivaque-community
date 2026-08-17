import { createServerClient as createSsrServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { SUPPORT_EMAIL, SUPPORT_SLA_HOURS } from "../../../../lib/support"
import DocumentUpload from "../document-upload"

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

  return (
    <div className="grid flex-1 place-items-center px-6 py-12">
      <section className="flex w-full max-w-sm flex-col gap-6" aria-labelledby="status-heading">
        <h1 id="status-heading" className="text-2xl font-semibold tracking-tight">
          {isPending
            ? "Sua verificação está em andamento"
            : isTemporaryError
              ? "Sua verificação encontrou uma instabilidade"
              : "Você não atende aos critérios do piloto neste momento"}
        </h1>

        {isPending ? (
          <p className="text-sm text-muted">
            Sua verificação está em análise. Respondemos em até {SUPPORT_SLA_HOURS} horas úteis. Se
            passar disso, escreva para{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        ) : isTemporaryError ? (
          <>
            <p className="text-sm text-muted">
              Houve uma falha temporária na consulta. Seus dados não foram perdidos — tente
              novamente em alguns minutos.
            </p>
            <p className="text-sm text-muted">
              Se o problema persistir, escreva para{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
            <Link
              href="/onboarding"
              className="rounded-md border border-border bg-accent px-4 py-2 text-center text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Tentar novamente
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              O piloto hoje acontece só em Manaus e é exclusivo para militares federais ativos,
              veteranos e pensionistas militares com CPF validado contra a fonte oficial. A
              verificação confere elegibilidade, não endereço.
            </p>
            <p className="text-sm text-muted">
              Você pode ser avisado quando outras localidades abrirem — sem promessa de posição ou
              prazo.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/onboarding"
                className="rounded-md border border-border bg-accent px-4 py-2 text-center text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              >
                Tentar novamente
              </Link>
              <Link
                href="/onboarding?flow=waitlist"
                className="rounded-md border border-border px-4 py-2 text-center text-sm font-medium transition-colors hover:bg-accent/10"
              >
                Entrar na lista de espera de outras localidades
              </Link>
            </div>
          </>
        )}

        {!isPending && <DocumentUpload />}
      </section>
    </div>
  )
}
