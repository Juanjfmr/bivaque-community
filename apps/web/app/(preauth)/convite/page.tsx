import { createServerClient } from "@supabase/ssr"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import { EntryShell } from "../../components/entry/entry-shell"
import { InviteForm } from "./invite-form"
import "./convite.css"

// PORT-006 (lote 4 da entrada): /convite é pública (apps/web/proxy.ts) porque
// quem chega por ela ainda não tem conta. O link que o titular copia já traz o
// código em `?codigo=`, e o mesmo código pode ser digitado à mão quando o link
// se perde — as duas portas levam à mesma tela.
export const metadata: Metadata = {
  title: "Convite · Bivaque",
}

type ConvitePageProperties = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

// O aceite do código é atômico: quando ele confirma, a pessoa já tem sessão e
// localidade corrente. Se a resposta se perde e a tela recarrega, ela não pode
// voltar à etapa do código — o preview recusaria o convite já aceito. Quem já
// tem localidade corrente segue para a Início.
async function sessionUserIsMember(): Promise<boolean> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) return false

  const cookieStore = await cookies()
  const auth = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      // Leitura pura: a página não escreve sessão.
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return false

  const { data, error } = await createServiceClient()
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", user.id)
    .eq("kind", "current")
    .limit(1)
  return !error && (data?.length ?? 0) > 0
}

export default async function ConvitePage({ searchParams }: ConvitePageProperties) {
  if (await sessionUserIsMember()) redirect("/inicio")

  const params = await searchParams
  const raw = params["codigo"]
  const initialCode = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "")
  // Os links antigos (`/onboarding?invite=<token>`, de convites criados antes do
  // código) chegam aqui com `?legado=1`, sem o token: o convite novo vem com
  // código, e quem tem só o link antigo precisa pedir o reenvio (PORT-004).
  const isLegacyLink = params["legado"] === "1"

  return (
    <EntryShell backHref="/login">
      <main>
        {isLegacyLink ? (
          <p className="en-hint" role="status">
            Este link de convite mudou. Peça a quem convidou para reenviar o convite: ele agora
            chega com um código.
          </p>
        ) : null}
        <InviteForm initialCode={initialCode} />
      </main>
    </EntryShell>
  )
}
