// PORT-006 (lote 4 da entrada) — onde a mensagem de erro aparece na tela do
// convite.
//
// A tela tem duas etapas, e cada uma conhece os campos que mostra: `code` na
// primeira; `name`, `email`, `password` e `consent` na segunda. A Server Action
// devolve o `field` junto da mensagem, e o campo visível já sabe exibir o
// próprio erro (`error`/`error-text` do Material).
//
// O problema que esta função resolve: um erro preso a um campo que NÃO existe
// na etapa atual não é renderizado por ninguém. Era o caso de `field: "code"`
// na etapa da conta — a conta falhava, a mensagem não aparecia e a pessoa
// tentava de novo às cegas. Sem campo, ou com campo fora da etapa, a mensagem
// vai para a área de erro da etapa (`EntryError`, com role="alert").
//
// Função pura de propósito: é a decisão que quebra em silêncio, e ela é
// verificável sem montar o componente.
export function stageError(
  error: string | null,
  errorField: string | null,
  stageFields: readonly string[],
): string | null {
  if (error === null) return null
  if (errorField === null) return error
  return stageFields.includes(errorField) ? null : error
}

// Os campos que cada etapa realmente mostra. Ficam aqui, e não dentro do
// componente, para o teste da decisão usar exatamente a mesma lista.
export const CODE_STEP_FIELDS = ["code"] as const
export const ACCOUNT_STEP_FIELDS = ["name", "email", "password", "consent"] as const
