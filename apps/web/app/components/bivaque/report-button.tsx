"use client"

import { Button, Modal, Radio, RadioGroup, TextArea, useOverlayState } from "@heroui/react"
import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { currentUserIdOnce } from "./feed-post-shared"
import { FeedbackAlert } from "./feedback-alert"
import { submitReportAction } from "./report-actions"
import { EXPLANATION_MAX, REPORT_REASONS } from "./report-reasons"

// Os seis alvos de `public.report_target_type`. Os dois de indicacao entraram
// na H-Task 1 (20260821000031): a onda F transformou a resposta de indicacao no
// ciclo central do produto e ela nao era denunciavel.
export type ReportTargetType =
  | "post"
  | "comment"
  | "group"
  | "message"
  | "recommendation_request"
  | "recommendation_reply"

// Composicao da prancha 56: o modal pergunta POR QUE a denuncia existe, em
// categorias fechadas — a lista canônica vive em report-reasons.ts e é a mesma
// que a fila da operação filtra —, e a explicacao e opcional. O texto do alvo
// vem do tipo escolhido pelo pai — nada de chumbo.
const TARGET_PRESENTATION: Record<ReportTargetType, { title: string; question: string }> = {
  post: { title: "Denunciar publicação", question: "esta publicação" },
  comment: { title: "Denunciar comentário", question: "este comentário" },
  group: { title: "Denunciar comunidade", question: "esta comunidade" },
  message: { title: "Denunciar mensagem", question: "esta mensagem" },
  recommendation_request: { title: "Denunciar pedido", question: "este pedido" },
  recommendation_reply: { title: "Denunciar resposta", question: "esta resposta" },
}

interface ReportButtonProps {
  targetType: ReportTargetType
  targetId: string
  label?: string
  /**
   * Estado de overlay controlado pelo pai. Existe para o alvo `post`: o menu da
   * publicacao (LeanOverflowMenu) precisa abrir o modal a partir de um
   * `Dropdown.Item`, e nao de um botao proprio — o feed nao aguenta um
   * "Denunciar" visivel em cada card. Quando vem preenchido, o gatilho proprio
   * do componente nao e renderizado.
   */
  externalState?: ReturnType<typeof useOverlayState>
  /**
   * Autor do conteudo denunciado, quando o pai o conhece. Preenchido, o estado
   * de sucesso oferece "Bloquear esta pessoa", ligado ao mecanismo real
   * `public.dm_blocks` (20260802001500) — o mesmo que a conversa usa. Vazio, a
   * opcao nao aparece: nao se oferece bloqueio sem saber a quem bloquear.
   */
  blockUserId?: string
}

type BlockState = "idle" | "working" | "done"

export function ReportButton({
  targetType,
  targetId,
  label = "Denunciar",
  externalState,
  blockUserId,
}: ReportButtonProps) {
  const ownModal = useOverlayState()
  const modal = externalState ?? ownModal
  const [category, setCategory] = useState<string | null>(null)
  const [explanation, setExplanation] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [blockState, setBlockState] = useState<BlockState>("idle")
  const [blockError, setBlockError] = useState("")
  const [viewerId, setViewerId] = useState<string | null>(null)
  const supabase = createBrowserClient()
  const presentation = TARGET_PRESENTATION[targetType]

  // O bloqueio so pode ser oferecido entre duas pessoas distintas. Sem sessao
  // lida, nao se oferece o que nao se pode executar honestamente.
  // Uma requisicao de identidade para todos os cartoes do feed: este botao e
  // renderizado por publicacao E por comentario, entao chamar auth.getUser()
  // aqui multiplicava as requisicoes pelo tamanho do feed.
  useEffect(() => {
    let active = true
    currentUserIdOnce()
      .then((id) => {
        if (active) setViewerId(id)
      })
      .catch(() => {
        if (active) setViewerId(null)
      })
    return () => {
      active = false
    }
  }, [])

  const canOfferBlock = Boolean(blockUserId && viewerId && blockUserId !== viewerId)

  const handleSubmit = useCallback(async () => {
    const chosen = REPORT_REASONS.find((c) => c.value === category)
    if (!chosen) {
      setError("Escolha um motivo para a denúncia.")
      return
    }

    setSubmitting(true)
    setError("")

    const payload = new FormData()
    payload.set("categoria", chosen.value)
    payload.set("explicacao", explanation.trim())
    payload.set("targetType", targetType)
    payload.set("targetId", targetId)
    // A lista fechada e o tamanho da explicacao sao validados no servidor
    // (report-actions.ts), que entao grava como o proprio membro — a RLS
    // continua decidindo alvo, autoria e duplicidade. O trigger de redacao
    // (20260821000030) fecha o bypass direto pelo PostgREST.
    const result = await submitReportAction(payload)

    if (!result.ok) {
      // O indice parcial reports_one_open_per_reporter_target_idx so colide com
      // denuncia ABERTA do mesmo repórter no mesmo alvo — entao "segue na fila"
      // e fato, nao promessa.
      if (result.error === "duplicate") {
        setError("Você já denunciou este conteúdo. Sua denúncia anterior segue na fila.")
      } else if (result.error === "own-content") {
        setError("Você não pode denunciar o seu próprio conteúdo.")
      } else if (result.error === "unauthenticated") {
        setError("Sua sessão expirou. Entre de novo para denunciar.")
      } else {
        // Falha de envio nunca vira sucesso: o alerta e recuperavel e o
        // formulario continua preenchido para nova tentativa real.
        setError("Não foi possível enviar a denúncia agora. Tente novamente.")
      }
    } else {
      // O feedback fica dentro do modal aberto: fechar aqui escondia a
      // confirmacao junto com o dialogo e o membro nunca via o desfecho.
      setSuccess(true)
      setCategory(null)
      setExplanation("")
    }

    setSubmitting(false)
  }, [category, explanation, targetType, targetId])

  const handleBlock = useCallback(async () => {
    if (!blockUserId || !viewerId) return
    setBlockState("working")
    setBlockError("")

    const { error: blockInsertError } = await supabase.from("dm_blocks").insert({
      blocker_user_id: viewerId,
      blocked_user_id: blockUserId,
    })

    if (blockInsertError) {
      if (blockInsertError.code === "23505") {
        // PK (blocker, blocked) já existe: a pessoa está bloqueada. O desfecho
        // pedido ja e verdade — encerra como feito, nao como erro.
        setBlockState("done")
      } else {
        setBlockState("idle")
        setBlockError("Não foi possível bloquear agora. Tente novamente.")
      }
    } else {
      setBlockState("done")
    }
  }, [blockUserId, viewerId, supabase])

  const resetForm = useCallback(() => {
    setCategory(null)
    setExplanation("")
    setError("")
    setSuccess(false)
    setBlockState("idle")
    setBlockError("")
  }, [])

  const handleClose = useCallback(() => {
    modal.close()
    setError("")
  }, [modal])

  return (
    <>
      {externalState ? null : (
        <Button
          variant="tertiary"
          size="sm"
          onPress={() => {
            resetForm()
            modal.open()
          }}
          aria-label={`${label} ${presentation.question.replace(/^(esta|este) /, "")}`}
        >
          {label}
        </Button>
      )}

      <Modal state={modal} onOpenChange={(isOpen) => !isOpen && resetForm()}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{presentation.title}</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                {success ? (
                  <div className="flex flex-col gap-4">
                    {/* Nenhum contrato garante prazo de analise, resposta ou
                        punicao — o ADR de suspensao e o resolve_report so
                        garantem fila e notificacao quando houver decisao. O
                        texto diz exatamente o que acontece. */}
                    <FeedbackAlert
                      variant="success"
                      title="Denúncia enviada."
                      description="Ela entra na fila de moderação que a equipe lê. Se houver uma decisão, o retorno chega como notificação no app."
                    />
                    {canOfferBlock ? (
                      <div>
                        {blockState === "done" ? (
                          <FeedbackAlert
                            variant="success"
                            title="Pessoa bloqueada."
                            description="As mensagens diretas entre vocês ficam bloqueadas nos dois sentidos."
                          />
                        ) : (
                          <>
                            <p className="text-sm text-muted">
                              Prefere não receber mensagens desta pessoa?
                            </p>
                            <Button
                              variant="secondary"
                              className="mt-2"
                              onPress={handleBlock}
                              isDisabled={blockState === "working"}
                            >
                              {blockState === "working" ? "Bloqueando…" : "Bloquear esta pessoa"}
                            </Button>
                            {blockError ? (
                              <div className="mt-2">
                                <FeedbackAlert variant="danger" description={blockError} />
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <p id="report-question" className="text-sm">
                      Por que você está denunciando {presentation.question}?
                    </p>
                    <RadioGroup
                      aria-labelledby="report-question"
                      value={category ?? ""}
                      onChange={(next) => {
                        setCategory(next)
                        setError("")
                      }}
                      orientation="vertical"
                      className="mt-3 gap-1"
                    >
                      {REPORT_REASONS.map((item) => (
                        <Radio key={item.value} value={item.value}>
                          <Radio.Content>
                            <Radio.Control>
                              <Radio.Indicator />
                            </Radio.Control>
                            {item.label}
                          </Radio.Content>
                        </Radio>
                      ))}
                    </RadioGroup>
                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium" htmlFor="report-reason">
                        Explique (opcional)
                      </label>
                      <TextArea
                        id="report-reason"
                        maxLength={EXPLANATION_MAX}
                        aria-describedby="report-reason-help"
                        aria-invalid={Boolean(error)}
                        aria-errormessage={error ? "report-reason-error" : undefined}
                        value={explanation}
                        onChange={(e) => setExplanation((e.target as HTMLTextAreaElement).value)}
                        className="w-full"
                      />
                      <p className="mt-1 text-right text-xs text-muted">
                        {explanation.length}/{EXPLANATION_MAX}
                      </p>
                      <p id="report-reason-help" className="text-xs text-muted" role="note">
                        Não digite CPF, telefone nem endereço. O motivo passa por redação automática
                        antes de chegar ao operador e fica registrado por dois anos.
                      </p>
                    </div>
                    {error && (
                      <div id="report-reason-error" className="mt-2">
                        <FeedbackAlert variant="danger" description={error} />
                      </div>
                    )}
                  </>
                )}
              </Modal.Body>
              <Modal.Footer>
                {success ? (
                  <Button variant="primary" onPress={handleClose}>
                    Fechar
                  </Button>
                ) : (
                  <>
                    <Button variant="tertiary" onPress={handleClose}>
                      Cancelar
                    </Button>
                    <Button
                      onPress={handleSubmit}
                      isDisabled={submitting || !category}
                      variant="primary"
                    >
                      {submitting ? "Enviando…" : "Enviar denúncia"}
                    </Button>
                  </>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
