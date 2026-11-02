// PORT-002 (lote 4 da entrada): o indicador de passo do protótipo
// (`entrySteps` em account.js): "Passo N de 3 · rótulo" e as três barras, com
// as já cumpridas preenchidas. As barras são decorativas para o leitor de tela;
// a informação está no texto e no `aria-label` do grupo.
const TOTAL = 3

type EntryStepsProperties = Readonly<{
  label: string
  step: 1 | 2 | 3
}>

export function EntrySteps({ label, step }: EntryStepsProperties) {
  return (
    <>
      <p className="en-step">{`Passo ${step} de ${TOTAL} · ${label}`}</p>
      <div className="en-steps" role="img" aria-label={`Passo ${step} de ${TOTAL}`}>
        <i className={step >= 1 ? "on" : undefined} />
        <i className={step >= 2 ? "on" : undefined} />
        <i className={step >= 3 ? "on" : undefined} />
      </div>
    </>
  )
}
