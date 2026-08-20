import { createServerClient } from "@supabase/ssr"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { createServerClient as createServiceClient } from "../../lib/supabase/server"

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
        <ul className="flex flex-wrap gap-4 text-sm">
          <li>
            <Link
              href="/admissions"
              className="inline-flex min-h-11 items-center rounded-md px-3 text-muted hover:text-foreground"
            >
              Admissões
            </Link>
          </li>
          <li>
            <Link
              href="/reports"
              className="inline-flex min-h-11 items-center rounded-md px-3 text-muted hover:text-foreground"
            >
              Denúncias
            </Link>
          </li>
          <li>
            <Link
              href="/guide-queue"
              className="inline-flex min-h-11 items-center rounded-md px-3 text-muted hover:text-foreground"
            >
              Guia de chegada
            </Link>
          </li>
          <li>
            <Link
              href={"/arrivals" as Route}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-muted hover:text-foreground"
            >
              Chegadas
            </Link>
          </li>
        </ul>
      </nav>
      {children}
    </div>
  )
}
