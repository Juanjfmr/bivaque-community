import type { LucideIcon } from "lucide-react"

// Ícone é enfeite: entra sempre com `aria-hidden`, para o nome do glifo nunca
// virar parte do nome acessível do botão que o contém.
export function Icone({
  glifo: Glifo,
  className = "size-5",
}: {
  glifo: LucideIcon
  className?: string
}) {
  return <Glifo aria-hidden="true" focusable="false" className={className} />
}
