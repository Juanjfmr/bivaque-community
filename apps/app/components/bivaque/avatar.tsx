import type { CSSProperties } from "react"

import { iniciais, tomDoNome } from "@/lib/texto"
import { cn } from "@/lib/utils"

const MEDIDAS = { pequeno: 28, medio: 36, grande: 44 } as const

/**
 * Avatar e pilha de avatares (inventário §7: `avatar` e `avatarStack`).
 *
 * O ternário `p.mine ? initals(state.profile.name) : p.ini` do protótipo é
 * regra, não formatação: aqui ele é a prop `propria`.
 */
export function MembroAvatar({
  nome,
  propria = false,
  tamanho = "medio",
  className,
}: {
  nome: string
  propria?: boolean
  tamanho?: "pequeno" | "medio" | "grande"
  className?: string
}) {
  // A mesma pessoa tem as mesmas iniciais e o mesmo tom em todo lugar
  // (REGUA-003): o fundo vem do tom do nome, como na peça `Avatar`, e não de
  // ser a própria pessoa — senão o cartão de Você e a barra a pintavam diferente.
  return (
    <span
      data-avatar="membro"
      data-propria={propria ? "sim" : undefined}
      data-tom={tomDoNome(nome)}
      className={cn("pc-avatar", className)}
      style={{ "--pc-avatar": `${MEDIDAS[tamanho]}px` } as CSSProperties}
    >
      {iniciais(nome)}
    </span>
  )
}

/** Até três avatares sobrepostos e o `+N` (protótipo: `avatarStack`). */
export function AvataresEmpilhados({ nomes, total }: { nomes: readonly string[]; total: number }) {
  // Sem chave por índice: nomes repetidos não podem gerar duas chaves iguais.
  const visiveis = nomes.filter((nome, indice) => nomes.indexOf(nome) === indice).slice(0, 3)
  const restantes = Math.max(0, total - visiveis.length)
  return (
    <span data-avatar="pilha" className="flex items-center">
      {visiveis.map((nome, indice) => (
        <MembroAvatar
          key={nome}
          nome={nome}
          tamanho="pequeno"
          className={cn("-ml-2 ring-2 ring-(--background)", indice === 0 && "ml-0")}
        />
      ))}
      {restantes === 0 ? null : (
        <span className="-ml-2 grid size-7 place-items-center rounded-full bg-(--muted) text-[10px] font-bold text-(--muted-foreground) ring-2 ring-(--background)">
          {`+${restantes}`}
        </span>
      )}
    </span>
  )
}
