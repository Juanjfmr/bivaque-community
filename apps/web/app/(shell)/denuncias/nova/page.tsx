import {
  isReportTargetType,
  TARGET_PRESENTATION,
  validateReportTarget,
} from "../../../../lib/reports/reports"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { createAuthedClient } from "../authed-client"
import { NewReportForm } from "./new-report-form"

// Prancha 56-web-confianca, painel esquerdo: o dialogo "Denunciar publicacao"
// — pergunta, lista fechada de motivos, Explique (opcional) com contador e os
// dois botoes. As origens ja abrem este dialogo por cima da tela (RECON-016);
// esta rota e a versao enderecavel (spec C10): /denuncias/nova?tipo=...&id=...
// abre o mesmo dialogo para o mesmo alvo, e o servidor confere tipo, formato
// e acesso antes de desenhar qualquer campo.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function NovaDenunciaPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; id?: string }>
}) {
  const { tipo, id } = await searchParams
  const targetType = tipo ?? ""
  const targetId = id ?? ""

  const presentation = isReportTargetType(targetType) ? TARGET_PRESENTATION[targetType] : null

  if (!presentation || !UUID_PATTERN.test(targetId)) {
    return <InvalidTarget />
  }

  const supabase = await createAuthedClient()
  const targetVisible = await validateReportTarget(supabase, targetType, targetId)
  if (!targetVisible) {
    return <InvalidTarget />
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <NewReportForm
        targetType={targetType}
        targetId={targetId}
        title={presentation.title}
        question={presentation.question}
      />
    </div>
  )
}

function InvalidTarget() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="text-lg font-semibold tracking-tight">Denunciar</h1>
      <div className="mt-4">
        <FeedbackAlert
          variant="warning"
          title="Conteúdo não encontrado"
          description="Este endereço de denúncia não corresponde a um conteúdo que você pode ver. Ele pode ter sido removido, ou o tipo e o identificador não são válidos."
        />
      </div>
      <a
        href="/denuncias"
        className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-[var(--semantic-action-primary)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:underline"
      >
        Ver minhas denúncias
      </a>
    </div>
  )
}
