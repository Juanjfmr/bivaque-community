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
    redirect("/community")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <nav aria-label="Painel do operador" className="border-b border-border bg-surface px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-sm font-semibold tracking-tight">BIVAQUE · Operação</span>
          {/* Os quatro itens viraram componente cliente: só ele sabe qual é a
              rota atual e pode marcar aria-current (RECON-049, fila do lote M). */}
          <OperatorNav />
          {/* Decisão do dono (2026-09-10, commit cefa14d6): "Sair da operação"
              saiu do shell de operação — é ação que sai da operação e não
              pertence à navegação do operador, e o produto não oferece logout
              aqui (a saída de sessão vive no perfil). A única saída é "Voltar ao
              Bivaque", que devolve ao produto preservando a sessão. O ícone fica
              em aria-hidden para o nome acessível ser exatamente o rótulo. */}
          <Link
            href="/inicio"
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:text-foreground"
          >
            <span aria-hidden="true">←</span>
            <span>Voltar ao Bivaque</span>
          </Link>
        </div>
      </nav>
      {children}
    </div>
  )
}
