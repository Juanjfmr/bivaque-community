import { createServerClient } from "@supabase/ssr"
import { ArrowLeft } from "lucide-react"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { RequestForm } from "./request-form"

// RECON-022 — `/pedidos/novo?prestador=[id]` (R42, prancha 62).
//
// O destinatário é derivado da URL e confirmado contra a RLS: se o membro não
// pode ver a ficha, a tela devolve o mesmo notFound() da ficha — sem revelar
// existência privada. O nome aqui é só rótulo de leitura; a autoridade de
// escrita continua sendo o RPC, que reconfere o destinatário no banco.

export default async function NovoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ prestador?: string }>
}) {
  const { prestador } = await searchParams
  if (!prestador || prestador.trim() === "") {
    notFound()
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
      setAll() {
        // Server component, sem escrita de cookie.
      },
    },
  })

  const { data, error } = await authClient
    .from("provider_profiles")
    .select("id, display_name")
    .eq("id", prestador)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao carregar o destinatário: ${error.message}`)
  }

  const provider = data as { id: string; display_name: string } | null
  if (!provider) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-8">
      <Link
        href={`/prestadores/${provider.id}` as Route}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:text-foreground"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Voltar ao perfil
      </Link>

      <header className="mt-4 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Do que você precisa?</h1>
        <p className="text-sm text-muted">
          Conte para <strong className="font-semibold">{provider.display_name}</strong> o que você
          precisa. Ele receberá seu pedido e poderá responder.
        </p>
      </header>

      <RequestForm providerId={provider.id} providerName={provider.display_name} />
    </div>
  )
}
