import { Chip } from "@heroui/react"
import { notFound } from "next/navigation"
import { getOwnReport, splitReason } from "../../../../lib/reports/reports"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { createAuthedClient } from "../authed-client"

// Acompanhamento (spec C10): a mesma informacao permitida na lista — situacao,
// motivo e a propria explicacao — em tela propria. Linha de outra pessoa e
// inexistente: a RLS nao devolve, e a tela responde 404 em vez de "sem acesso",
// para nao enumerar denuncias alheias por URL.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatFullDate(iso: string): string {
  const date = new Date(iso)
  return `${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

export default async function DenunciaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) {
    notFound()
  }

  const supabase = await createAuthedClient()
  const report = await getOwnReport(supabase, id)
  if (!report) {
    notFound()
  }

  const reason = splitReason(report.reason)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Acompanhar denúncia</h1>
        <Chip size="sm" variant="soft" color={report.status === "open" ? "warning" : "success"}>
          {report.status === "open" ? "Em análise" : "Resolvida"}
        </Chip>
      </div>

      <p className="mt-1 text-sm text-muted">{formatFullDate(report.createdAt)}</p>

      <div className="mt-6">
        {report.targetPreview ? (
          <FeedbackAlert
            variant="info"
            title={`${report.targetLabel}: ${report.targetPreview.slice(0, 120)}`}
            description="O conteúdo denunciado continua onde estava."
            actions={
              report.targetHref ? (
                <a
                  href={report.targetHref}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--semantic-action-primary)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:underline"
                >
                  Abrir conteúdo
                </a>
              ) : undefined
            }
          />
        ) : (
          <FeedbackAlert
            variant="warning"
            title="Conteúdo indisponível"
            description="O conteúdo desta denúncia não está mais acessível. O que ele dizia não fica guardado aqui."
          />
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-lg bg-[var(--semantic-selected)] p-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Motivo da denúncia
          </h2>
          <p className="mt-1 text-sm">{reason.label}</p>
        </div>
        {reason.explanation && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Sua explicação
            </h2>
            <p className="mt-1 text-sm leading-relaxed">{reason.explanation}</p>
          </div>
        )}
      </div>

      {report.resolvedAt && (
        <p className="mt-4 text-sm text-muted">Encerrada em {formatFullDate(report.resolvedAt)}.</p>
      )}

      <a
        href="/denuncias"
        className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-[var(--semantic-action-primary)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:underline"
      >
        Voltar para minhas denúncias
      </a>
    </div>
  )
}
