import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SUPPORT_EMAIL, SUPPORT_SLA_HOURS } from "../../../../lib/support"

interface StatusPageProps {
  searchParams: Promise<{ state?: string }>
}

export default async function OnboardingStatusPage({ searchParams }: StatusPageProps) {
  const params = await searchParams
  const state = params.state

  if (state !== "pending" && state !== "rejected") {
    redirect("/onboarding")
  }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
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

  const isPending = state === "pending"

  return (
    <div className="grid flex-1 place-items-center px-6 py-12">
      <section className="flex w-full max-w-sm flex-col gap-6" aria-labelledby="status-heading">
        <h1 id="status-heading" className="text-2xl font-semibold tracking-tight">
          {isPending
            ? "Sua verificação está em andamento"
            : "Você não atende aos critérios de Manaus neste momento"}
        </h1>

        {isPending ? (
          <>
            <p className="text-sm text-muted">
              Sua verificação está em análise. Respondemos em até {SUPPORT_SLA_HOURS} horas úteis.{" "}
              Se passar disso, escreva para{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              O piloto de Manaus é exclusivo para militares federais ativos, veteranos e
              pensionistas militares com CPF validado contra a fonte oficial.
            </p>
            <p className="text-sm text-muted">
              Estamos expandindo para outras localidades. Você pode se candidatar à lista de espera
              — sem promessa de posição ou prazo.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
