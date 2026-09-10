import { Skeleton } from "../../../components/bivaque/skeleton"

// Espelha a caixa da análise (voltar, título, meta, cards e linha do tempo)
// para que nada desloque quando o carregamento terminar (DESIGN_SYSTEM §2).
export default function ReportDetailLoading() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <Skeleton className="h-5 w-44" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div
        role="status"
        aria-label="Carregando análise da denúncia"
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-5 w-44" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-11 w-44 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </section>
  )
}
