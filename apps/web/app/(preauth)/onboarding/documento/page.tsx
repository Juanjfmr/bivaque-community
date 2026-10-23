import { createServerClient as createSsrServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { readDocumentStatus } from "../../../../lib/onboarding/document-status"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { EntryShell } from "../../../components/entry/entry-shell"
import { EntrySteps } from "../../../components/entry/entry-steps"
import { EntryHeading } from "../components/entry-heading"
import { EntrySignOut } from "../components/entry-signout"
import "../components/entry-elegibilidade.css"
import DocumentUpload from "../document-upload"

export const dynamic = "force-dynamic"

interface OutcomeRpcRow {
  status: string
}

// PORT-004 (lote 4, frente B): a tela do documento na pele do protótipo. O
// bloco tracejado com o ícone de envio é o mesmo de `renderEntryResult` e
// `renderEntryPending`; o envio continua sendo a Server Action que já existia
// (`document-actions.ts`), agora disparada de um bloco só, com o arquivo
// escolhido no próprio bloco.
//
// A guarda de servidor não muda: sem sessão vai para o login; quem já é membro
// vai para a comunidade; quem foi confirmado vai para a cidade; quem está em
// análise vai para o status; e quem não tem situação volta ao CPF. Quem teve o
// documento recusado vê o pedido de outro arquivo.
export default async function OnboardingDocumentPage() {
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
    redirect("/login?return=/onboarding/documento")
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
    throw new Error("Falha ao consultar o estado da entrada. Tente novamente.")
  }

  if (membershipResult.data !== null) {
    redirect("/community")
  }

  const status = (outcomeResult.data as OutcomeRpcRow[] | null)?.[0]?.status ?? null

  if (status === "verified") {
    redirect("/onboarding/locality")
  }
  if (status === null) {
    redirect("/onboarding")
  }

  const document = await readDocumentStatus(serviceClient, user.id)

  // Com um documento em análise (ou já aprovado) não há o que enviar: a pessoa
  // volta para a linha do tempo. Sem documento, a tela é o caminho do envio —
  // inclusive para quem está em análise pela fonte oficial, que no protótipo
  // recebe "Enviar um documento" na própria análise pendente
  // (`renderEntryPending`). Antes esta guarda mandava todo `pending` para o
  // status, e o bloco do protótipo não tinha para onde levar.
  if (document.situation === "in_review" || document.situation === "approved") {
    redirect("/onboarding/status")
  }

  const isReplace = document.situation === "needs_replacement"

  return (
    <EntryShell action={<EntrySignOut />} backHref="/onboarding">
      <div className="en-form">
        <EntrySteps label="Elegibilidade" step={2} />
        <EntryHeading>
          {isReplace ? "A equipe pediu outro documento." : "Envie um documento."}
        </EntryHeading>
        <p className="en-lead">
          {isReplace
            ? "Não foi possível ler o documento enviado. Envie outro que mostre o vínculo, como o contracheque ou a identidade militar."
            : "Envie um documento que mostre o vínculo, como o contracheque ou a identidade militar. A equipe responde em até 2 dias úteis."}
        </p>

        <DocumentUpload mode={isReplace ? "replace" : "upload"} />
      </div>
    </EntryShell>
  )
}
