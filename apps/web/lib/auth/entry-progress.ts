/**
 * Quando a entrada já começou, e onde ela continua.
 *
 * `renderEntryResume` no protótipo aparece para quem tem conta e ainda não
 * terminou a entrada (`entryInProgress` = `account && !done`). No Next a conta
 * é a sessão do Supabase e "terminou" é ter membership — a mesma pergunta que
 * `apps/web/proxy.ts` faz com `my_account_kind()` para decidir se a pessoa
 * entra no app ou volta ao funil.
 *
 * Traduzir os dois lados para um fato só ("esta conta já é membro?") evita a
 * armadilha de decidir isso na tela com um estado de cliente que o servidor não
 * confirmou: quem tem sessão e ainda não é membro está no meio da entrada, e é
 * exatamente quem precisa poder retomá-la.
 *
 * `provider` fica de fora: quem entrou como prestador civil tem funil próprio
 * (D36) e a tela de retomada da entrada de membro não é o lugar dele.
 *
 * Função pura, sem import de runtime, para rodar no vitest.
 */

export type EntryAccountKind = "member" | "provider" | null

export type EntrySessionFacts = Readonly<{
  accountKind: EntryAccountKind
  hasSession: boolean
}>

/** Para onde "Continuar de onde parei" leva. O proxy resolve o passo real. */
export const ENTRY_RESUME_PATH = "/onboarding"

/**
 * "Você já começou" só aparece para quem tem sessão e ainda não é membro nem
 * prestador. Sem sessão a tela é a entrada normal; com membership a entrada
 * acabou, e a tela não faz sentido.
 */
export function shouldShowEntryResume(facts: EntrySessionFacts): boolean {
  return facts.hasSession && facts.accountKind === null
}
