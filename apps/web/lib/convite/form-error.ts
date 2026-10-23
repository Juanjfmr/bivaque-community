// PORT-006 (lote 4 da entrada) — onde a mensagem de erro aparece na tela do
// convite.
//
// A tela tem duas etapas, e cada uma tem os campos que MOSTRAM o próprio erro
// (`error`/`error-text` do Material): `code` na primeira; `name`, `email` e
// `password` na segunda. A Server Action devolve o `field` junto da mensagem, e
// o campo visível já sabe exibir o próprio erro.
//
// O problema que esta função resolve: um erro preso a um campo que NÃO exibe
// erro na etapa atual não é renderizado por ninguém. Era o caso de
// `field: "code"` na etapa da conta — a conta falhava, a mensagem não aparecia
// e a pessoa tentava de novo às cegas. Sem campo, ou com campo fora da etapa, a
// mensagem vai para a área de erro da etapa (`EntryError`, com role="alert").
//
// `consent` NÃO está na lista embora seja um campo da etapa: o checkbox do
// Material não tem área de erro, então listá-lo escondia a recusa de
// consentimento (`field: "consent"`) exatamente como o caso do código. Quem não
// marcou o aceite volta para a área de erro da etapa.
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

// Os campos que cada etapa mostra E que exibem o próprio erro. Ficam aqui, e
// não dentro do componente, para o teste da decisão usar exatamente a mesma
// lista.
export const CODE_STEP_FIELDS = ["code"] as const
export const ACCOUNT_STEP_FIELDS = ["name", "email", "password"] as const
