import { Skeleton } from "@/components/ui/skeleton"

// A espera da lista: a mesma moldura da linha, sem conteúdo. Dá a altura certa
// para a tela não pular quando os dados chegam.
const CHAVES = ["um", "dois", "tres", "quatro", "cinco", "seis"]

export function EsqueletoDeLista({ linhas = 4 }: { linhas?: number }) {
  return (
    <ul aria-hidden="true" className="grid gap-2">
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
