"use client"

import { Button, Radio, RadioGroup, TextArea } from "@heroui/react"
import { useActionState, useId, useState } from "react"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"

// Estado serializável devolvido pela Server Action de decisão. A recusa por
// falta de operador e o conflito de encerramento são estados VISÍVEIS — a
// action não pode falar em silêncio (contrato RECON-011).
export interface DecisionState {
  status: "idle" | "ok" | "forbidden" | "error"
  message: string
}

export type DecisionAction = (prev: DecisionState, formData: FormData) => Promise<DecisionState>

const IDLE_STATE: DecisionState = { status: "idle", message: "" }

// O veredito é sempre humano: nada aqui chega pré-selecionado. Sem
// defaultValue, sem heurística, sem "sugestão" — a marcação e a justificativa
// representam uma decisão que uma pessoa já tomou. O botão libera quando a
// decisão está marcada; a justificativa é exigida pelo navegador (required)
// e revalidada no servidor. O alvo da decisão vem do fechamento da página,
// nunca deste formulário.
export function DecisionForm({ action }: { action: DecisionAction }) {
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE)
  const [decision, setDecision] = useState<string | null>(null)
  const justificativaId = useId()
  const canConfirm = decision !== null

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <RadioGroup
        name="decision"
        aria-label="Decisão sobre o conteúdo"
        value={decision ?? ""}
        onChange={(value) => setDecision(value)}
        isDisabled={isPending}
        orientation="vertical"
      >
        <Radio value="manter">
          <div className="flex flex-col gap-0.5">
            <span>Manter conteúdo</span>
            <span className="text-xs text-muted">
              O conteúdo permanece visível para a comunidade.
            </span>
          </div>
        </Radio>
        <Radio value="ocultar">
          <div className="flex flex-col gap-0.5">
            <span>Ocultar conteúdo</span>
            <span className="text-xs text-muted">O conteúdo será ocultado da comunidade.</span>
          </div>
        </Radio>
      </RadioGroup>

      <div className="flex flex-col gap-1">
        <label htmlFor={justificativaId} className="text-sm font-medium">
          Justificativa da decisão <span aria-hidden="true">*</span>
          <span className="sr-only"> (obrigatória)</span>
        </label>
        <TextArea
          id={justificativaId}
          name="justificativa"
          required
          aria-required="true"
          aria-describedby={`${justificativaId}-help`}
          disabled={isPending}
          className="w-full"
        />
        <p id={`${justificativaId}-help`} role="note" className="text-xs text-muted">
          Descreva a decisão tomada e o fundamento dela. O texto fica registrado na denúncia.
        </p>
      </div>

      {state.status === "ok" && (
        <FeedbackAlert variant="success" title="Decisão registrada" description={state.message} />
      )}
      {state.status === "forbidden" && (
        <FeedbackAlert
          variant="danger"
          title="Ação recusada"
          description="Sua conta não tem permissão de operação sobre esta denúncia. Nada foi alterado."
        />
      )}
      {state.status === "error" && (
        <FeedbackAlert
          variant="warning"
          title="Não foi possível registrar"
          description={state.message}
        />
      )}

      <div>
        <Button
          type="submit"
          variant="primary"
          className="min-h-11"
          isDisabled={!canConfirm || isPending}
        >
          {isPending ? "Registrando decisão…" : "Confirmar decisão"}
        </Button>
      </div>
    </form>
  )
}
