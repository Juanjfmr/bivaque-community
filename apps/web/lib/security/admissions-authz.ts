// Quem pode operar a fila de admissão.
//
// Por que esta decisão mora aqui, e não no gate da rota: uma Server Action é um
// endpoint POST próprio e **não passa pelo layout**. `reprocessUserAction` em
// `(admin)/admissions/actions.ts` confiava no comentário "o gate do
// (admin)/layout garante que o caller é operador" — falso — e então chamava
// `verification_reconcile_step` com `service_role`. Esse RPC não tem parâmetro
// de caller (`p_user_id` é o alvo, não quem pede) e é `security definer` com
// grant apenas para `service_role`, ou seja, não consegue reconferir nada.
// Resultado: qualquer conta autenticada disparava reconciliação de verificação
// de qualquer UUID.
//
// As irmãs `decideDocumentAction` e `rejectPendingUserAction` passam
// `p_operator_user_id` e o RPC revalida; esta função dá a elas a mesma recusa
// antecipada e fecha o buraco da terceira.

export interface AdmissionsCaller {
  /** Id do usuário resolvido do contexto do servidor — nunca de FormData. */
  callerId: string | null
  /** Resultado de `is_current_user_operator(p_user_id)` para esse mesmo id. */
  callerIsOperator: boolean
}

export function canOperateAdmissions({ callerId, callerIsOperator }: AdmissionsCaller): boolean {
  if (callerId === null || callerId.trim().length === 0) return false
  return callerIsOperator === true
}
