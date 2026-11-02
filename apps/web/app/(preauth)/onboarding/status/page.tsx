import { createServerClient as createSsrServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { readDocumentStatus } from "../../../../lib/onboarding/document-status"
import {
  pendingHeadline,
  pendingLead,
  pendingTimeline,
} from "../../../../lib/onboarding/elegibility"
import { statusScreen } from "../../../../lib/onboarding/screens"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { EntryShell } from "../../../components/entry/entry-shell"
import { EntryHeading } from "../components/entry-heading"
import { EntrySignOut } from "../components/entry-signout"
import "../components/entry-elegibilidade.css"
import { MaterialIcon } from "../../../components/material/material-icon"
import { NotifyWhenReleased } from "./notify-when-released"
import { StatusActions } from "./status-actions"

export const dynamic = "force-dynamic"

interface OutcomeRpcRow {
  status: string
}

// PORT-004 (lote 4, frente B): a análise pendente como `renderEntryPending`.
//
// A tela é de quem está em análise — inclusive de quem teve o documento
// recusado pela equipe, que é o estado "A equipe pediu outro documento." do
// protótipo. Confirmado vai para a cidade, e o resto (não localizado, fonte
// fora do ar) é resultado na própria `/onboarding`. Por isso o documento é lido
// ANTES do desvio: `rejected` sozinho não distingue a recusa da fonte oficial
// da recusa manual, e desviar primeiro mandava quem teve o arquivo recusado
// para "Não localizamos o vínculo", sem o caminho de enviar outro.
//
// A linha do tempo tem os quatro passos do protótipo. O passo do documento
// depende da situação real no banco (`readDocumentStatus`): sem documento, o
// passo atual é a consulta feita pela fonte oficial; com documento em análise,
// ele vira "Documento enviado" com a data do envio.
//
// O bloco de arquivo segue o protótipo: "Enviar um documento" quando não há
// nada enviado, "Enviar outro documento" quando a equipe recusou o arquivo ou
// quando um ainda está na fila. A troca em análise usa o mesmo caminho de envio
// (`/onboarding/documento`), e o servidor substitui o anterior em vez de abrir
// uma segunda análise.
export default async function OnboardingStatusPage() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createSsrServerClient<Database>(url, anonKey, {
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
    redirect("/login?return=/onboarding")
  }

  const serviceClient = createServiceClient()
  const [outcomeResult, membershipResult, noticeResult, document] = await Promise.all([
    serviceClient.rpc("read_verification_status", { p_user_id: user.id }),
    serviceClient
      .from("locality_memberships")
      .select("locality_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    // A preferência é lida com a sessão da pessoa, não com o cliente de
    // serviço: a policy de RLS é o que garante que a linha é dela.
    authClient
      .from("onboarding_release_notices")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    readDocumentStatus(serviceClient, user.id),
  ])

  if (outcomeResult.error || membershipResult.error || noticeResult.error) {
    throw new Error("Falha ao consultar o estado da análise. Tente novamente.")
  }

  if (membershipResult.data !== null) {
    redirect("/community")
  }

  const status = (outcomeResult.data as OutcomeRpcRow[] | null)?.[0]?.status ?? null
  const screen = statusScreen({ status, document: document.situation })

  if (screen.screen === "locality") {
    redirect("/onboarding/locality")
  }
  if (screen.screen === "result") {
    redirect("/onboarding")
  }

  const { askedForReplacement } = screen
  const hasDocument = document.situation === "in_review" || document.situation === "approved"
  const canSendAnotherDocument =
    askedForReplacement || document.situation === "in_review" || document.situation === "none"
  const documentBlockTitle =
    hasDocument || askedForReplacement ? "Enviar outro documento" : "Enviar um documento"
  const steps = pendingTimeline({
    askedForReplacement,
    email: user.email ?? "",
    uploadedAt: hasDocument ? document.uploadedAt : null,
  })

  return (
    <EntryShell action={<EntrySignOut />}>
      <div className="en-form">
        <EntryHeading>{pendingHeadline({ askedForReplacement, hasDocument })}</EntryHeading>
        <p className="en-lead">{pendingLead(hasDocument)}</p>

        <ol className="en-time">
          {steps.map((step, index) => (
            <li className={step.state === "todo" ? undefined : step.state} key={step.title}>
              <i aria-hidden="true">{step.state === "done" ? "✓" : index + 1}</i>
              <span>
                <b>{step.title}</b>
                {step.detail}
              </span>
            </li>
          ))}
        </ol>

        {canSendAnotherDocument && (
          <Link className="en-file" href="/onboarding/documento">
            <MaterialIcon name="upload" />
            <span>
              <b>{documentBlockTitle}</b>
              PDF, JPG ou PNG, até 10 MB.
              {hasDocument ? " O novo substitui o que está na fila." : ""}
            </span>
          </Link>
        )}

        <NotifyWhenReleased initial={noticeResult.data !== null} />

        <p className="en-foot">Você pode sair e voltar: o status fica aqui.</p>

        <StatusActions />
      </div>
    </EntryShell>
  )
}
