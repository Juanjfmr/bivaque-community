import {
  type BlockedPerson,
  listMyBlocks,
  listOwnReports,
  type OwnReport,
} from "../../../lib/reports/reports"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { createAuthedClient } from "./authed-client"
import { TrustPrivacyClient } from "./trust-privacy-client"

// Prancha 56-web-confianca, painel direito: H1 "Confianca e privacidade", abas
// "Minhas denuncias" (ativa) e "Pessoas bloqueadas", cartoes de denuncia com
// chip de situacao e expansao para motivo e explicacao proprios, e abaixo a
// gestao dos bloqueios. A RLS entrega apenas as linhas do proprio membro;
// resultado interno da moderacao (nota do operador, acao) nao e projetado
// aqui — o contrato o veta.

async function loadData(): Promise<
  { ok: true; reports: OwnReport[]; blocks: BlockedPerson[] } | { ok: false }
> {
  try {
    const supabase = await createAuthedClient()
    const [reports, blocks] = await Promise.all([listOwnReports(supabase), listMyBlocks(supabase)])
    return { ok: true, reports, blocks }
  } catch {
    return { ok: false }
  }
}

export default async function DenunciasPage() {
  const data = await loadData()

  if (!data.ok) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-lg font-semibold tracking-tight">Confiança e privacidade</h1>
        <div className="mt-6">
          <FeedbackAlert
            variant="danger"
            title="Algo deu errado"
            description="Não foi possível carregar suas denúncias agora."
            actions={
              <a
                href="/denuncias"
                className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--semantic-action-primary)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:underline"
              >
                Tentar novamente
              </a>
            }
          />
        </div>
      </div>
    )
  }

  return <TrustPrivacyClient reports={data.reports} blocks={data.blocks} />
}
