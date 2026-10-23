/**
 * Enter nos campos da entrada envia o formulário.
 *
 * Os campos das telas de entrada são `md-outlined-text-field`, e o `<input>`
 * deles vive no shadow root: o elemento não é form-associated para fins de
 * submissão implícita, então o navegador não manda o formulário quando a pessoa
 * aperta Enter no campo. O `keydown` sai retargetado para o campo do Material —
 * daí o teste pelo ancestral, e não pelo `<input>`, que aqui nunca é alcançável.
 *
 * A revisão independente de 22/10/2026 reproduziu o defeito: em
 * `/recuperar-senha` e `/nova-senha` o Enter gerava zero envios, enquanto o
 * clique gerava um. A regra era a do login, e ficou num lugar só para as três
 * telas não divergirem no próximo ajuste.
 *
 * Enter fora de um campo (no botão, por exemplo) segue o caminho nativo: o
 * formulário não é submetido duas vezes.
 */

import type { KeyboardEvent } from "react"

const ENTRY_FIELD_TAG = "md-outlined-text-field"

type Closest = (selector: string) => unknown

export function submitEntryFormOnEnter(event: KeyboardEvent<HTMLFormElement>): void {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return

  const target = event.target as { closest?: Closest } | null
  if (!target?.closest?.(ENTRY_FIELD_TAG)) return

  event.preventDefault()
  event.currentTarget.requestSubmit()
}
