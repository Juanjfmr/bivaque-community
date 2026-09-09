import { Skeleton } from "../../components/bivaque/skeleton"

// Espelha a caixa da fila (título, abas, filtros, tabela) para que nada
// desloque quando o carregamento terminar (DESIGN_SYSTEM §2: skeleton com a
// caixa do componente real).
export default function ReportsLoading() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-72" />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-16 w-40 rounded-lg" />
        <Skeleton className="h-16 w-40 rounded-lg" />
        <Skeleton className="h-16 min-w-40 flex-1 rounded-lg" />
        <Skeleton className="h-11 w-24 rounded-lg" />
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>
      <div
        role="status"
        aria-label="Carregando fila de denúncias"
        className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4"
      >
        <div className="flex gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        {["linha-1", "linha-2", "linha-3", "linha-4"].map((rowKey) => (
          <div key={rowKey} className="flex items-center gap-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  )
}
