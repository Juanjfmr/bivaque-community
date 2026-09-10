import { Skeleton } from "../../../components/bivaque/skeleton"

// RECON-013 — skeleton espelhando o artigo (trilha, categoria, título, data,
// corpo e contato) e as duas cartas da coluna lateral; sem reflow quando o
// conteúdo chega.
export default function GuideEntryLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-3/4 max-w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-11 w-40" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
