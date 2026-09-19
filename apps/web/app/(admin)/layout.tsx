import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { createServerClient as createServiceClient } from "../../lib/supabase/server"
import { OperatorNav } from "./operator-nav"

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
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
        // Layout is read-only; cookie writes happen in Server Actions / route
        // handlers that mutate session, never here.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    redirect("/login?return=/reports")
  }

  const serviceClient = createServiceClient()
  const { data: isOperator } = await serviceClient.rpc("is_current_user_operator", {
    p_user_id: user.id,
  })

  if (!isOperator) {
    redirect("/inicio")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <nav aria-label="Painel do operador" className="border-b border-border bg-surface px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-sm font-semibold tracking-tight">BIVAQUE · Operação</span>
          {/* Os quatro itens viraram componente cliente: só ele sabe qual é a
              rota atual e pode marcar aria-current (RECON-049, fila do lote M). */}
          <OperatorNav />
          <Link
            href="/inicio"
            className="ml-auto inline-flex min-h-11 items-center rounded-md px-3 text-sm text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:text-foreground"
          >
            Sair da operação
          </Link>
        </div>
      </nav>
      {children}
    </div>
  )
}
