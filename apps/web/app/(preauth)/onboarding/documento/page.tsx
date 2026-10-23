import { createServerClient as createSsrServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { readDocumentStatus } from "../../../../lib/onboarding/document-status"
import { documentFormMode } from "../../../../lib/onboarding/screens"
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
// vai para a comunidade; quem foi confirmado vai para a cidade; e quem não tem
// situação volta ao CPF. As três situações de arquivo levam a textos
// diferentes, e a forma vem de `documentFormMode`:
// - sem documento: "Envie um documento." (recusa da fonte oficial, fonte fora
//   do ar ou primeiro envio);
// - documento recusado pela equipe: "A equipe pediu outro documento.";
// - documento em análise: "Recebemos seu documento.", com a troca — o novo
//   arquivo substitui o anterior na fila, sem abrir uma segunda análise.
// Um documento aprovado não se envia de novo: volta para a linha do tempo.
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

  if (document.situation === "approved") {
    redirect("/onboarding/status")
  }

  const mode = documentFormMode(document.situation)
  const isReplace = mode === "replace"
  const isInReview = mode === "in-review"

  const heading = isReplace
    ? "A equipe pediu outro documento."
    : isInReview
      ? "Recebemos seu documento."
      : "Envie um documento."
  const lead = isReplace
    ? "Não foi possível ler o documento enviado. Envie outro que mostre o vínculo, como o contracheque ou a identidade militar."
    : isInReview
      ? "Se precisar corrigir, envie outro arquivo: o novo substitui o que está na fila de análise. A equipe responde em até 2 dias úteis."
      : "Envie um documento que mostre o vínculo, como o contracheque ou a identidade militar. A equipe responde em até 2 dias úteis."

  return (
    <EntryShell
      action={<EntrySignOut />}
      backHref={isReplace || isInReview ? "/onboarding/status" : "/onboarding"}
    >
      <div className="en-form">
        <EntrySteps label="Elegibilidade" step={2} />
        <EntryHeading>{heading}</EntryHeading>
        <p className="en-lead">{lead}</p>

        <DocumentUpload mode={mode} />
      </div>
    </EntryShell>
  )
}
