import { Checkbox } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { saveAccountAction } from "../actions"

export default async function PrestadorContaPage() {
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
  if (!user) return null

  const { data: profileRow } = await authClient
    .from("provider_profiles")
    .select("id, contact_phone, contact_is_public")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  const profile = (profileRow ?? null) as {
    id: string
    contact_phone: string | null
    contact_is_public: boolean
  } | null

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Dados de acesso do negócio e as formas de contato que aparecem na ficha pública.
      </p>

      <section
        aria-label="Acesso"
        className="mt-6 rounded-xl border border-border bg-[var(--semantic-surface)] p-4"
      >
        <p className="text-sm font-medium">Acesso</p>
        <p className="mt-1 text-sm text-muted">{user.email ?? "E-mail não disponível"}</p>
        <p className="mt-1 text-xs text-muted">
          O e-mail de acesso é gerenciado pelo suporte. Alteração de senha fica em Configurações da
          conta do membro vinculado.
        </p>
      </section>

      {profile ? (
        <form action={saveAccountAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="contactPhone" className="text-sm font-medium">
              Telefone de contato <span className="font-normal text-muted">(opcional)</span>
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={profile.contact_phone ?? ""}
              placeholder="92 999999999"
              className="mt-1 min-h-11 w-full rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors"
            />
          </div>

          <Checkbox name="contactIsPublic" defaultSelected={profile.contact_is_public}>
            Mostrar meu telefone na ficha pública
          </Checkbox>

          <p className="text-xs text-muted">
            O telefone é opcional. Sem ele a ficha continua completa. Quando publicado, ele fica
            visível para todos os membros que alcançam a ficha.
          </p>

          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-5 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors"
          >
            Salvar conta
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted">
          Crie sua ficha antes de editar a conta.{" "}
          <Link href={"/prestador/ficha" as Route} className="underline">
            Ir para Minha ficha
          </Link>
        </p>
      )}
    </div>
  )
}
