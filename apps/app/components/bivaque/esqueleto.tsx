import { Skeleton } from "@/components/ui/skeleton"

/**
 * Esqueletos (inventário §7: a linha `esqueleto` registra que **não** existe
 * componente geral no protótipo — o que existe são dois efeitos locais: o
 * `.paged-skel` do pager e o shimmer `.img-wait` da foto). Aqui os dois viram
 * componentes, que é o que a reescrita pede.
 */

const CHAVES = ["um", "dois", "tres", "quatro", "cinco", "seis"] as const

/** O pé de lista em carregamento (`shell/paged-list.js:35`). */
export function EsqueletoDeLista({ linhas = 4 }: { linhas?: number }) {
  return (
    <ul aria-hidden="true" data-esqueleto="lista" className="grid gap-2">
      {CHAVES.slice(0, Math.min(linhas, CHAVES.length)).map((chave) => (
        <li key={chave} className="flex items-center gap-3 rounded-2xl px-3.5 py-3.5">
          <Skeleton className="size-8 rounded-full" />
          <span className="grid grow gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-5 w-24 rounded-lg" />
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * A foto que ainda não chegou (`shell/image-loading.js:5`, `.img-wait`): a
 * moldura fica no lugar com o brilho de espera, e a foto entra quando carrega.
 */
export function EsqueletoDeImagem({ rotulo = "Foto" }: { rotulo?: string }) {
  return (
    <div
      data-esqueleto="imagem"
      role="img"
      aria-label={rotulo}
      className="bv-espera aspect-video w-full rounded-xl bg-(--surface-container)"
    />
  )
}
