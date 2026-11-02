import { ligadura, type NomeDeIcone } from "@/lib/icones"
import { cn } from "@/lib/utils"

/**
 * Ícone (inventário §7, `utilities/format.js`: `icon`).
 *
 * Os Material Symbols do protótipo, hospedados localmente (ADR §2). Ícone é
 * enfeite: entra sempre com `aria-hidden`, para a ligadura nunca virar parte do
 * nome acessível do botão que o contém — foi exatamente esse defeito que
 * quebrou a acessibilidade na convergência do EXP-001 (LICOES.md).
 *
 * `preenchido` liga o eixo FILL da fonte. O protótipo passava a **string**
 * `'false'` como preenchimento (`shell/primitives.js:24`), que é *truthy* em
 * JavaScript: o inventário §7 registra isso como comportamento a decidir na
 * migração. Aqui é um booleano de verdade.
 */
export function Icone({
  nome,
  preenchido = false,
  className,
}: {
  nome: NomeDeIcone
  preenchido?: boolean
  className?: string
}) {
  return (
    <span
      data-icone={nome}
      aria-hidden="true"
      className={cn("bv-icone", preenchido && "bv-icone-preenchido", className)}
    >
      {ligadura(nome)}
    </span>
  )
}
