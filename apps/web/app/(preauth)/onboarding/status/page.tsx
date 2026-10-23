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
// A tela é só de quem está em análise: confirmado vai para a cidade, e o resto
// (não localizado, fonte fora do ar) é resultado na própria `/onboarding` —
// antes esta rota desenhava versões antigas desses dois estados, o que fazia a
// mesma situação aparecer com dois desenhos diferentes.
//
// A linha do tempo tem os quatro passos do protótipo. O passo do documento
// depende da situação real no banco (`readDocumentStatus`): sem documento, o
// passo atual é a consulta feita pela fonte oficial; com documento em análise,
// ele vira "Documento enviado" com a data do envio.
//
// O bloco de reenvio só aparece quando há o que enviar: o servidor recusa um
// segundo documento enquanto um está em análise (`submit_verification_document`
// devolve 23505), então oferecer "Enviar outro documento" aqui seria um caminho
// que sempre falha. Depois de uma recusa, a pessoa cai na tela do documento,
// que é onde o reenvio acontece.
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
  const [outcomeResult, membershipResult, noticeResult] = await Promise.all([
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
  ])

  if (outcomeResult.error || membershipResult.error || noticeResult.error) {
    throw new Error("Falha ao consultar o estado da análise. Tente novamente.")
  }

  if (membershipResult.data !== null) {
    redirect("/community")
  }

  const status = (outcomeResult.data as OutcomeRpcRow[] | null)?.[0]?.status ?? null

  if (status === "verified") {
    redirect("/onboarding/locality")
  }
  if (status !== "pending") {
    redirect("/onboarding")
  }

  const document = await readDocumentStatus(serviceClient, user.id)

  if (document.situation === "needs_replacement") {
    redirect("/onboarding/documento")
  }

  const hasDocument = document.situation === "in_review" || document.situation === "approved"
  const steps = pendingTimeline({
    askedForReplacement: false,
    email: user.email ?? "",
    uploadedAt: hasDocument ? document.uploadedAt : null,
  })

  return (
    <EntryShell action={<EntrySignOut />}>
      <div className="en-form">
        <EntryHeading>{pendingHeadline({ askedForReplacement: false, hasDocument })}</EntryHeading>
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

        {!hasDocument && (
          <Link className="en-file" href="/onboarding/documento">
            <MaterialIcon name="upload" />
            <span>
              <b>Enviar um documento</b>
              PDF, JPG ou PNG, até 10 MB.
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
