"use client"

import { Button, Radio, RadioGroup, TextArea } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  EXPLANATION_MAX,
  REPORT_REASONS,
  type ReportMutationError,
} from "../../../../lib/reports/reports"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { showToast } from "../../../components/bivaque/toast"
import { type SubmitReportResult, submitReport } from "../actions"

const ERROR_MESSAGES: Record<ReportMutationError, string> = {
  "sessao-expirada": "Sua sessão expirou. Faça login novamente antes de enviar.",
  "motivo-invalido": "Escolha um motivo válido para a denúncia.",
  "explicacao-longa": `A explicação deve ter no máximo ${EXPLANATION_MAX} caracteres.`,
  "alvo-invalido": "Este conteúdo não está mais ao seu alcance, então não pode ser denunciado.",
  "ja-denunciado": "Você já denunciou este conteúdo. Sua denúncia anterior segue na fila.",
  "proprio-conteudo": "Você não pode denunciar o seu próprio conteúdo.",
  falha: "Não foi possível enviar a denúncia agora. Tente novamente.",
}

// Composicao da prancha 56, painel esquerdo: titulo; pergunta; radios da lista
// fechada; "Explique (opcional)" com contador; Cancelar e Enviar denuncia.
// O recibo so aparece depois que o servidor persistiu — o estado de sucesso e
// retornado pelo mesmo insert, nunca pelo clique.
export function NewReportForm({
  targetType,
  targetId,
  title,
  question,
}: {
  targetType: string
  targetId: string
  title: string
  question: string
}) {
  const router = useRouter()
  const [category, setCategory] = useState<string | null>(null)
  const [explanation, setExplanation] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<(SubmitReportResult & { ok: true }) | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!category) {
      setError("Escolha um motivo para a denúncia.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitReport({
        targetType,
        targetId,
        reason: category,
        explanation,
      })
      if (result.ok) {
        setReceipt(result)
        showToast({ title: "Denúncia enviada.", variant: "success" })
      } else {
        setError(ERROR_MESSAGES[result.error])
      }
    })
  }

  if (receipt) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <FeedbackAlert
          variant="success"
          title="Denúncia enviada."
          description="Ela entra na fila de moderação que a equipe lê. Se houver uma decisão, o retorno chega como notificação no app."
        />
        <a
          href={`/denuncias/${receipt.reportId}`}
          className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--semantic-action-primary)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:underline"
        >
          Acompanhar esta denúncia
        </a>
        <Button variant="tertiary" className="min-h-11" onPress={() => router.push("/denuncias")}>
          Ver minhas denúncias
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <p id="nova-denuncia-pergunta" className="text-sm">
        Por que você está denunciando {question}?
      </p>
      <RadioGroup
        aria-labelledby="nova-denuncia-pergunta"
        value={category ?? ""}
        onChange={(next) => {
          setCategory(next ?? null)
          setError(null)
        }}
        orientation="vertical"
        className="denuncia-motivos gap-1"
      >
        {/* O React Aria esconde o <input type="radio"> num span com estilo
            inline (1x1, clip). Este CSS devolve a ele a funcao de alvo de
            toque: cobre a linha inteira (44px) de forma transparente, com o
            circulo visivel desenhado pelo Radio.Control. Sem isso a auditoria
            reprova o alvo de 1x1 — e o alvo real passa a ser a linha inteira,
            nao o pontinho. */}
        <style>{`
          .denuncia-motivos label.radio__content {
            position: relative;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            min-height: 44px;
          }
          .denuncia-motivos label.radio__content > span:not([class]) {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            clip: auto !important;
            clip-path: none !important;
            white-space: normal !important;
            border: 0 !important;
          }
          .denuncia-motivos label.radio__content > span:not([class]) input[type="radio"] {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            opacity: 0 !important;
            cursor: pointer !important;
            transition: background-color 150ms ease !important;
          }
        `}</style>
        {REPORT_REASONS.map((item) => (
          // O <input> do React Aria e a camada acessivel: mantem-se invisivel,
          // mas estica por toda a linha (44px) para ser o alvo de toque real,
          // e recebe o nome acessivel da opcao. O circulo visivel continua
          // sendo o Radio.Control, igual a prancha 56.
          <Radio key={item.value} value={item.value} aria-label={item.label} className="min-h-11">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {item.label}
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="nova-denuncia-explicacao">
          Explique (opcional)
        </label>
        <TextArea
          id="nova-denuncia-explicacao"
          maxLength={EXPLANATION_MAX}
          value={explanation}
          onChange={(event) =>
            setExplanation((event.target as HTMLTextAreaElement).value.slice(0, EXPLANATION_MAX))
          }
          className="w-full"
        />
        <p className="mt-1 text-right text-xs text-muted">
          {explanation.length}/{EXPLANATION_MAX}
        </p>
        <p className="text-xs text-muted" role="note">
          Não digite CPF, telefone nem endereço. O motivo passa por redação automática antes de
          chegar ao operador.
        </p>
      </div>
      {error && <FeedbackAlert variant="danger" description={error} />}
      <div className="flex items-center gap-2">
        <Button
          variant="tertiary"
          className="min-h-11 flex-1"
          onPress={() => router.back()}
          isDisabled={pending}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          className="min-h-11 flex-1"
          onPress={handleSubmit}
          isDisabled={pending || !category}
        >
          {pending ? "Enviando…" : "Enviar denúncia"}
        </Button>
      </div>
    </div>
  )
}
