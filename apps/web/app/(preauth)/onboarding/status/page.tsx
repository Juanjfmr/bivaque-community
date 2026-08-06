import { redirect } from "next/navigation"
import { createServerClient } from "../../../../lib/supabase/server"

interface StatusPageProps {
  searchParams: Promise<{ state?: string }>
}

export default async function OnboardingStatusPage({ searchParams }: StatusPageProps) {
  const params = await searchParams
  const state = params.state

  if (state !== "pending" && state !== "rejected") {
    redirect("/onboarding")
  }

  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
              Isso pode levar até 24 horas em dias úteis. Você receberá um aviso quando a
              verificação for concluída.
            </p>
            <p className="text-sm text-muted">
              Em caso de dúvida, escreva para{" "}
              <a href="mailto:suporte@bivaque.local" className="underline">
                suporte@bivaque.local
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
