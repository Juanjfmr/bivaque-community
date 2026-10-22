import type { Metadata } from "next"
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

export default async function ConvitePage({ searchParams }: ConvitePageProperties) {
  const params = await searchParams
  const raw = params["codigo"]
  const initialCode = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "")

  return (
    <EntryShell backHref="/login">
      <main>
        <InviteForm initialCode={initialCode} />
      </main>
    </EntryShell>
  )
}
